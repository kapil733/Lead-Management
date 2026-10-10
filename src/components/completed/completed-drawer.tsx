"use client";

import { useEffect, useState } from "react";
import { CallOutcome } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDisplayDateTime } from "@/lib/dates";
import { outcomeLabel } from "@/lib/outcomes";
import { JoinedToggle } from "@/components/leads/joined-toggle";
import { RatingChip } from "@/components/leads/status-badge";
import { openCompletedCaseAction } from "@/server/cases/actions";
import { OpenReconnectButton } from "@/components/completed/open-reconnect-button";

type OpenedCase = {
  id: string;
  closedAt: string | null;
  outcome: CallOutcome | null;
  rating: number | null;
  remarks: string | null;
  leadId: string;
  phone: string;
  name: string | null;
  joined: boolean;
  friends: {
    id: string;
    name: string | null;
    designation: string | null;
    experienceText: string | null;
  }[];
};

export function CompletedDrawer({
  caseId,
  open,
  onOpenChange,
}: {
  caseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {caseId ? <OpenedCaseBody key={caseId} caseId={caseId} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function OpenedCaseBody({ caseId }: { caseId: string }) {
  const [row, setRow] = useState<OpenedCase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void openCompletedCaseAction(caseId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setRow(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{row?.name ?? "This call"}</DialogTitle>
        <DialogDescription>
          {row?.closedAt
            ? `Closed ${formatDisplayDateTime(row.closedAt)}`
            : "Opening this call"}
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : !row ? (
        <p className="text-sm text-muted">Loading this call…</p>
      ) : (
        <dl className="space-y-3 text-sm">
            {row.outcome === CallOutcome.CALL_BACK_LATER ? (
              <OpenReconnectButton caseId={row.id} className="min-h-11 w-full" />
            ) : null}
            <Row label="Phone" value={formatPhoneDisplay(row.phone)} tabular />
          <Row label="Outcome" value={outcomeLabel(row.outcome)} />
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Rating</dt>
            <dd>
              {row.rating != null ? <RatingChip rating={row.rating} /> : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Joined</dt>
            <dd>
              <JoinedToggle
                leadId={row.leadId}
                joined={row.joined}
                mode="employee"
              />
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-muted">Remarks</dt>
            <dd className="rounded-[var(--radius-control)] bg-surface-2 p-3 text-sm">
              {row.remarks?.trim() ? row.remarks : "—"}
            </dd>
          </div>
          <div>
            <dt className="mb-2 text-muted">Friends ({row.friends.length})</dt>
            <dd>
              {row.friends.length === 0 ? (
                <p className="text-muted">None recorded</p>
              ) : (
                <ul className="space-y-2">
                  {row.friends.map((friend) => (
                    <li
                      key={friend.id}
                      className="rounded-[var(--radius-control)] border border-border px-3 py-2"
                    >
                      <p className="font-medium">
                        {friend.name?.trim() || "Friend"}
                      </p>
                      {friend.designation || friend.experienceText ? (
                        <p className="text-xs text-muted">
                          {[friend.designation, friend.experienceText]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>
      )}
    </>
  );
}

function Row({
  label,
  value,
  tabular,
}: {
  label: string;
  value: string;
  tabular?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={tabular ? "phone-no-select tabular" : undefined}>{value}</dd>
    </div>
  );
}
