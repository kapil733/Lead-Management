"use client";

import { useState, useTransition } from "react";
import { useQueryState, parseAsInteger } from "nuqs";
import { CallOutcome } from "@prisma/client";
import { formatDisplayDateTime } from "@/lib/dates";
import { outcomeLabel } from "@/lib/outcomes";
import { JoinedToggle } from "@/components/leads/joined-toggle";
import { RatingChip } from "@/components/leads/status-badge";
import { Button } from "@/components/ui/button";
import { CompletedDrawer } from "@/components/completed/completed-drawer";
import { OpenReconnectButton } from "@/components/completed/open-reconnect-button";

export type CompletedRow = {
  id: string;
  closedAt: string | null;
  outcome: CallOutcome | null;
  rating: number | null;
  remarks: string | null;
  durationSeconds: number | null;
  friendsCount: number;
  leadId: string;
  name: string | null;
  joined: boolean;
};

export function CompletedList({
  rows,
  total,
  pageSize,
}: {
  rows: CompletedRow[];
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface py-16 text-center shadow-[var(--shadow-card)]">
        <p className="text-sm font-medium">No completed cases yet</p>
        <p className="text-sm text-muted">
          Close a case from Home to see it here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div
            key={row.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedId(row.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedId(row.id);
              }
            }}
            className="w-full rounded-[var(--radius-card)] border border-border bg-surface p-4 text-left shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{row.name ?? "Unnamed"}</p>
                <p className="text-xs text-muted tabular">
                  {row.closedAt ? formatDisplayDateTime(row.closedAt) : "—"}
                </p>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <JoinedToggle
                  leadId={row.leadId}
                  joined={row.joined}
                  mode="employee"
                />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-surface-2 px-2 py-0.5">
                {outcomeLabel(row.outcome)}
              </span>
              {row.rating != null ? <RatingChip rating={row.rating} /> : null}
              <span className="text-muted">{row.friendsCount} friends</span>
            </div>
            {row.remarks ? (
              <p className="mt-2 line-clamp-2 text-xs text-muted">
                {row.remarks}
              </p>
            ) : null}
            {row.outcome === CallOutcome.CALL_BACK_LATER ? (
              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                <OpenReconnect id={row.id} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="hidden space-y-3 md:block">
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full text-left text-[13px] leading-[18px]">
            <thead className="sticky top-0 bg-surface-2 text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">Closed</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Outcome</th>
                <th className="px-3 py-2 font-medium">Rating</th>
                <th className="px-3 py-2 font-medium">Friends</th>
                <th className="px-3 py-2 font-medium">Joined</th>
                <th className="px-3 py-2 font-medium">Remarks</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="h-10 cursor-pointer border-t border-border hover:bg-surface-2"
                  onClick={() => setSelectedId(row.id)}
                >
                  <td className="px-3 py-1 tabular text-muted">
                    {row.closedAt ? formatDisplayDateTime(row.closedAt) : "—"}
                  </td>
                  <td className="px-3 py-1">{row.name ?? "Unnamed"}</td>
                  <td className="px-3 py-1">{outcomeLabel(row.outcome)}</td>
                  <td className="px-3 py-1">
                    {row.rating != null ? (
                      <RatingChip rating={row.rating} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-1 tabular">{row.friendsCount}</td>
                  <td
                    className="px-3 py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <JoinedToggle
                      leadId={row.leadId}
                      joined={row.joined}
                      mode="employee"
                    />
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-1 text-muted">
                    {row.remarks ?? "—"}
                  </td>
                  <td
                    className="px-3 py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {row.outcome === CallOutcome.CALL_BACK_LATER ? (
                      <OpenReconnect id={row.id} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      <CompletedDrawer
        caseId={selectedId}
        open={selectedId != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </>
  );
}

function OpenReconnect({ id }: { id: string }) {
  return <OpenReconnectButton caseId={id} />;
}
