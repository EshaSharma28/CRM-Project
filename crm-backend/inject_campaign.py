import sys
from datetime import datetime, timezone, timedelta
import uuid

from app.database import SessionLocal
from app.models import Campaign, Communication, CommunicationEvent, Order

db = SessionLocal()

# 1. Create a Campaign
c = Campaign(
    name="Win back lapsed high-value customers",
    channel="email",
    message_template="Hey there! We miss you.",
    status="sent",
    created_at=datetime.now(timezone.utc) - timedelta(hours=2)
)
db.add(c)
db.commit()

# 2. Add Communications
# 250 sent, 120 opened, 45 clicked, 12 orders
for i in range(1, 251):
    status = "delivered"
    opened_at = None
    clicked_at = None
    attributed_order_id = None
    
    if i <= 120:
        status = "opened"
        opened_at = datetime.now(timezone.utc) - timedelta(minutes=90)
    if i <= 45:
        status = "clicked"
        clicked_at = datetime.now(timezone.utc) - timedelta(minutes=60)
    if i <= 12:
        # Give them an order
        order = db.query(Order).filter(Order.id == i).first()
        if order:
            attributed_order_id = order.id
            
    comm = Communication(
        campaign_id=c.id,
        customer_id=i,
        channel="email",
        rendered_message="Hey there! We miss you.",
        status=status,
        sent_at=datetime.now(timezone.utc) - timedelta(hours=2),
        delivered_at=datetime.now(timezone.utc) - timedelta(minutes=110),
        opened_at=opened_at,
        clicked_at=clicked_at,
        attributed_order_id=attributed_order_id
    )
    db.add(comm)

db.commit()
print("Successfully injected a realistic campaign with stats!")
db.close()
