"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function PerformanceChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  if (chartData.every((d) => d.count === 0)) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[var(--radius-card)] border border-border bg-surface text-sm text-muted">
        No closed cases in the last 30 days
      </div>
    );
  }

  return (
    <div className="h-64 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
      <p className="mb-2 text-sm font-medium">Cases closed (last 30 days)</p>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            width={28}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as { date?: string } | undefined;
              return p?.date ?? "";
            }}
          />
          <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
