"""SQLAlchemy ORM models — the CRM data model.

Five tables:
  customers       — shoppers, with derived behavioural fields
  orders          — purchase history
  segments        — saved audience definitions (a filter rule)
  campaigns       — a message sent to a segment over a channel
  communications  — one message to one customer; where channel receipts land
"""
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200), index=True)
    phone: Mapped[str] = mapped_column(String(40))
    city: Mapped[str] = mapped_column(String(80), index=True)
    channel_pref: Mapped[str] = mapped_column(String(20))  # whatsapp|email|sms
    signup_date: Mapped[datetime] = mapped_column(DateTime)

    # Derived/cached behavioural fields the AI segments on (kept fresh on ingest).
    persona: Mapped[str] = mapped_column(String(40), index=True)  # for eval only
    total_spent: Mapped[float] = mapped_column(Float, default=0.0)
    order_count: Mapped[int] = mapped_column(Integer, default=0)
    last_order_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    avg_days_between_orders: Mapped[float | None] = mapped_column(Float, nullable=True)
    lifecycle_stage: Mapped[str] = mapped_column(String(30), index=True)

    # RFM — recency/frequency/monetary quintile scores (1-5) + the named segment
    # they roll up to. Recomputed across the whole base (quintiles are relative).
    r_score: Mapped[int] = mapped_column(Integer, default=0)
    f_score: Mapped[int] = mapped_column(Integer, default=0)
    m_score: Mapped[int] = mapped_column(Integer, default=0)
    rfm_segment: Mapped[str] = mapped_column(String(40), default="", index=True)

    orders: Mapped[list["Order"]] = relationship(back_populates="customer")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    product: Mapped[str] = mapped_column(String(120))
    amount: Mapped[float] = mapped_column(Float)
    is_subscription: Mapped[bool] = mapped_column(Boolean, default=False)
    used_discount: Mapped[bool] = mapped_column(Boolean, default=False)
    ordered_at: Mapped[datetime] = mapped_column(DateTime, index=True)

    customer: Mapped["Customer"] = relationship(back_populates="orders")


class Segment(Base):
    __tablename__ = "segments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(400), default="")
    # Structured, validated filter rule the AI produces (not raw SQL).
    rule: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    # Nullable: journey/agent steps target an explicit audience, not a saved segment.
    segment_id: Mapped[int | None] = mapped_column(ForeignKey("segments.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String(20))
    message_template: Mapped[str] = mapped_column(String(2000))
    # Optional A/B variant — when set, the audience is split 50/50 across A and B.
    message_template_b: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft|sending|sent
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Communication(Base):
    __tablename__ = "communications"

    id: Mapped[int] = mapped_column(primary_key=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"), index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    channel: Mapped[str] = mapped_column(String(20))
    rendered_message: Mapped[str] = mapped_column(String(2000))
    variant: Mapped[str] = mapped_column(String(1), default="A")  # A or B (A/B test)

    # Lifecycle state, updated by async receipts from the channel service.
    status: Mapped[str] = mapped_column(String(20), default="queued", index=True)
    # queued -> sent -> delivered -> opened -> read -> clicked  (or failed)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    clicked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Attribution: an order placed shortly after this comm (the "order came
    # because of this communication" signal from the brief).
    attributed_order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.id"), nullable=True
    )


class Journey(Base):
    """An agentic, multi-step campaign plan that executes itself over time."""

    __tablename__ = "journeys"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    goal: Mapped[str] = mapped_column(String(500))
    objective: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(20), default="running")  # running|completed
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    steps: Mapped[list["JourneyStep"]] = relationship(
        back_populates="journey", order_by="JourneyStep.step_index"
    )


class JourneyStep(Base):
    """One step of a journey — becomes a real Campaign when it fires."""

    __tablename__ = "journey_steps"

    id: Mapped[int] = mapped_column(primary_key=True)
    journey_id: Mapped[int] = mapped_column(ForeignKey("journeys.id"), index=True)
    step_index: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String(160))
    # audience kind: "initial" (uses rules) | "non_openers_of_previous" | "non_clickers_of_previous"
    audience_kind: Mapped[str] = mapped_column(String(40))
    rules: Mapped[dict] = mapped_column(JSON, default=dict)  # for the initial step
    channel: Mapped[str] = mapped_column(String(20))
    message_template: Mapped[str] = mapped_column(String(2000))
    wait_label: Mapped[str] = mapped_column(String(60), default="")  # e.g. "after 3 days"
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|running|sent|skipped
    audience_count: Mapped[int] = mapped_column(Integer, default=0)
    campaign_id: Mapped[int | None] = mapped_column(ForeignKey("campaigns.id"), nullable=True)

    journey: Mapped["Journey"] = relationship(back_populates="steps")


class CommunicationEvent(Base):
    """Append-only log of every receipt the channel service sends us.

    The primary key IS the channel's event_id, so re-delivered callbacks are
    rejected by the database itself — idempotency with zero extra logic. Also
    gives us a full audit trail of what arrived when (vs. when it 'occurred').
    """

    __tablename__ = "communication_events"

    event_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    communication_id: Mapped[int] = mapped_column(
        ForeignKey("communications.id"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(20))
    occurred_at: Mapped[datetime] = mapped_column(DateTime)  # logical time at channel
    received_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
