"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDisplayDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { ReleaseDialog } from "@/components/dashboard/release-dialog";
import { cn } from "@/lib/utils";

export type LiveCase = {
  id: string;
  startedAt: string;
  ageMinutes: number;
  stale: boolean;
  callClicked: boolean;
  employee: { id: string; name: string; email: string };
  lead: {
    id: string;
    phone: string;
    name: string | null;
    city: string | null;
    trade: string | null;
  };
};

export function LiveActivity({
  cases,
  staleCaseMinutes,
}: {
  cases: LiveCase[];
  staleCaseMinutes: number;
}) {
  const router = useRouter();
  const [releaseId, setReleaseId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [router]);

  const selected = cases.find((c) => c.id === releaseId) ?? null;

  return (
    <div className="flex h-full flex-col rounded-[18px] border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-bold">Live activity</p>
          <p className="mt-1 font-mono text-xs leading-relaxed text-muted">
            Open cases · stale after {staleCaseMinutes} min · refreshes every
            30s
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => router.refresh()}
        >
          Refresh
        </Button>
      </div>

      {cases.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted">
          No open cases right now
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {cases.map((c) => (
            <li
              key={c.id}
              className={cn(
                "rounded-[14px] border border-border bg-surface-2 p-4",
                c.stale && "border-danger",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{c.employee.name}</p>
                  {c.stale ? (
                    <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs text-danger">
                      Stale
                    </span>
                  ) : (
                    <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs text-info">
                      Active
                    </span>
                  )}
                  {!c.callClicked ? (
                    <span className="rounded-full bg-border px-2 py-0.5 font-mono text-[11px] font-semibold text-muted">
                      No call yet
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted">
                  {c.lead.name ?? "Lead"} ·{" "}
                  <span className="tabular">
                    {formatPhoneDisplay(c.lead.phone)}
                  </span>
                  {c.lead.city ? ` · ${c.lead.city}` : ""}
                </p>
                <div className="mt-4 flex justify-between font-mono text-xs text-muted">
                  <span>Started {formatDisplayDateTime(c.startedAt)}</span>
                  <span>
                    {c.ageMinutes} / {staleCaseMinutes} min
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      c.stale ? "bg-danger" : "bg-info",
                    )}
                    style={{
                      width: `${Math.min(100, Math.round((c.ageMinutes / staleCaseMinutes) * 100))}%`,
                    }}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mt-4 w-full"
                onClick={() => setReleaseId(c.id)}
              >
                Release case
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ReleaseDialog
        caseId={releaseId}
        employeeName={selected?.employee.name ?? "telecaller"}
        open={releaseId != null}
        onOpenChange={(open) => {
          if (!open) setReleaseId(null);
        }}
      />
    </div>
  );
}
