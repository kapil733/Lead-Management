export default function DashboardLoading() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="h-8 w-48 animate-pulse rounded-md bg-surface-2" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface-2"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />
    </div>
  );
}
