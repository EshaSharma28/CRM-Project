"""Data ingestion — CSV upload for customers and orders.

Demonstrates the brief's "Ingest data" requirement with a real path (not just
the seed): upload a CSV, we parse it, store rows, and recompute the derived
behavioural fields + RFM so imported data behaves exactly like seeded data.

Customers CSV columns:  name,email,phone,city,channel_pref,signup_date
Orders CSV columns:     email,product,amount,ordered_at,is_subscription,used_discount
(email links an order to its customer.)
"""
import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.ai.client import get_ai
from app.ai.prompts import SMART_INGEST
from app.database import get_db
from app.models import Customer, Order
from app.services.derive import now, recompute_customer
from app.services.rfm import recompute_rfm

router = APIRouter(prefix="/ingest", tags=["ingest"])

CUSTOMER_SAMPLE = (
    "name,email,phone,city,channel_pref,signup_date\n"
    "Priya Menon,priya@example.com,+919800000001,Mumbai,whatsapp,2025-02-10\n"
    "Arjun Rao,arjun@example.com,+919800000002,Bengaluru,email,2025-04-01\n"
)
ORDER_SAMPLE = (
    "email,product,amount,ordered_at,is_subscription,used_discount\n"
    "priya@example.com,Ethiopia Single-Origin 250g,650,2026-05-20,false,false\n"
    "priya@example.com,Monthly Bean Subscription,900,2026-06-01,true,false\n"
    "arjun@example.com,Cold Brew Kit,1200,2026-03-15,false,true\n"
)


def _rows(file: UploadFile) -> list[dict]:
    raw = file.file.read().decode("utf-8-sig")
    return list(csv.DictReader(io.StringIO(raw)))


def _to_bool(v) -> bool:
    return str(v).strip().lower() in {"1", "true", "yes", "y"}


def _to_date(v):
    if not v or not str(v).strip():
        return None
    try:
        return datetime.fromisoformat(str(v).strip())
    except ValueError:
        return None


@router.get("/sample/customers", response_class=PlainTextResponse)
def sample_customers():
    return CUSTOMER_SAMPLE


@router.get("/sample/orders", response_class=PlainTextResponse)
def sample_orders():
    return ORDER_SAMPLE


@router.post("/customers")
def ingest_customers(file: UploadFile, db: Session = Depends(get_db)):
    """Create/update customers from a CSV (keyed by email)."""
    rows = _rows(file)
    created = updated = 0
    errors: list[str] = []
    ref = now()

    for i, row in enumerate(rows, start=2):  # row 1 is the header
        email = (row.get("email") or "").strip().lower()
        if not email:
            errors.append(f"row {i}: missing email")
            continue
        customer = db.query(Customer).filter(Customer.email == email).first()
        if customer is None:
            customer = Customer(
                email=email,
                persona="imported",
                lifecycle_stage="new",
                signup_date=_to_date(row.get("signup_date")) or ref,
            )
            db.add(customer)
            created += 1
        else:
            updated += 1
        customer.name = (row.get("name") or customer.name or "Unknown").strip()
        customer.phone = (row.get("phone") or getattr(customer, "phone", "") or "").strip()
        customer.city = (row.get("city") or getattr(customer, "city", "") or "Unknown").strip()
        customer.channel_pref = (row.get("channel_pref") or "email").strip().lower()
        if row.get("signup_date"):
            customer.signup_date = _to_date(row.get("signup_date")) or customer.signup_date

    db.commit()
    for c in db.query(Customer).all():
        recompute_customer(c, ref)
    db.commit()
    recompute_rfm(db)
    return {"created": created, "updated": updated, "errors": errors[:20]}


@router.post("/orders")
def ingest_orders(file: UploadFile, db: Session = Depends(get_db)):
    """Create orders from a CSV, linking each to a customer by email."""
    rows = _rows(file)
    created = 0
    errors: list[str] = []
    touched: set[int] = set()
    ref = now()

    for i, row in enumerate(rows, start=2):
        email = (row.get("email") or "").strip().lower()
        customer = db.query(Customer).filter(Customer.email == email).first() if email else None
        if customer is None:
            errors.append(f"row {i}: no customer for email '{email}'")
            continue
        try:
            amount = float(row.get("amount") or 0)
        except ValueError:
            errors.append(f"row {i}: bad amount '{row.get('amount')}'")
            continue
        db.add(
            Order(
                customer_id=customer.id,
                product=(row.get("product") or "Unknown").strip(),
                amount=round(amount, 2),
                is_subscription=_to_bool(row.get("is_subscription")),
                used_discount=_to_bool(row.get("used_discount")),
                ordered_at=_to_date(row.get("ordered_at")) or ref,
            )
        )
        touched.add(customer.id)
        created += 1

    db.commit()
    for cid in touched:
        recompute_customer(db.get(Customer, cid), ref)
    db.commit()
    recompute_rfm(db)
    return {"created": created, "customers_updated": len(touched), "errors": errors[:20]}


