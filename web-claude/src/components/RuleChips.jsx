const OP = { gt: ">", lt: "<", gte: "≥", lte: "≤", eq: "=" };

const FIELD_LABEL = {
  total_spent: "lifetime spend",
  order_count: "orders",
  avg_days_between_orders: "avg days between orders",
  lifecycle_stage: "lifecycle",
  city: "city",
  channel_pref: "preferred channel",
  days_since_last_order: "days since last order",
};

export default function RuleChips({ rules = [] }) {
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      {rules.map((r, i) => (
        <span className="chip" key={i}>
          <b>{FIELD_LABEL[r.field] || r.field}</b> {OP[r.op] || r.op}{" "}
          {typeof r.value === "number" && r.field === "total_spent"
            ? "₹" + r.value.toLocaleString("en-IN")
            : String(r.value)}
        </span>
      ))}
    </div>
  );
}
