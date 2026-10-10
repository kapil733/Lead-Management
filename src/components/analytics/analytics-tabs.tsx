"use client";

import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  "overview",
  "telecallers",
  "referrals",
  "time",
  "data",
] as const;

const LABELS: Record<(typeof TABS)[number], string> = {
  overview: "Overview",
  telecallers: "Telecallers",
  referrals: "Referrals & Joined",
  time: "Time patterns",
  data: "Data",
};

export function AnalyticsTabs() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TABS).withDefault("overview").withOptions({
      shallow: false,
      startTransition,
    }),
  );

  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="tablist"
      aria-label="Analytics tabs"
    >
      {TABS.map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={tab === t}
          disabled={isPending}
          onClick={() => void setTab(t)}
          className={cn(
            "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
            tab === t
              ? "border-primary bg-primary font-semibold text-primary-fg"
              : "border-border-strong text-muted hover:text-text",
          )}
        >
          {LABELS[t]}
        </button>
      ))}
    </div>
  );
}
