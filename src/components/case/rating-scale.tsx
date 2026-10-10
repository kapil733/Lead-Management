"use client";

import { cn } from "@/lib/utils";

const CAPTIONS: Record<number, string> = {
  0: "Not interested, no referrals",
  1: "Not interested, no referrals",
  2: "Maybe later",
  3: "Interested",
  4: "Keen to join",
  5: "Will join and bring friends",
};

const COLORS = [
  "var(--rating-0)",
  "var(--rating-1)",
  "var(--rating-2)",
  "var(--rating-3)",
  "var(--rating-4)",
  "var(--rating-5)",
];

export function RatingScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "flex size-11 items-center justify-center rounded-[var(--radius-control)] border-2 text-base font-semibold tabular transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selected ? "text-white" : "bg-surface",
              )}
              style={{
                borderColor: COLORS[n],
                backgroundColor: selected ? COLORS[n] : undefined,
                color: selected ? "#fff" : COLORS[n],
              }}
              aria-pressed={selected}
              aria-label={`Rating ${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        {value == null
          ? "Select interest rating 0–5"
          : CAPTIONS[value] ?? ""}
      </p>
    </div>
  );
}
