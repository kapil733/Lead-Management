export function KpiCards({
  kpis,
}: {
  kpis: {
    closed: number;
    connected: number;
    connectedRate: number | null;
    avgRating: number | null;
    referrals: number;
    joined: number;
  };
}) {
  const items = [
    { label: "Closed cases", value: String(kpis.closed) },
    {
      label: "Connected rate",
      value:
        kpis.connectedRate != null ? `${kpis.connectedRate}%` : "—",
      hint: `${kpis.connected} connected`,
    },
    {
      label: "Avg rating",
      value: kpis.avgRating != null ? kpis.avgRating.toFixed(1) : "—",
    },
    { label: "Referrals", value: String(kpis.referrals) },
    { label: "Joined", value: String(kpis.joined) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <p className="kicker">{item.label}</p>
          <p className="mt-3 font-mono text-4xl font-medium leading-none tracking-tight">
            {item.value}
          </p>
          {"hint" in item && item.hint ? (
            <p className="mt-2 font-mono text-xs text-muted-2">{item.hint}</p>
          ) : (
            <p className="mt-2 font-mono text-xs text-muted-2">in range</p>
          )}
        </div>
      ))}
    </div>
  );
}
