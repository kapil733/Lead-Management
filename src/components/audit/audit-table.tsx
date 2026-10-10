"use client";

import { useTransition } from "react";
import { useQueryState, parseAsInteger } from "nuqs";
import { formatDisplayDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";

export type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  ip: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
};

export function AuditTable({
  rows,
  total,
  pageSize,
}: {
  rows: AuditRow[];
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
        <p className="text-sm font-medium">No audit events</p>
        <p className="text-sm text-muted">Try widening the date range.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-[13px] leading-[18px]">
          <thead className="sticky top-0 bg-surface-2 text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Actor</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Entity</th>
              <th className="px-3 py-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="h-10 border-t border-border hover:bg-surface-2"
              >
                <td className="whitespace-nowrap px-3 py-1 tabular text-muted">
                  {formatDisplayDateTime(row.createdAt)}
                </td>
                <td className="px-3 py-1">
                  {row.actor ? (
                    <div>
                      <div className="font-medium">{row.actor.name}</div>
                      <div className="text-xs text-muted">{row.actor.email}</div>
                    </div>
                  ) : (
                    <span className="text-muted">System</span>
                  )}
                </td>
                <td className="px-3 py-1 font-medium">{row.action}</td>
                <td className="px-3 py-1">
                  <span className="text-muted">{row.entityType}</span>{" "}
                  <span className="font-mono text-xs">{row.entityId.slice(0, 12)}…</span>
                </td>
                <td className="px-3 py-1 tabular text-muted">
                  {row.ip ?? "—"}
                </td>
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
  );
}