@router.post("/smart")
def ingest_smart(file: UploadFile, db: Session = Depends(get_db)):
    """Smart ingestion using AI to map columns to customers and orders."""
    rows = _rows(file)
    if not rows:
        return {"created_customers": 0, "created_orders": 0, "errors": ["File is empty"]}
    
    headers = list(rows[0].keys())
    sample_rows = rows[:3]
    
    prompt = SMART_INGEST.format(
        headers=", ".join([h for h in headers if h]),
        sample_rows=str(sample_rows)
    )
    
    try:
        mapping = get_ai().generate_json(prompt)
    except Exception as e:
        return {"error": f"AI mapping failed: {str(e)}"}
        
    customer_map = mapping.get("customer_map", {})
    order_map = mapping.get("order_map", {})
    
    # We need the email column to link customers and orders
    email_col = customer_map.get("email")
    if not email_col:
        return {"error": "AI could not determine the email column, which is required."}

    created_customers = updated_customers = 0
    created_orders = 0
    errors: list[str] = []
    touched: set[int] = set()
    ref = now()

    for i, row in enumerate(rows, start=2):
        email = (row.get(email_col) or "").strip().lower()
        if not email:
            errors.append(f"row {i}: missing email")
            continue
            
        # 1. Process Customer
        customer = db.query(Customer).filter(Customer.email == email).first()
        if customer is None:
            signup_col = customer_map.get("signup_date")
            signup_val = _to_date(row.get(signup_col)) if signup_col else None
            
            customer = Customer(
                email=email,
                persona="imported",
                lifecycle_stage="new",
                signup_date=signup_val or ref,
            )
            db.add(customer)
            db.flush() # flush to get an ID
            created_customers += 1
        else:
            updated_customers += 1

        name_col = customer_map.get("name")
        if name_col and row.get(name_col):
            customer.name = str(row.get(name_col)).strip()
            
        phone_col = customer_map.get("phone")
        if phone_col and row.get(phone_col):
            customer.phone = str(row.get(phone_col)).strip()
            
        city_col = customer_map.get("city")
        if city_col and row.get(city_col):
            customer.city = str(row.get(city_col)).strip()
            
        channel_col = customer_map.get("channel_pref")
        if channel_col and row.get(channel_col):
            customer.channel_pref = str(row.get(channel_col)).strip().lower()

        touched.add(customer.id)

        # 2. Process Order (if order columns exist and have data)
        amount_col = order_map.get("amount")
        product_col = order_map.get("product")
        
        # We assume it's an order row if there's an amount or product specified
        if (amount_col and row.get(amount_col)) or (product_col and row.get(product_col)):
            try:
                amount = float(row.get(amount_col) or 0) if amount_col else 0.0
            except ValueError:
                amount = 0.0
                
            ordered_at_col = order_map.get("ordered_at")
            ordered_at_val = _to_date(row.get(ordered_at_col)) if ordered_at_col else None
            
            is_sub_col = order_map.get("is_subscription")
            is_sub_val = _to_bool(row.get(is_sub_col)) if is_sub_col else False
            
            discount_col = order_map.get("used_discount")
            discount_val = _to_bool(row.get(discount_col)) if discount_col else False

            db.add(
                Order(
                    customer_id=customer.id,
                    product=str(row.get(product_col) or "Unknown").strip() if product_col else "Unknown",
                    amount=round(amount, 2),
                    is_subscription=is_sub_val,
                    used_discount=discount_val,
                    ordered_at=ordered_at_val or ref,
                )
            )
            created_orders += 1

    db.commit()
    for cid in touched:
        recompute_customer(db.get(Customer, cid), ref)
    db.commit()
    recompute_rfm(db)
    
    return {
        "created_customers": created_customers,
        "updated_customers": updated_customers,
        "created_orders": created_orders,
        "errors": errors[:20]
    }
