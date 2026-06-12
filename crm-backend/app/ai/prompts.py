"""Prompt templates for the three AI moments.

1. goal_to_segment  — natural-language goal -> structured audience filter
2. draft_message    — segment + channel -> personalised message copy
3. summarise_results — campaign stats -> plain-English insight
"""

# The whitelist of fields the AI may filter on. Keeping this explicit (rather
# than letting the model emit raw SQL) is what makes AI-driven segmentation safe.
SEGMENTABLE_FIELDS = """
- total_spent (float, lifetime spend)
- order_count (int)
- days_since_last_order (int)
- avg_days_between_orders (float)
- lifecycle_stage (one of: new, active, at_risk, lapsed, churned)
- rfm_segment (RFM marketing segment; one of: Champions, Loyal, Potential Loyalist,
  New, Promising, Needs Attention, At Risk, Can't Lose Them, Hibernating, Lost)
- r_score, f_score, m_score (RFM recency/frequency/monetary scores, each 1-5; 5 is best)
- city (string)
- channel_pref (whatsapp|email|sms|rcs)

Prefer rfm_segment when the goal maps to a known marketing segment (e.g. "reward our
best customers" -> Champions; "win back lapsed big spenders" -> Can't Lose Them).

IMPORTANT about operators: ops are gt, lt, gte, lte, eq, and "in".
- Use "in" with a LIST to match any of several values, e.g.
  {"field": "rfm_segment", "op": "in", "value": ["Champions", "Loyal"]}.
- NEVER emit two "eq" rules on the same field (rules are AND-ed, so that matches nobody).
  Use a single "in" rule instead.
"""

GOAL_TO_SEGMENT = """You are a CRM audience strategist for Brewhaus, a D2C coffee brand.
Convert the marketer's goal into a structured audience filter.

Marketer goal: "{goal}"

You may ONLY filter on these fields:
{fields}

LIVE DATA PROFILE — use these real numbers to choose thresholds that actually
match customers (e.g. don't guess a spend cutoff; anchor it to the percentiles):
{data_profile}

Guidelines:
- Keep it tight: prefer 1-3 rules. Over-constraining returns nobody.
- Pick lifecycle_stage values only from the ones listed above.
- Anchor numeric thresholds to the percentiles (e.g. "high value" ~ p75/p90).

Respond as JSON:
{{
  "segment_name": "...",
  "segment_description": "...",
  "suggested_channel": "whatsapp|email|sms",
  "rules": [{{"field": "...", "op": "gt|lt|eq|gte|lte", "value": ...}}]
}}
"""

CHAT_REFINE = """You are Brewhaus's campaign co-pilot, in a conversation with a marketer.
You maintain a "working proposal" (audience + message) and refine it across turns.

You may ONLY filter on these fields:
{fields}

Live data profile (anchor numeric thresholds to these real values):
{data_profile}

Current working proposal (JSON; null if this is the first turn):
{proposal}

Conversation so far:
{conversation}

Apply the marketer's LATEST message as an incremental change — KEEP everything they
didn't ask to change. On the first turn, build the proposal from their goal. Use the
"in" operator (list value) for any-of; never two "eq" rules on the same field.

CRITICAL: only change what the marketer asked about.
- If their message is about the MESSAGE wording or CHANNEL only, copy "rules" VERBATIM
  from the current proposal — do not alter the audience.
- If their message is about the AUDIENCE only, keep "message_draft" unchanged.

Respond as JSON:
{{
  "reply": "1-2 sentences telling the marketer what you changed",
  "proposal": {{
    "segment_name": "...",
    "segment_description": "...",
    "suggested_channel": "whatsapp|email|sms",
    "rules": [{{"field":"...","op":"gt|lt|gte|lte|eq|in","value":...}}],
    "message_draft": "message text with {{first_name}}"
  }}
}}
"""

DRAFT_MESSAGE = """Write a short, warm marketing message for Brewhaus (coffee brand).
Audience: {segment_description}
Channel: {channel}
Use {{first_name}} as a personalisation token. Keep it on-brand and concise.
For whatsapp/sms keep under 320 characters. Return only the message text.
"""

SUMMARISE_RESULTS = """Summarise this campaign's performance for a marketer in 2 short lines.
Be specific and suggest one next action.
Stats (JSON): {stats}
"""

AGENT_PLAN = """You are an autonomous campaign strategist for Brewhaus, a D2C coffee brand.
Given a broad goal, design a SELF-EXECUTING multi-step journey (2 or 3 steps).

Goal: "{goal}"

Step 1 is the initial outreach to an audience you define with filters.
Later steps automatically RE-TARGET people who didn't engage with the previous
step, usually on a DIFFERENT channel, with a different angle.

Filterable fields for step 1's audience:
{fields}

Live data profile (anchor thresholds to these real numbers):
{data_profile}

Output JSON:
{{
  "name": "short journey name",
  "objective": "one sentence on the strategy",
  "steps": [
    {{
      "label": "Initial win-back",
      "audience_kind": "initial",
      "rules": [{{"field":"...","op":"gt|lt|gte|lte|eq|in","value":...}}],
      "channel": "whatsapp|email|sms",
      "message": "message with {{first_name}} token",
      "wait_label": "immediately"
    }},
    {{
      "label": "Follow up with non-openers",
      "audience_kind": "non_openers_of_previous",
      "channel": "email",
      "message": "...",
      "wait_label": "after 3 days"
    }}
  ]
}}
audience_kind for non-first steps must be "non_openers_of_previous" or "non_clickers_of_previous".
Keep it to 2-3 steps. Make each step's channel/message purposeful.
"""

ANALYTICS = """You are a data analyst for Brewhaus, a D2C coffee brand. Convert the
marketer's question into a structured query over the data.

Question: "{question}"

There are two entities you can query:
- "shoppers" (customers). Metrics: "count", "sum_spend", "avg_spend".
- "orders" (purchases). Metrics: "order_count", "revenue", "avg_order_value".
Choose the entity the question is really about (money/purchases/products -> orders;
people/segments/counts of customers -> shoppers).

Filterable fields for the WHERE clause (filters always apply to the shopper attributes):
{fields}

Live data profile (use real values to choose thresholds):
{data_profile}

Output JSON:
{{
  "interpretation": "one-line restatement of what you're computing",
  "entity": "shoppers" | "orders",
  "metric": one of the metrics valid for the chosen entity (see above),
  "rules": [{{"field": "...", "op": "gt|lt|gte|lte|eq|in", "value": ...}}],  // filter; [] for all
  "time_window_days": null | <int>,   // e.g. 30 for "last 30 days" / "this month" -> 30
  "group_by": null | "city" | "lifecycle_stage" | "rfm_segment" | "channel_pref"
              | "product" | "is_subscription" | "month"
}}
Notes:
- Use group_by when the question asks "which / by / per / breakdown / over time".
- "month" group_by gives a time series (only valid for the orders entity).
- "product" and "is_subscription" group_by are only valid for the orders entity.
"""
