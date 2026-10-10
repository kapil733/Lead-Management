import { AlertTriangle, Droplets } from "lucide-react";

export function AlertsStrip({
  poolLow,
  newLeads,
  totalLeads,
  staleCount,
  staleCaseMinutes,
}: {
  poolLow: boolean;
  newLeads: number;
  totalLeads: number;
  staleCount: number;
  staleCaseMinutes: number;
}) {
  if (!poolLow && staleCount === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-success-soft px-4 py-3 text-sm text-success-strong">
        All clear — pool healthy and no stale open cases.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {poolLow ? (
        <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-warning bg-warning-soft px-4 py-3 text-sm">
          <Droplets className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium text-text">Pool running low</p>
            <p className="text-muted">
              {newLeads} NEW leads of {totalLeads} total (alert when under 50 or
              under 10%). Import more leads soon.
            </p>
          </div>
        </div>
      ) : null}
      {staleCount > 0 ? (
        <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-danger bg-danger-soft px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
          <div>
            <p className="font-medium text-text">
              {staleCount} stale open case{staleCount === 1 ? "" : "s"}
            </p>
            <p className="text-muted">
              Open longer than {staleCaseMinutes} minutes. Review Live activity
              and Release if needed.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
