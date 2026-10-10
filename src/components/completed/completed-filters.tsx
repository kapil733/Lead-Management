"use client";

import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { useTransition } from "react";
import { CallOutcome } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const OUTCOMES = Object.values(CallOutcome);

export function CompletedFilters() {
  const [isPending, startTransition] = useTransition();
  const opts = { shallow: false as const, startTransition };

  const [q, setQ] = useQueryState("q", parseAsString.withDefault("").withOptions(opts));
  const [from, setFrom] = useQueryState(
    "from",
    parseAsString.withDefault("").withOptions(opts),
  );
  const [to, setTo] = useQueryState(
    "to",
    parseAsString.withDefault("").withOptions(opts),
  );
  const [outcome, setOutcome] = useQueryState(
    "outcome",
    parseAsString.withDefault("").withOptions(opts),
  );
  const [rating, setRating] = useQueryState(
    "rating",
    parseAsString.withDefault("").withOptions(opts),
  );
  const [joined, setJoined] = useQueryState(
    "joined",
    parseAsString.withDefault("all").withOptions(opts),
  );
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions(opts),
  );

  function resetPage() {
    void setPage(1);
  }

  return (
    <form
      className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-6"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="space-y-1 lg:col-span-2">
        <Label htmlFor="completed-q">Search</Label>
        <Input
          id="completed-q"
          placeholder="Name or phone"
          value={q}
          onChange={(e) => {
            void setQ(e.target.value || null);
            resetPage();
          }}
          disabled={isPending}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="completed-from">From</Label>
        <Input
          id="completed-from"
          type="date"
          value={from}
          onChange={(e) => {
            void setFrom(e.target.value || null);
            resetPage();
          }}
          disabled={isPending}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="completed-to">To</Label>
        <Input
          id="completed-to"
          type="date"
          value={to}
          onChange={(e) => {
            void setTo(e.target.value || null);
            resetPage();
          }}
          disabled={isPending}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="completed-outcome">Outcome</Label>
        <select
          id="completed-outcome"
          className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
          value={outcome}
          onChange={(e) => {
            void setOutcome(e.target.value || null);
            resetPage();
          }}
          disabled={isPending}
        >
          <option value="">All</option>
          {OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="completed-rating">Rating</Label>
        <select
          id="completed-rating"
          className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
          value={rating}
          onChange={(e) => {
            void setRating(e.target.value || null);
            resetPage();
          }}
          disabled={isPending}
        >
          <option value="">All</option>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="completed-joined">Joined</Label>
        <select
          id="completed-joined"
          className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
          value={joined}
          onChange={(e) => {
            void setJoined(e.target.value === "all" ? null : e.target.value);
            resetPage();
          }}
          disabled={isPending}
        >
          <option value="all">All</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      <div className="flex items-end lg:col-span-6">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void setQ(null);
            void setFrom(null);
            void setTo(null);
            void setOutcome(null);
            void setRating(null);
            void setJoined(null);
            void setPage(1);
          }}
        >
          Clear filters
        </Button>
      </div>
    </form>
  );
}
