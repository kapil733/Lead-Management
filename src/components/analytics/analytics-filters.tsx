"use client";

import { useQueryStates, parseAsString, parseAsInteger } from "nuqs";
import { useTransition } from "react";
import { CallOutcome } from "@prisma/client";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const OUTCOMES = Object.values(CallOutcome);

export function AnalyticsFilters({
  employees,
  cities,
  trades,
  resolvedFrom,
  resolvedTo,
}: {
  employees: { id: string; name: string; isActive: boolean }[];
  cities: string[];
  trades: string[];
  resolvedFrom: string;
  resolvedTo: string;
}) {
  const [isPending, startTransition] = useTransition();
  const opts = { shallow: false as const, startTransition };

  const [state, setState] = useQueryStates(
    {
      from: parseAsString.withDefault(resolvedFrom),
      to: parseAsString.withDefault(resolvedTo),
      employeeId: parseAsString,
      outcome: parseAsString,
      rating: parseAsInteger,
      city: parseAsString,
      trade: parseAsString,
      hour: parseAsInteger,
      dow: parseAsInteger,
      page: parseAsInteger.withDefault(1),
    },
    opts,
  );

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (state.employeeId) {
    const emp = employees.find((e) => e.id === state.employeeId);
    chips.push({
      key: "employeeId",
      label: `Telecaller: ${emp?.name ?? "selected"}`,
      clear: () => void setState({ employeeId: null, page: 1 }),
    });
  }
  if (state.outcome) {
    chips.push({
      key: "outcome",
      label: `Outcome: ${state.outcome.replaceAll("_", " ")}`,
      clear: () => void setState({ outcome: null, page: 1 }),
    });
  }
  if (state.rating != null) {
    chips.push({
      key: "rating",
      label: `Rating: ${state.rating}`,
      clear: () => void setState({ rating: null, page: 1 }),
    });
  }
  if (state.city) {
    chips.push({
      key: "city",
      label: `City: ${state.city}`,
      clear: () => void setState({ city: null, page: 1 }),
    });
  }
  if (state.trade) {
    chips.push({
      key: "trade",
      label: `Trade: ${state.trade}`,
      clear: () => void setState({ trade: null, page: 1 }),
    });
  }
  if (state.hour != null) {
    chips.push({
      key: "hour",
      label: `Hour: ${String(state.hour).padStart(2, "0")}:00`,
      clear: () => void setState({ hour: null, page: 1 }),
    });
  }
  if (state.dow != null) {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    chips.push({
      key: "dow",
      label: `Day: ${labels[state.dow] ?? state.dow}`,
      clear: () => void setState({ dow: null, page: 1 }),
    });
  }

  return (
    <div className="sticky top-14 z-[5] -mx-6 space-y-3 border-b border-border bg-bg/95 px-6 py-3 backdrop-blur">
      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="space-y-1">
          <Label htmlFor="an-from">From</Label>
          <Input
            id="an-from"
            type="date"
            value={state.from}
            disabled={isPending}
            onChange={(e) =>
              void setState({ from: e.target.value || null, page: 1 })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="an-to">To</Label>
          <Input
            id="an-to"
            type="date"
            value={state.to}
            disabled={isPending}
            onChange={(e) =>
              void setState({ to: e.target.value || null, page: 1 })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="an-emp">Telecaller</Label>
          <select
            id="an-emp"
            className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
            value={state.employeeId ?? ""}
            disabled={isPending}
            onChange={(e) =>
              void setState({
                employeeId: e.target.value || null,
                page: 1,
              })
            }
          >
            <option value="">All</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {!e.isActive ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="an-outcome">Outcome</Label>
          <select
            id="an-outcome"
            className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
            value={state.outcome ?? ""}
            disabled={isPending}
            onChange={(e) =>
              void setState({
                outcome: e.target.value || null,
                page: 1,
              })
            }
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
          <Label htmlFor="an-rating">Rating</Label>
          <select
            id="an-rating"
            className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
            value={state.rating ?? ""}
            disabled={isPending}
            onChange={(e) =>
              void setState({
                rating: e.target.value ? Number(e.target.value) : null,
                page: 1,
              })
            }
          >
            <option value="">All</option>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="an-city">City</Label>
          <select
            id="an-city"
            className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
            value={state.city ?? ""}
            disabled={isPending}
            onChange={(e) =>
              void setState({ city: e.target.value || null, page: 1 })
            }
          >
            <option value="">All</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="an-trade">Trade</Label>
          <select
            id="an-trade"
            className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
            value={state.trade ?? ""}
            disabled={isPending}
            onChange={(e) =>
              void setState({ trade: e.target.value || null, page: 1 })
            }
          >
            <option value="">All</option>
            {trades.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={isPending}
            onClick={() =>
              void setState({
                from: resolvedFrom,
                to: resolvedTo,
                employeeId: null,
                outcome: null,
                rating: null,
                city: null,
                trade: null,
                hour: null,
                dow: null,
                page: 1,
              })
            }
          >
            Reset
          </Button>
        </div>
      </form>

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              className="inline-flex min-h-8 items-center gap-1 rounded-full bg-primary-soft px-3 text-xs font-medium text-primary"
            >
              {c.label}
              <X className="size-3" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
