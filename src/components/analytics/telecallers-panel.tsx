"use client";

import Link from "next/link";
import { ChartCard } from "@/components/analytics/chart-card";
import { useAnalyticsCrossFilter } from "@/components/analytics/use-analytics-cross-filter";
import { cn } from "@/lib/utils";

export type TelecallerAnalyticsRow = {
  id: string;
  name: string;
  email: string;
  closed: number;
  connected: number;
  connectedRate: number | null;
  avgRating: number | null;
  referrals: number;
  joined: number;
  barPct: number;
};

export function TelecallersPanel({
  rows,
  selectedId,
}: {
  rows: TelecallerAnalyticsRow[];
  selectedId?: string | null;
}) {
  const { toggleEmployee, exportCsv, setState } = useAnalyticsCrossFilter();

  return (
    <ChartCard
      title="Telecaller performance"
      subtitle="Click a row to cross-filter all tabs"
      empty={rows.length === 0}
      emptyMessage="No closed cases for telecallers in this range"
      onExport={exportCsv}
      onClearFilter={
        selectedId
          ? () => void setState({ employeeId: null, page: 1 })
          : undefined
      }
      clearLabel="Clear telecaller filter"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] leading-[18px]">
          <thead className="bg-surface-2 text-xs">
            <tr>
              <th className="px-2 py-2 font-medium">Name</th>
              <th className="px-2 py-2 font-medium">Closed</th>
              <th className="min-w-[120px] px-2 py-2 font-medium">Volume</th>
              <th className="px-2 py-2 font-medium">Connected %</th>
              <th className="px-2 py-2 font-medium">Avg rating</th>
              <th className="px-2 py-2 font-medium">Referrals</th>
              <th className="px-2 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "h-10 cursor-pointer border-t border-border hover:bg-surface-2",
                  selectedId === row.id && "bg-primary-soft",
                )}
                onClick={() => toggleEmployee(row.id)}
              >
                <td className="px-2 py-1">
                  <Link
                    href={`/admin/employees/${row.id}`}
                    className="font-medium text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-2 py-1 tabular">{row.closed}</td>
                <td className="px-2 py-1">
                  <div className="h-2 max-w-[160px] rounded-full bg-surface-2">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${row.barPct}%` }}
                    />
                  </div>
                </td>
                <td className="px-2 py-1 tabular">
                  {row.connectedRate != null ? `${row.connectedRate}%` : "—"}
                </td>
                <td className="px-2 py-1 tabular">
                  {row.avgRating != null ? row.avgRating.toFixed(1) : "—"}
                </td>
                <td className="px-2 py-1 tabular">{row.referrals}</td>
                <td className="px-2 py-1 tabular">{row.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
