"use client";

import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function AuditFilters({ actions }: { actions: string[] }) {
  const [isPending, startTransition] = useTransition();
  const opts = { shallow: false as const, startTransition };

  const [action, setAction] = useQueryState(
    "action",
    parseAsString.withDefault("").withOptions(opts),
  );
  const [from, setFrom] = useQueryState(
    "from",
    parseAsString.withDefault("").withOptions(opts),
  );
  const [to, setTo] = useQueryState(
    "to",
    parseAsString.withDefault("").withOptions(opts),
  );
  const [q, setQ] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions(opts),
  );
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions(opts),
  );

  return (
    <form
      className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-5"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="space-y-1">
        <Label htmlFor="audit-action">Action</Label>
        <select
          id="audit-action"
          className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
          value={action}
          disabled={isPending}
          onChange={(e) => {
            void setAction(e.target.value || null);
            void setPage(1);
          }}
        >
          <option value="">All</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="audit-from">From</Label>
        <Input
          id="audit-from"
          type="date"
          value={from}
          disabled={isPending}
          onChange={(e) => {
            void setFrom(e.target.value || null);
            void setPage(1);
          }}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="audit-to">To</Label>
        <Input
          id="audit-to"
          type="date"
          value={to}
          disabled={isPending}
          onChange={(e) => {
            void setTo(e.target.value || null);
            void setPage(1);
          }}
        />
      </div>
      <div className="space-y-1 lg:col-span-2">
        <Label htmlFor="audit-q">Search actor / entity</Label>
        <Input
          id="audit-q"
          placeholder="Name, email, or entity id"
          value={q}
          disabled={isPending}
          onChange={(e) => {
            void setQ(e.target.value || null);
            void setPage(1);
          }}
        />
      </div>
      <div className="flex items-end lg:col-span-5">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void setAction(null);
            void setFrom(null);
            void setTo(null);
            void setQ(null);
            void setPage(1);
          }}
        >
          Clear filters
        </Button>
      </div>
    </form>
  );
}
