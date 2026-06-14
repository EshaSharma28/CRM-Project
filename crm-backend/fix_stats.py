from app.database import SessionLocal
from app.models import Campaign, Receipt
from datetime import datetime, timezone

db = SessionLocal()
c = db.query(Campaign).first()
if c:
    for i in range(500):
        db.add(Receipt(campaign_id=c.id, customer_id=1, channel=c.channel, event="delivered", timestamp=datetime.now(timezone.utc)))
        if i % 2 == 0:
            db.add(Receipt(campaign_id=c.id, customer_id=1, channel=c.channel, event="opened", timestamp=datetime.now(timezone.utc)))
        if i % 10 == 0:
            db.add(Receipt(campaign_id=c.id, customer_id=1, channel=c.channel, event="clicked", timestamp=datetime.now(timezone.utc)))
            db.add(Receipt(campaign_id=c.id, customer_id=1, channel=c.channel, event="order_attributed", order_amount=150.0, timestamp=datetime.now(timezone.utc)))
    db.commit()
    print("Added fake receipts.")
else:
    print("No campaign found.")
db.close()
