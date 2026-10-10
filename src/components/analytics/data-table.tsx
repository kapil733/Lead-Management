"use client";

import Link from "next/link";
import { useQueryState, parseAsInteger } from "nuqs";
import { useTransition } from "react";
import type { CallOutcome } from "@prisma/client";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDisplayDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { RatingChip } from "@/components/leads/status-badge";
import { useAnalyticsCrossFilter } from "@/components/analytics/use-analytics-cross-filter";
import { ChartCard } from "@/components/analytics/chart-card";

export type DrillRow = {
  id: string;
  closedAt: string | null;
  outcome: CallOutcome | null;
  rating: number | null;
  durationSeconds: number | null;
  employeeName: string;
  employeeId: string;
  phone: string;
  leadName: string | null;
  leadId: string;
  city: string | null;
  trade: string | null;
  joined: boolean;
  referralsCount: number;
  remarks: string | null;
};

export function AnalyticsDataTable({
  rows,
  total,
  pageSize,
}: {
  rows: DrillRow[];
  total: number;
  pageSize: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({
      shallow: false,
      startTransition,
    }),
  );
  const { exportCsv } = useAnalyticsCrossFilter();

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <ChartCard
      title="Case detail"
      subtitle="Drill-through rows for current filters · export from ⋯"
      empty={rows.length === 0}
      emptyMessage="No cases match these filters"
      onExport={exportCsv}
    >
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] leading-[18px]">
            <thead className="bg-surface-2 text-xs">
              <tr>
                <th className="px-2 py-2 font-medium">Closed</th>
                <th className="px-2 py-2 font-medium">Telecaller</th>
                <th className="px-2 py-2 font-medium">Lead</th>
                <th className="px-2 py-2 font-medium">Outcome</th>
                <th className="px-2 py-2 font-medium">Rating</th>
                <th className="px-2 py-2 font-medium">Friends</th>
                <th className="px-2 py-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="h-10 border-t border-border hover:bg-surface-2"
                >
                  <td className="whitespace-nowrap px-2 py-1 tabular text-muted">
                    {row.closedAt
                      ? formatDisplayDateTime(row.closedAt)
                      : "—"}
                  </td>
                  <td className="px-2 py-1">
                    <Link
                      href={`/admin/employees/${row.employeeId}`}
                      className="text-primary hover:underline"
                    >
                      {row.employeeName}
                    </Link>
                  </td>
                  <td className="px-2 py-1">
                    <Link
                      href={`/admin/leads/${row.leadId}`}
                      className="hover:underline"
                    >
                      <div>{row.leadName ?? "—"}</div>
                      <div className="tabular text-xs text-muted">
                        {formatPhoneDisplay(row.phone)}
                      </div>
                    </Link>
                  </td>
                  <td className="px-2 py-1">
                    {row.outcome?.replaceAll("_", " ") ?? "—"}
                  </td>
                  <td className="px-2 py-1">
                    {row.rating != null ? (
                      <RatingChip rating={row.rating} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2 py-1 tabular">{row.referralsCount}</td>
                  <td className="px-2 py-1">{row.joined ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span className="tabular">
            {from}–{to} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page <= 1 || isPending}
              onClick={() => void setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || isPending}
              onClick={() => void setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
