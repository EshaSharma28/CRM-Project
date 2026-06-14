from datetime import datetime, timezone
import json
import hmac
import hashlib

from app.models import Customer, Campaign, Communication, CommunicationEvent, Order

def post_signed_receipt(client, payload):
    payload_bytes = json.dumps(payload).encode("utf-8")
    sig = hmac.new(b"brewhaus_supersecret", payload_bytes, hashlib.sha256).hexdigest()
    return client.post(
        "/receipts",
        content=payload_bytes,
        headers={"Content-Type": "application/json", "X-Hub-Signature": f"sha256={sig}"}
    )

def test_ingest_receipt_idempotency(client, db_session):
    # Setup
    customer = Customer(name="Test", email="test@test.com", phone="123", city="Mumbai", channel_pref="email", signup_date=datetime.now(), persona="test", lifecycle_stage="active")
    campaign = Campaign(name="Test Camp", channel="email", message_template="Hello")
    db_session.add_all([customer, campaign])
    db_session.commit()
    
    comm = Communication(campaign_id=campaign.id, customer_id=customer.id, channel="email", rendered_message="Hello", status="queued")
    db_session.add(comm)
    db_session.commit()

    # Ingest a 'sent' receipt
    payload = {
        "event_id": "evt_123",
        "communication_id": comm.id,
        "event_type": "sent",
        "occurred_at": datetime.now(timezone.utc).isoformat()
    }
    resp1 = post_signed_receipt(client, payload)
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "ok"

    # Verify idempotency by sending the exact same payload again
    resp2 = post_signed_receipt(client, payload)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "duplicate"
    
    # Verify only one event was recorded
    events = db_session.query(CommunicationEvent).filter_by(communication_id=comm.id).all()
    assert len(events) == 1

def test_ingest_receipt_order_tolerance(client, db_session):
    # Setup
    customer = Customer(name="Test", email="test@test.com", phone="123", city="Mumbai", channel_pref="email", signup_date=datetime.now(), persona="test", lifecycle_stage="active")
    campaign = Campaign(name="Test Camp", channel="email", message_template="Hello")
    db_session.add_all([customer, campaign])
    db_session.commit()
    
    comm = Communication(campaign_id=campaign.id, customer_id=customer.id, channel="email", rendered_message="Hello", status="queued")
    db_session.add(comm)
    db_session.commit()

    # Arrives out of order: 'clicked' arrives before 'delivered'
    payload1 = {
        "event_id": "evt_clicked",
        "communication_id": comm.id,
        "event_type": "clicked",
        "occurred_at": datetime.now(timezone.utc).isoformat()
    }
    post_signed_receipt(client, payload1)
    
    db_session.refresh(comm)
    assert comm.status == "clicked"
    assert comm.clicked_at is not None

    # Now a late 'delivered' arrives
    payload2 = {
        "event_id": "evt_delivered",
        "communication_id": comm.id,
        "event_type": "delivered",
        "occurred_at": datetime.now(timezone.utc).isoformat()
    }
    post_signed_receipt(client, payload2)
    
    db_session.refresh(comm)
    # Status should still be 'clicked' because it is higher rank, but delivered_at should be populated
    assert comm.status == "clicked"
    assert comm.delivered_at is not None
    assert comm.clicked_at is not None

def test_ingest_receipt_attribution(client, db_session):
    # Setup
    customer = Customer(name="Test", email="test@test.com", phone="123", city="Mumbai", channel_pref="email", signup_date=datetime.now(), persona="test", lifecycle_stage="active")
    campaign = Campaign(name="Test Camp", channel="email", message_template="Hello")
    db_session.add_all([customer, campaign])
    db_session.commit()
    
    comm = Communication(campaign_id=campaign.id, customer_id=customer.id, channel="email", rendered_message="Hello", status="queued")
    db_session.add(comm)
    db_session.commit()

    # We will fake a 100% base conversion and propensity to ensure attribution hits
    import app.routers.receipts as receipts_module
    original_base = receipts_module.BASE_CONVERSION
    receipts_module.BASE_CONVERSION = {"clicked": 1.0}
    original_propensity = receipts_module.RFM_PROPENSITY
    receipts_module.RFM_PROPENSITY = {customer.rfm_segment: 2.0}

    try:
        payload = {
            "event_id": "evt_conv",
            "communication_id": comm.id,
            "event_type": "clicked",
            "occurred_at": datetime.now(timezone.utc).isoformat()
        }
        post_signed_receipt(client, payload)
        
        db_session.refresh(comm)
        # Should have attributed an order
        assert comm.attributed_order_id is not None
        
        order = db_session.get(Order, comm.attributed_order_id)
        assert order is not None
        assert order.customer_id == customer.id
    finally:
        # Restore constants
        receipts_module.BASE_CONVERSION = original_base
        receipts_module.RFM_PROPENSITY = original_propensity
