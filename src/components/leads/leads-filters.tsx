"use client";

import { useQueryStates, parseAsString, parseAsStringEnum } from "nuqs";
import { useTransition } from "react";
import { LeadSource, LeadStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const statusValues = Object.values(LeadStatus);
const sourceValues = Object.values(LeadSource);

export function LeadsFilters({
  importBatches,
}: {
  importBatches: Array<{ id: string; fileName: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useQueryStates(
    {
      status: parseAsStringEnum(statusValues),
      source: parseAsStringEnum(sourceValues),
      joined: parseAsStringEnum(["all", "yes", "no"] as const).withDefault(
        "all",
      ),
      importBatchId: parseAsString,
      q: parseAsString.withDefault(""),
      page: parseAsString.withDefault("1"),
    },
    {
      history: "push",
      shallow: false,
      startTransition,
    },
  );

  function exportCsv() {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.source) params.set("source", filters.source);
    if (filters.joined && filters.joined !== "all") {
      params.set("joined", filters.joined);
    }
    if (filters.importBatchId) {
      params.set("importBatchId", filters.importBatchId);
    }
    if (filters.q) params.set("q", filters.q);
    // API route download (not an App Router page navigation)
    const a = document.createElement("a");
    a.href = `/api/admin/leads/export?${params.toString()}`;
    a.download = "leads-export.csv";
    a.click();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs text-muted">Search</label>
          <Input
            placeholder="Phone or name"
            value={filters.q ?? ""}
            onChange={(e) =>
              void setFilters({ q: e.target.value || null, page: "1" })
            }
          />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs text-muted">Status</label>
          <Select
            value={filters.status ?? ""}
            onChange={(e) =>
              void setFilters({
                status: (e.target.value || null) as LeadStatus | null,
                page: "1",
              })
            }
          >
            <option value="">All</option>
            {statusValues.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-36">
          <label className="mb-1 block text-xs text-muted">Source</label>
          <Select
            value={filters.source ?? ""}
            onChange={(e) =>
              void setFilters({
                source: (e.target.value || null) as LeadSource | null,
                page: "1",
              })
            }
          >
            <option value="">All</option>
            {sourceValues.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-32">
          <label className="mb-1 block text-xs text-muted">Joined</label>
          <Select
            value={filters.joined ?? "all"}
            onChange={(e) =>
              void setFilters({
                joined: e.target.value as "all" | "yes" | "no",
                page: "1",
              })
            }
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs text-muted">Import batch</label>
          <Select
            value={filters.importBatchId ?? ""}
            onChange={(e) =>
              void setFilters({
                importBatchId: e.target.value || null,
                page: "1",
              })
            }
          >
            <option value="">All batches</option>
            {importBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.fileName}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={exportCsv}
          disabled={isPending}
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>
      {isPending ? (
        <p className="text-xs text-muted">Updating…</p>
      ) : null}
    </div>
  );
}
