import Link from "next/link";

export type TelecallerBarRow = {
  id: string;
  name: string;
  email: string;
  closed: number;
  avgRating: number | null;
  barPct: number;
  hasOpenCase: boolean;
  openStale: boolean;
};

export function TelecallerBars({ rows }: { rows: TelecallerBarRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface px-4 py-10 text-center text-sm text-muted shadow-[var(--shadow-card)]">
        No active telecallers
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-border bg-surface">
      <table className="w-full text-left text-[13px] leading-[18px]">
        <thead>
          <tr>
            <th className="px-3 py-2 font-medium">Telecaller</th>
            <th className="px-3 py-2 font-medium">Closed</th>
            <th className="min-w-[160px] px-3 py-2 font-medium">Volume</th>
            <th className="px-3 py-2 font-medium">Avg rating</th>
            <th className="px-3 py-2 font-medium">Now</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="h-10 border-t border-border hover:bg-surface-2"
            >
              <td className="px-3 py-1">
                <Link
                  href={`/admin/employees/${row.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {row.name}
                </Link>
              </td>
              <td className="px-3 py-1 tabular">{row.closed}</td>
              <td className="px-3 py-1">
                <div className="h-2 w-full max-w-[200px] rounded-full bg-surface-2">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${row.barPct}%` }}
                  />
                </div>
              </td>
              <td className="px-3 py-1 tabular">
                {row.avgRating != null ? row.avgRating.toFixed(1) : "—"}
              </td>
              <td className="px-3 py-1">
                {row.hasOpenCase ? (
                  <span
                    className={
                      row.openStale
                        ? "rounded-full bg-danger-soft px-2 py-0.5 text-xs text-danger"
                        : "rounded-full bg-info-soft px-2 py-0.5 text-xs text-info"
                    }
                  >
                    {row.openStale ? "Stale case" : "In case"}
                  </span>
                ) : (
                  <span className="text-xs text-muted">Idle</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
