import { CallOutcome } from "@prisma/client";
import {
  analyticsFiltersSchema,
  type AnalyticsTab,
} from "@/lib/validators/analytics";
import {
  defaultAnalyticsRange,
  getAnalyticsData,
  getAnalyticsFilterOptions,
} from "@/server/analytics/queries";
import { AnalyticsFilters } from "@/components/analytics/analytics-filters";
import { AnalyticsTabs } from "@/components/analytics/analytics-tabs";
import {
  AnalyticsKpis,
  AnalyticsTabBody,
} from "@/components/analytics/analytics-panels";
import { PageIntro } from "@/components/shared/page-intro";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const get = (key: string) => {
    const v = raw[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const defaults = defaultAnalyticsRange();
  const outcomeRaw = get("outcome");
  const tabRaw = get("tab");

  const filters = analyticsFiltersSchema.parse({
    tab:
      tabRaw &&
      ["overview", "telecallers", "referrals", "time", "data"].includes(tabRaw)
        ? tabRaw
        : "overview",
    from: get("from") || defaults.from,
    to: get("to") || defaults.to,
    employeeId: get("employeeId") || undefined,
    outcome:
      outcomeRaw &&
      Object.values(CallOutcome).includes(outcomeRaw as CallOutcome)
        ? outcomeRaw
        : undefined,
    rating: get("rating") || undefined,
    city: get("city") || undefined,
    trade: get("trade") || undefined,
    hour: get("hour") || undefined,
    dow: get("dow") || undefined,
    page: get("page") ?? "1",
    pageSize: "25",
  });

  const [options, data] = await Promise.all([
    getAnalyticsFilterOptions(),
    getAnalyticsData(filters),
  ]);

  const tab = filters.tab as AnalyticsTab;

  return (
    <div className="space-y-4">
      <PageIntro
        kicker="Recruitment · insights"
        title="Analytics"
        description={`Cross-filtered recruitment metrics · ${data.range.from} → ${data.range.to} (IST)`}
      />

      <AnalyticsFilters
        employees={options.employees}
        cities={options.cities}
        trades={options.trades}
        resolvedFrom={defaults.from}
        resolvedTo={defaults.to}
      />

      <AnalyticsTabs />

      <AnalyticsKpis
        kpis={{
          closed: data.kpis.closed,
          connected: data.kpis.connected,
          connectedRate: data.kpis.connectedRate,
          avgRating: data.kpis.avgRating,
          referrals: data.kpis.referrals,
          joined: data.kpis.joined,
        }}
      />

      <AnalyticsTabBody
        tab={tab}
        series={data.series}
        telecallers={data.telecallers}
        drill={{
          total: data.drill.total,
          pageSize: data.drill.pageSize,
          rows: data.drill.rows.map((r) => ({
            ...r,
            closedAt: r.closedAt?.toISOString() ?? null,
          })),
        }}
        selected={{
          outcome: filters.outcome,
          rating: filters.rating,
          employeeId: filters.employeeId,
          hour: filters.hour,
          dow: filters.dow,
        }}
      />
    </div>
  );
}
