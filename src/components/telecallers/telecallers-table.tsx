"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { formatDisplayDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import {
  resetTelecallerPasswordAction,
  setTelecallerActiveAction,
} from "@/server/telecallers/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export type TelecallerRow = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  closedToday: number;
  hasOpenCase: boolean;
  closedTotal: number;
  avgRating: number | null;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] font-medium tracking-[0.1em] text-muted">
        {label.toUpperCase()}
      </p>
      <p className="mt-1.5 font-mono text-[22px] font-medium leading-none">
        {value}
      </p>
    </div>
  );
}

export function TelecallersTable({ rows }: { rows: TelecallerRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempEmail, setTempEmail] = useState<string | null>(null);

  function resetPassword(userId: string, name: string) {
    const ok = window.confirm(
      `Reset password for ${name}? They will need the new temporary password.`,
    );
    if (!ok) return;
    startTransition(async () => {
      const result = await resetTelecallerPasswordAction({ userId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setTempEmail(result.data.email);
      setTempPassword(result.data.tempPassword);
      toast.success("Password reset");
    });
  }

  function toggleActive(userId: string, name: string, isActive: boolean) {
    const next = !isActive;
    const ok = window.confirm(
      next
        ? `Reactivate ${name}?`
        : `Deactivate ${name}? They will not be able to sign in.`,
    );
    if (!ok) return;
    startTransition(async () => {
      const result = await setTelecallerActiveAction({
        userId,
        isActive: next,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(next ? "Activated" : "Deactivated");
    });
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface py-16 text-center shadow-[var(--shadow-card)]">
        <p className="text-sm font-medium">No telecallers yet</p>
        <p className="text-sm text-muted">Add one to start assigning cases.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const ini = row.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? "")
            .join("");
          return (
            <article
              key={row.id}
              className="rounded-[18px] border border-border bg-surface p-5"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex size-12 items-center justify-center rounded-full border border-border-strong bg-surface-2 font-display text-base font-bold text-accent-text">
                  {ini}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/employees/${row.id}`}
                      className="font-display text-lg font-bold hover:underline"
                    >
                      {row.name}
                    </Link>
                    {row.hasOpenCase ? (
                      <span className="rounded-full bg-info-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-info">
                        IN CASE
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[13px] text-muted">
                    {row.email}
                  </p>
                </div>
                <span
                  className={
                    row.isActive
                      ? "rounded-full bg-success-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-success"
                      : "rounded-full bg-danger-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-danger"
                  }
                >
                  {row.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-surface-2 p-3.5">
                <Stat label="Closed today" value={String(row.closedToday)} />
                <Stat label="Total closed" value={String(row.closedTotal)} />
                <Stat
                  label="Avg rating"
                  value={row.avgRating != null ? row.avgRating.toFixed(1) : "—"}
                />
              </div>
              <p className="mt-3.5 font-mono text-xs text-muted">
                Last login ·{" "}
                {row.lastLoginAt
                  ? formatDisplayDateTime(row.lastLoginAt)
                  : "Never"}
              </p>
              <div className="mt-4 flex gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  disabled={isPending}
                  onClick={() => resetPassword(row.id, row.name)}
                >
                  Reset password
                </Button>
                <Button
                  type="button"
                  variant={row.isActive ? "destructive" : "secondary"}
                  className="flex-1"
                  disabled={isPending}
                  onClick={() => toggleActive(row.id, row.name, row.isActive)}
                >
                  {row.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <Dialog
        open={tempPassword != null}
        onOpenChange={(open) => {
          if (!open) {
            setTempPassword(null);
            setTempEmail(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New temporary password</DialogTitle>
            <DialogDescription>
              For {tempEmail}. Copy now — it will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 py-3 font-mono text-sm tabular">
            {tempPassword}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                if (!tempPassword) return;
                try {
                  await navigator.clipboard.writeText(tempPassword);
                  toast.success("Copied");
                } catch {
                  toast.error("Could not copy");
                }
              }}
            >
              Copy
            </Button>
            <Button
              type="button"
              onClick={() => {
                setTempPassword(null);
                setTempEmail(null);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
