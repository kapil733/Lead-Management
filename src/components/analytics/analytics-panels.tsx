"use client";

import {
  CasesOverTimeChart,
  OutcomeChart,
  RatingChart,
  HourChart,
  DowChart,
  SimpleSeriesChart,
} from "@/components/analytics/analytics-charts";
import { TelecallersPanel } from "@/components/analytics/telecallers-panel";
import { AnalyticsDataTable } from "@/components/analytics/data-table";
import type { AnalyticsTab } from "@/lib/validators/analytics";

export function AnalyticsKpis({
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
    { label: "Closed", value: String(kpis.closed) },
    {
      label: "Connected",
      value:
        kpis.connectedRate != null
          ? `${kpis.connectedRate}%`
          : "—",
      hint: `${kpis.connected} cases`,
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
          className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]"
        >
          <p className="text-xs text-muted">{item.label}</p>
          <p className="mt-1 text-xl font-semibold tabular">{item.value}</p>
          {"hint" in item && item.hint ? (
            <p className="text-xs text-muted">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

type Series = {
  byDay: { date: string; count: number }[];
  referralsByDay: { date: string; count: number }[];
  joinedByDay: { date: string; count: number }[];
  byOutcome: { outcome: string; count: number }[];
  byRating: { rating: number; count: number }[];
  byHour: { hour: number; count: number }[];
  byDow: { dow: number; label: string; count: number }[];
};

export function AnalyticsTabBody({
  tab,
  series,
  telecallers,
  drill,
  selected,
}: {
  tab: AnalyticsTab;
  series: Series;
  telecallers: Parameters<typeof TelecallersPanel>[0]["rows"];
  drill: {
    rows: Parameters<typeof AnalyticsDataTable>[0]["rows"];
    total: number;
    pageSize: number;
  };
  selected: {
    outcome?: string | null;
    rating?: number | null;
    employeeId?: string | null;
    hour?: number | null;
    dow?: number | null;
  };
}) {
  if (tab === "overview") {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <CasesOverTimeChart
            data={series.byDay}
            activeOutcome={selected.outcome}
          />
          <OutcomeChart data={series.byOutcome} selected={selected.outcome} />
        </div>
        <RatingChart data={series.byRating} selected={selected.rating} />
      </div>
    );
  }

  if (tab === "telecallers") {
    return (
      <TelecallersPanel
        rows={telecallers}
        selectedId={selected.employeeId}
      />
    );
  }

  if (tab === "referrals") {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <SimpleSeriesChart
          title="Referrals captured"
          subtitle="Friends saved on closed cases by day"
          data={series.referralsByDay}
          color="var(--info)"
        />
        <SimpleSeriesChart
          title="Joined (on closed cases)"
          subtitle="Closed cases whose lead is marked Joined"
          data={series.joinedByDay}
          color="var(--success)"
        />
      </div>
    );
  }

  if (tab === "time") {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <HourChart data={series.byHour} selected={selected.hour} />
        <DowChart data={series.byDow} selected={selected.dow} />
      </div>
    );
  }

  return (
    <AnalyticsDataTable
      rows={drill.rows}
      total={drill.total}
      pageSize={drill.pageSize}
    />
  );
}
