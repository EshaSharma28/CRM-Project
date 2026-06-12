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
