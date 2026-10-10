"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { ChartCard } from "@/components/analytics/chart-card";
import { useAnalyticsCrossFilter } from "@/components/analytics/use-analytics-cross-filter";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  fontSize: 12,
};

export function CasesOverTimeChart({
  data,
  activeOutcome,
}: {
  data: { date: string; count: number }[];
  activeOutcome?: string | null;
}) {
  const { drillDay, exportCsv } = useAnalyticsCrossFilter();
  const empty = data.every((d) => d.count === 0);
  const chartData = data.map((d) => ({ ...d, label: d.date.slice(5) }));

  return (
    <ChartCard
      title="Cases closed over time"
      subtitle={
        activeOutcome
          ? `Filtered · click a day to drill`
          : "Click a day to open Data for that date"
      }
      empty={empty}
      onExport={exportCsv}
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              allowDecimals={false}
              width={28}
              tick={{ fontSize: 10, fill: "var(--muted)" }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(_, p) =>
                (p?.[0]?.payload as { date?: string } | undefined)?.date ?? ""
              }
            />
            <Bar
              dataKey="count"
              fill="var(--primary)"
              radius={[3, 3, 0, 0]}
              cursor="pointer"
              onClick={(entry) => {
                const date = payloadOf(entry).date as string | undefined;
                if (date) drillDay(date);
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function payloadOf(entry: unknown): Record<string, unknown> {
  if (!entry || typeof entry !== "object") return {};
  const e = entry as { payload?: Record<string, unknown> };
  return e.payload ?? (entry as Record<string, unknown>);
}

export function OutcomeChart({
  data,
  selected,
}: {
  data: { outcome: string; count: number }[];
  selected?: string | null;
}) {
  const { toggleOutcome, exportCsv, setState } = useAnalyticsCrossFilter();
  const empty = data.every((d) => d.count === 0);
  const chartData = data.map((d) => ({
    ...d,
    label: d.outcome.replaceAll("_", " "),
  }));

  return (
    <ChartCard
      title="Outcomes"
      subtitle="Click a bar to cross-filter"
      empty={empty}
      onExport={exportCsv}
      onClearFilter={
        selected
          ? () => void setState({ outcome: null, page: 1 })
          : undefined
      }
      clearLabel="Clear outcome filter"
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
          >
            <CartesianGrid stroke="var(--border)" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tick={{ fontSize: 10, fill: "var(--muted)" }}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="count"
              radius={[0, 3, 3, 0]}
              cursor="pointer"
              onClick={(entry) => {
                const outcome = payloadOf(entry).outcome as string | undefined;
                if (outcome) toggleOutcome(outcome);
              }}
            >
              {chartData.map((d) => (
                <Cell
                  key={d.outcome}
                  fill={
                    selected === d.outcome
                      ? "var(--primary)"
                      : selected
                        ? "var(--border)"
                        : "var(--primary)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function RatingChart({
  data,
  selected,
}: {
  data: { rating: number; count: number }[];
  selected?: number | null;
}) {
  const { toggleRating, exportCsv, setState } = useAnalyticsCrossFilter();
  const empty = data.every((d) => d.count === 0);

  return (
    <ChartCard
      title="Rating distribution"
      subtitle="Connected ratings 0–5 · click to filter"
      empty={empty}
      onExport={exportCsv}
      onClearFilter={
        selected != null
          ? () => void setState({ rating: null, page: 1 })
          : undefined
      }
      clearLabel="Clear rating filter"
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="rating" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="count"
              radius={[3, 3, 0, 0]}
              cursor="pointer"
              onClick={(entry) => {
                const rating = payloadOf(entry).rating as number | undefined;
                if (rating != null) toggleRating(rating);
              }}
            >
              {data.map((d) => (
                <Cell
                  key={d.rating}
                  fill={
                    selected === d.rating
                      ? `var(--rating-${d.rating})`
                      : selected != null
                        ? "var(--border)"
                        : `var(--rating-${d.rating})`
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function HourChart({
  data,
  selected,
}: {
  data: { hour: number; count: number }[];
  selected?: number | null;
}) {
  const { toggleHour, exportCsv, setState } = useAnalyticsCrossFilter();
  const empty = data.every((d) => d.count === 0);
  const chartData = data.map((d) => ({
    ...d,
    label: String(d.hour).padStart(2, "0"),
  }));

  return (
    <ChartCard
      title="By hour of day (IST)"
      subtitle="When cases were closed · click to filter"
      empty={empty}
      onExport={exportCsv}
      onClearFilter={
        selected != null
          ? () => void setState({ hour: null, page: 1 })
          : undefined
      }
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={1} />
            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="count"
              radius={[2, 2, 0, 0]}
              cursor="pointer"
              onClick={(entry) => {
                const hour = payloadOf(entry).hour as number | undefined;
                if (hour != null) toggleHour(hour);
              }}
            >
              {chartData.map((d) => (
                <Cell
                  key={d.hour}
                  fill={
                    selected === d.hour
                      ? "var(--primary)"
                      : selected != null
                        ? "var(--border)"
                        : "var(--info)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function DowChart({
  data,
  selected,
}: {
  data: { dow: number; label: string; count: number }[];
  selected?: number | null;
}) {
  const { toggleDow, exportCsv, setState } = useAnalyticsCrossFilter();
  const empty = data.every((d) => d.count === 0);

  return (
    <ChartCard
      title="By day of week (IST)"
      subtitle="Click a day to cross-filter"
      empty={empty}
      onExport={exportCsv}
      onClearFilter={
        selected != null
          ? () => void setState({ dow: null, page: 1 })
          : undefined
      }
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="count"
              radius={[3, 3, 0, 0]}
              cursor="pointer"
              onClick={(entry) => {
                const dow = payloadOf(entry).dow as number | undefined;
                if (dow != null) toggleDow(dow);
              }}
            >
              {data.map((d) => (
                <Cell
                  key={d.dow}
                  fill={
                    selected === d.dow
                      ? "var(--primary)"
                      : selected != null
                        ? "var(--border)"
                        : "var(--primary)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function SimpleSeriesChart({
  title,
  subtitle,
  data,
  color = "var(--success)",
}: {
  title: string;
  subtitle: string;
  data: { date: string; count: number }[];
  color?: string;
}) {
  const { exportCsv, drillDay } = useAnalyticsCrossFilter();
  const empty = data.every((d) => d.count === 0);
  const chartData = data.map((d) => ({ ...d, label: d.date.slice(5) }));

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      empty={empty}
      onExport={exportCsv}
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="count"
              fill={color}
              radius={[3, 3, 0, 0]}
              cursor="pointer"
              onClick={(entry) => {
                const date = payloadOf(entry).date as string | undefined;
                if (date) drillDay(date);
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
