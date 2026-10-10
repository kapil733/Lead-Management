"use client";

import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { useTransition } from "react";
import { ContractEmployeeStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function EmployeeFilters({
  clients,
}: {
  clients: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const opts = { shallow: false as const, startTransition };
  const [q, setQ] = useQueryState("q", parseAsString.withDefault("").withOptions(opts));
  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault("").withOptions(opts),
  );
  const [clientId, setClientId] = useQueryState(
    "clientId",
    parseAsString.withDefault("").withOptions(opts),
  );
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions(opts),
  );

  return (
    <form
      className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="space-y-1">
        <Label htmlFor="pe-q">Search</Label>
        <Input
          id="pe-q"
          placeholder="Name, code, mobile"
          value={q}
          disabled={isPending}
          onChange={(e) => {
            void setQ(e.target.value || null);
            void setPage(1);
          }}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pe-status">Status</Label>
        <select
          id="pe-status"
          className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
          value={status}
          disabled={isPending}
          onChange={(e) => {
            void setStatus(e.target.value || null);
            void setPage(1);
          }}
        >
          <option value="">All</option>
          {Object.values(ContractEmployeeStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="pe-client">Client</Label>
        <select
          id="pe-client"
          className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
          value={clientId}
          disabled={isPending}
          onChange={(e) => {
            void setClientId(e.target.value || null);
            void setPage(1);
          }}
        >
          <option value="">All</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void setQ(null);
            void setStatus(null);
            void setClientId(null);
            void setPage(1);
          }}
        >
          Clear
        </Button>
      </div>
    </form>
  );
}
