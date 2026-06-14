import sys
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal
from app.models import Campaign, Communication, Order

db = SessionLocal()

campaigns_data = [
    {
        "name": "Welcome shoppers who just placed their first order",
        "channel": "whatsapp",
        "template": "Welcome to Brewhaus! Hope you enjoy your first cup.",
        "sent": 180,
        "opened": 150,
        "clicked": 80,
        "orders": 25,
        "hours_ago": 24
    },
    {
        "name": "Reward our Champions with a thank-you perk",
        "channel": "sms",
        "template": "Thanks for being a champion. Here's a 20% off perk.",
        "sent": 400,
        "opened": 300,
        "clicked": 120,
        "orders": 40,
        "hours_ago": 48
    },
    {
        "name": "Re-engage one-time buyers who never came back",
        "channel": "email",
        "template": "We noticed you haven't bought anything in a while.",
        "sent": 800,
        "opened": 200,
        "clicked": 40,
        "orders": 5,
        "hours_ago": 72
    }
]

customer_id_counter = 100

for data in campaigns_data:
    c = Campaign(
        name=data["name"],
        channel=data["channel"],
        message_template=data["template"],
        status="sent",
        created_at=datetime.now(timezone.utc) - timedelta(hours=data["hours_ago"])
    )
    db.add(c)
    db.commit()

    for i in range(1, data["sent"] + 1):
        status = "delivered"
        opened_at = None
        clicked_at = None
        attributed_order_id = None
        
        if i <= data["opened"]:
            status = "opened"
            opened_at = datetime.now(timezone.utc) - timedelta(hours=data["hours_ago"], minutes=-30)
        if i <= data["clicked"]:
            status = "clicked"
            clicked_at = datetime.now(timezone.utc) - timedelta(hours=data["hours_ago"], minutes=-60)
        if i <= data["orders"]:
            # assign an order
            order = db.query(Order).filter(Order.id == customer_id_counter).first()
            if order:
                attributed_order_id = order.id
        
        comm = Communication(
            campaign_id=c.id,
            customer_id=customer_id_counter,
            channel=data["channel"],
            rendered_message=data["template"],
            status=status,
            sent_at=datetime.now(timezone.utc) - timedelta(hours=data["hours_ago"]),
            delivered_at=datetime.now(timezone.utc) - timedelta(hours=data["hours_ago"], minutes=-10),
            opened_at=opened_at,
            clicked_at=clicked_at,
            attributed_order_id=attributed_order_id
        )
        db.add(comm)
        
        customer_id_counter += 1
        if customer_id_counter > 500:
            customer_id_counter = 1

    db.commit()

print("Successfully restored old campaigns and injected stats!")
db.close()
