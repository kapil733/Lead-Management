"use client";

import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const PERIODS = ["today", "7d", "30d"] as const;

const LABELS: Record<(typeof PERIODS)[number], string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
};

export function PeriodToggle() {
  const [isPending, startTransition] = useTransition();
  const [period, setPeriod] = useQueryState(
    "period",
    parseAsStringLiteral(PERIODS).withDefault("30d").withOptions({
      shallow: false,
      startTransition,
    }),
  );

  return (
    <div
      className="inline-flex rounded-xl border border-border bg-surface p-1"
      role="group"
      aria-label="Period"
    >
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          disabled={isPending}
          onClick={() => void setPeriod(p)}
          className={cn(
            "min-h-9 rounded-[9px] px-4 text-sm font-semibold transition-colors",
            period === p
              ? "bg-primary text-primary-fg"
              : "text-muted hover:text-text",
          )}
        >
          {LABELS[p]}
        </button>
      ))}
    </div>
  );
}
