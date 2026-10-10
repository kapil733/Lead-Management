import Link from "next/link";
import { notFound } from "next/navigation";
import { getTelecallerPerformance } from "@/server/telecallers/queries";
import { PerformanceChart } from "@/components/telecallers/performance-chart";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDisplayDateTime } from "@/lib/dates";
import { RatingChip } from "@/components/leads/status-badge";
import { Button } from "@/components/ui/button";

export default async function TelecallerPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getTelecallerPerformance(id);
  if (!data) notFound();

  const { user, kpis, chart, cases } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/admin/employees">← Telecallers</Link>
          </Button>
          <h2 className="text-2xl font-semibold leading-8">{user.name}</h2>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div>
          {user.isActive ? (
            <span className="rounded-full bg-success-soft px-3 py-1 text-xs text-success-strong">
              Active
            </span>
          ) : (
            <span className="rounded-full bg-danger-soft px-3 py-1 text-xs text-danger">
              Inactive
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Closed (30d)" value={String(kpis.closed30d)} />
        <Kpi
          label="Avg rating"
          value={kpis.avgRating != null ? kpis.avgRating.toFixed(1) : "—"}
        />
        <Kpi label="Referrals" value={String(kpis.referrals)} />
        <Kpi label="Joined" value={String(kpis.joined)} />
      </div>

      <PerformanceChart data={chart} />

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-[13px] leading-[18px]">
          <thead className="sticky top-0 bg-surface-2 text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">Closed</th>
              <th className="px-3 py-2 font-medium">Lead</th>
              <th className="px-3 py-2 font-medium">Outcome</th>
              <th className="px-3 py-2 font-medium">Rating</th>
              <th className="px-3 py-2 font-medium">Friends</th>
              <th className="px-3 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-sm text-muted"
                >
                  No closed cases in this window
                </td>
              </tr>
            ) : (
              cases.map((c) => (
                <tr
                  key={c.id}
                  className="h-10 border-t border-border hover:bg-surface-2"
                >
                  <td className="px-3 py-1 tabular text-muted">
                    {c.closedAt ? formatDisplayDateTime(c.closedAt) : "—"}
                  </td>
                  <td className="px-3 py-1">
                    <div>{c.name ?? "—"}</div>
                    <div className="tabular text-xs text-muted">
                      {formatPhoneDisplay(c.phone)}
                    </div>
                  </td>
                  <td className="px-3 py-1">
                    {c.outcome?.replaceAll("_", " ") ?? "—"}
                  </td>
                  <td className="px-3 py-1">
                    {c.rating != null ? (
                      <RatingChip rating={c.rating} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-1 tabular">{c.friendsCount}</td>
                  <td className="px-3 py-1">{c.joined ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular">{value}</p>
    </div>
  );
}
