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

export function CasesChart({
  data,
  periodLabel,
}: {
  data: { date: string; count: number }[];
  periodLabel: string;
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  if (chartData.length === 0 || chartData.every((d) => d.count === 0)) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[18px] border border-border bg-surface text-sm text-muted">
        No closed cases in {periodLabel}
      </div>
    );
  }

  return (
    <div className="h-72 rounded-[18px] border border-border bg-surface p-6">
      <p className="mb-1 font-display text-[17px] font-bold">Cases closed</p>
      <p className="mb-3 text-xs text-muted">{periodLabel}</p>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            interval="preserveStartEnd"
            minTickGap={20}
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
