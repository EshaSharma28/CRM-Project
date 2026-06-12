"""Pydantic request/response models. Filled out per-endpoint as routers land."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict

# --- Customers & orders (read models) --------------------------------------


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone: str
    city: str
    channel_pref: str
    signup_date: datetime
    persona: str
    total_spent: float
    order_count: int
    last_order_date: datetime | None
    avg_days_between_orders: float | None
    lifecycle_stage: str
    rfm_segment: str


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    product: str
    amount: float
    is_subscription: bool
    used_discount: bool
    ordered_at: datetime


# --- AI co-pilot -----------------------------------------------------------


class CopilotGoal(BaseModel):
    """A marketer's natural-language goal, e.g. 'win back lapsed regulars'."""

    goal: str


class SegmentRule(BaseModel):
    """Structured, validated audience filter the AI emits (never raw SQL)."""

    field: str          # e.g. "last_order_date", "total_spent", "lifecycle_stage"
    op: str             # e.g. "gt", "lt", "eq", "days_since_gt"
    value: object


class CopilotProposal(BaseModel):
    """What the co-pilot returns for a goal: an audience + a draft message."""

    segment_name: str
    segment_description: str
    rules: list[SegmentRule]
    estimated_count: int
    suggested_channel: str
    message_draft: str


# --- Segments & campaigns (write models) -----------------------------------


class SegmentPreviewIn(BaseModel):
    rules: list[SegmentRule]


class SegmentCreateIn(BaseModel):
    name: str
    description: str = ""
    rules: list[SegmentRule]


class CampaignCreateIn(BaseModel):
    name: str
    segment_id: int
    channel: str
    message_template: str
    message_template_b: str | None = None


class DraftIn(BaseModel):
    """Ask the AI for a single message draft (used for 'regenerate' / variant B)."""

    description: str
    channel: str = "whatsapp"


class AskIn(BaseModel):
    """A natural-language analytics question about the shopper base."""

    question: str


class ChatMsg(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatIn(BaseModel):
    """A multi-turn co-pilot conversation: history + the current working proposal."""

    messages: list[ChatMsg]
    proposal: dict | None = None


# --- Agentic journeys ------------------------------------------------------


class AgentGoal(BaseModel):
    goal: str


class AgentStepIn(BaseModel):
    label: str
    audience_kind: str  # initial | non_openers_of_previous | non_clickers_of_previous
    rules: list[SegmentRule] = []
    channel: str
    message: str
    wait_label: str = ""


class AgentRunIn(BaseModel):
    name: str
    goal: str
    objective: str = ""
    steps: list[AgentStepIn]


class CopilotLaunchIn(BaseModel):
    """An approved proposal the marketer wants to fire (segment + campaign + send)."""

    name: str
    description: str = ""
    rules: list[SegmentRule]
    channel: str
    message_template: str
    message_template_b: str | None = None


# --- Receipts (callbacks from the channel service) -------------------------


class ReceiptEvent(BaseModel):
    """One async engagement event for a single communication."""

    event_id: str       # idempotency key (dedupe replays)
    communication_id: int
    event_type: str     # sent|delivered|opened|read|clicked|failed
    occurred_at: str     # ISO timestamp from the channel service
