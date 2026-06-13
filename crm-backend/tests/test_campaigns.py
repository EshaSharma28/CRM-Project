from datetime import datetime
from app.models import Customer, Campaign, Communication, Order

def test_campaign_stats_basic(client, db_session):
    # Setup
    customer = Customer(name="Test", email="test@test.com", phone="123", city="Mumbai", channel_pref="email", signup_date=datetime.now(), persona="test", lifecycle_stage="active")
    campaign = Campaign(name="Test Camp", channel="email", message_template="Hello", status="sent")
    db_session.add_all([customer, campaign])
    db_session.commit()
    
    comm = Communication(campaign_id=campaign.id, customer_id=customer.id, channel="email", rendered_message="Hello", status="clicked", sent_at=datetime.now(), delivered_at=datetime.now(), opened_at=datetime.now(), clicked_at=datetime.now())
    db_session.add(comm)
    db_session.commit()

    resp = client.get(f"/campaigns/{campaign.id}/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["audience"] == 1
    assert data["sent"] == 1
    assert data["clicked"] == 1
    assert "variants" not in data # No A/B test

def test_campaign_stats_ab_test(client, db_session):
    # Setup
    c1 = Customer(name="Test A", email="a@test.com", phone="123", city="Mumbai", channel_pref="email", signup_date=datetime.now(), persona="test", lifecycle_stage="active")
    c2 = Customer(name="Test B", email="b@test.com", phone="456", city="Mumbai", channel_pref="email", signup_date=datetime.now(), persona="test", lifecycle_stage="active")
    campaign = Campaign(name="Test Camp AB", channel="email", message_template="Hello A", message_template_b="Hello B", channel_b="whatsapp", status="sent")
    db_session.add_all([c1, c2, campaign])
    db_session.commit()
    
    comm_a = Communication(campaign_id=campaign.id, customer_id=c1.id, channel="email", rendered_message="Hello A", variant="A", status="clicked", sent_at=datetime.now(), delivered_at=datetime.now(), opened_at=datetime.now(), clicked_at=datetime.now())
    comm_b = Communication(campaign_id=campaign.id, customer_id=c2.id, channel="whatsapp", rendered_message="Hello B", variant="B", status="sent", sent_at=datetime.now())
    db_session.add_all([comm_a, comm_b])
    db_session.commit()

    resp = client.get(f"/campaigns/{campaign.id}/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["audience"] == 2
    assert "variants" in data
    
    variants = data["variants"]
    assert variants["A"]["sent"] == 1
    assert variants["A"]["clicked"] == 1
    assert variants["B"]["sent"] == 1
    assert variants["B"]["clicked"] == 0
    
    # Check ab_significance block
    assert "ab_significance" in data
