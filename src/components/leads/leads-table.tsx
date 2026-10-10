"use client";

import Link from "next/link";
import { useQueryState, parseAsInteger } from "nuqs";
import { useTransition } from "react";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDisplayDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { JoinedToggle } from "@/components/leads/joined-toggle";
import {
  LeadSourceBadge,
  LeadStatusBadge,
  RatingChip,
} from "@/components/leads/status-badge";
import type { LeadSource, LeadStatus } from "@prisma/client";

export type LeadListRow = {
  id: string;
  phone: string;
  name: string | null;
  city: string | null;
  trade: string | null;
  source: LeadSource;
  status: LeadStatus;
  attempts: number;
  joined: boolean;
  createdAt: string;
  lastRating: number | null;
};

export function LeadsTable({
  rows,
  total,
  pageSize,
}: {
  rows: LeadListRow[];
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

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface py-16 text-center shadow-[var(--shadow-card)]">
        <p className="text-sm font-medium">No leads match these filters</p>
        <p className="text-sm text-muted">
          Try clearing filters or import a new sheet.
        </p>
        <Button asChild>
          <Link href="/admin/leads/import">Import leads</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-[13px] leading-[18px]">
          <thead className="sticky top-0 bg-surface-2 text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">City</th>
              <th className="px-3 py-2 font-medium">Trade</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Attempts</th>
              <th className="px-3 py-2 font-medium">Last rating</th>
              <th className="px-3 py-2 font-medium">Joined</th>
              <th className="px-3 py-2 font-medium">Imported on</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="h-10 border-t border-border hover:bg-surface-2"
              >
                <td className="px-3 py-1">
                  <Link
                    href={`/admin/leads/${row.id}`}
                    className="font-medium text-primary tabular hover:underline"
                  >
                    {formatPhoneDisplay(row.phone)}
                  </Link>
                </td>
                <td className="px-3 py-1">
                  <Link href={`/admin/leads/${row.id}`} className="hover:underline">
                    {row.name ?? "—"}
                  </Link>
                </td>
                <td className="px-3 py-1 text-muted">{row.city ?? "—"}</td>
                <td className="px-3 py-1 text-muted">{row.trade ?? "—"}</td>
                <td className="px-3 py-1">
                  <LeadSourceBadge source={row.source} />
                </td>
                <td className="px-3 py-1">
                  <LeadStatusBadge status={row.status} />
                </td>
                <td className="px-3 py-1 tabular">{row.attempts}</td>
                <td className="px-3 py-1">
                  <RatingChip rating={row.lastRating} />
                </td>
                <td className="px-3 py-1">
                  <JoinedToggle leadId={row.id} joined={row.joined} />
                </td>
                <td className="px-3 py-1 tabular text-muted">
                  {formatDisplayDate(row.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span className="tabular">
          {from}–{to} of {total.toLocaleString()}
          {isPending ? " · Updating…" : ""}
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
  );
}
