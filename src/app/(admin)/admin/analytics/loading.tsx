import { ChartSkeleton } from "@/components/analytics/chart-card";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded bg-surface-2" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-[var(--radius-card)] bg-surface-2"
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartSkeleton title="Cases" />
        <ChartSkeleton title="Outcomes" />
      </div>
    </div>
  );
}
