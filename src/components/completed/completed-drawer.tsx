"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDisplayDateTime } from "@/lib/dates";
import { JoinedToggle } from "@/components/leads/joined-toggle";
import { RatingChip } from "@/components/leads/status-badge";
import type { CompletedRow } from "@/components/completed/completed-list";

export function CompletedDrawer({
  row,
  open,
  onOpenChange,
}: {
  row: CompletedRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{row.name ?? formatPhoneDisplay(row.phone)}</DialogTitle>
          <DialogDescription>
            Closed{" "}
            {row.closedAt ? formatDisplayDateTime(row.closedAt) : "—"}
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 text-sm">
          <Row label="Phone" value={formatPhoneDisplay(row.phone)} tabular />
          <Row
            label="Outcome"
            value={row.outcome?.replaceAll("_", " ") ?? "—"}
          />
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
            <dt className="mb-2 text-muted">
              Friends ({row.referrals.length})
            </dt>
            <dd>
              {row.referrals.length === 0 ? (
                <p className="text-muted">None recorded</p>
              ) : (
                <ul className="space-y-2">
                  {row.referrals.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-[var(--radius-control)] border border-border px-3 py-2"
                    >
                      <p className="font-medium">
                        {r.name ?? formatPhoneDisplay(r.phone)}
                      </p>
                      <p className="tabular text-muted">
                        {formatPhoneDisplay(r.phone)}
                      </p>
                      {(r.designation || r.experienceText) && (
                        <p className="text-xs text-muted">
                          {[r.designation, r.experienceText]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
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
      <dd className={tabular ? "tabular" : undefined}>{value}</dd>
    </div>
  );
}
