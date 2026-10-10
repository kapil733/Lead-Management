"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  COLUMN_TARGET_OPTIONS,
  type ColumnTarget,
} from "@/lib/validators/leads";

const BASE_STEPS = ["Upload", "Map columns", "Review", "Done"] as const;

type CitySection = { name: string; count: number };

const TARGET_OPTIONS = COLUMN_TARGET_OPTIONS;

type ReviewSummary = {
  fileName: string;
  totalRows: number;
  validNewCount: number;
  duplicatesCount: number;
  invalidCount: number;
  previewValid: Array<{
    rowNumber: number;
    phone: string | null;
    name: string | null;
    city: string | null;
    trade: string | null;
    experienceYears: number | null;
  }>;
};

type DoneSummary = {
  batchId: string;
  imported: number;
  duplicates: number;
  invalid: number;
  totalRows: number;
};

export function ImportWizard({ onImported }: { onImported?: () => void }) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState<Record<string, ColumnTarget>>({});
  const [sections, setSections] = useState<CitySection[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [review, setReview] = useState<ReviewSummary | null>(null);
  const [done, setDone] = useState<DoneSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneMapped = useMemo(
    () => Object.values(mapping).includes("phone"),
    [mapping],
  );
  const hasCities = sections.length > 0;
  const reviewStep = hasCities ? 3 : 2;
  const doneStep = hasCities ? 4 : 3;
  const steps = hasCities
    ? ["Upload", "Map columns", "Cities", "Review", "Done"]
    : BASE_STEPS;
  const selectedLeadCount = sections
    .filter((section) => selectedCities.includes(section.name))
    .reduce((sum, section) => sum + section.count, 0);

  function appendCities(form: FormData) {
    if (sections.length > 0) {
      form.set("cities", JSON.stringify(selectedCities));
    }
  }

  async function handleParse(selected: File) {
    setError(null);
    setPending(true);
    try {
      const form = new FormData();
      form.set("file", selected);
      const res = await fetch("/api/admin/leads/import/parse", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: { message: string };
        data?: {
          fileName: string;
          headers: string[];
          previewRows: string[][];
          totalRows: number;
          sections?: CitySection[];
          suggestedMapping: Record<string, ColumnTarget>;
        };
      };
      if (!json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to parse file");
        return;
      }
      setFile(selected);
      setHeaders(json.data.headers);
      setPreviewRows(json.data.previewRows);
      setTotalRows(json.data.totalRows);
      setMapping(json.data.suggestedMapping);
      const found = json.data.sections ?? [];
      setSections(found);
      setSelectedCities(found.map((section) => section.name));
      setStep(1);
    } catch {
      setError("Failed to parse file");
    } finally {
      setPending(false);
    }
  }

  async function handleReview() {
    if (!file || !phoneMapped) return;
    if (sections.length > 0 && selectedCities.length === 0) {
      setError("Select at least one city");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("mapping", JSON.stringify(mapping));
      appendCities(form);
      const res = await fetch("/api/admin/leads/import/review", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: { message: string };
        data?: ReviewSummary;
      };
      if (!json.ok || !json.data) {
        setError(json.error?.message ?? "Review failed");
        return;
      }
      setReview(json.data);
      setStep(reviewStep);
    } catch {
      setError("Review failed");
    } finally {
      setPending(false);
    }
  }

  async function handleCommit() {
    if (!file) return;
    setError(null);
    setPending(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("mapping", JSON.stringify(mapping));
      appendCities(form);
      const res = await fetch("/api/admin/leads/import/commit", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: { message: string };
        data?: DoneSummary;
      };
      if (!json.ok || !json.data) {
        setError(json.error?.message ?? "Import failed");
        return;
      }
      setDone(json.data);
      setStep(doneStep);
      toast.success(`Imported ${json.data.imported} leads`);
      onImported?.();
    } catch {
      setError("Import failed");
    } finally {
      setPending(false);
    }
  }

  async function downloadErrors() {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    form.set("mapping", JSON.stringify(mapping));
    appendCities(form);
    const res = await fetch("/api/admin/leads/import/errors", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      toast.error("Could not download error report");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lead-import-errors.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetWizard() {
    setStep(0);
    setFile(null);
    setHeaders([]);
    setPreviewRows([]);
    setTotalRows(0);
    setSections([]);
    setSelectedCities([]);
    setMapping({});
    setReview(null);
    setDone(null);
    setError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import leads</CardTitle>
        <CardDescription>
          Upload an Excel or CSV file (max 4 MB / 20,000 rows). A sheet with
          one table per city lets you pick which cities to add.
        </CardDescription>
        <ol className="mt-4 flex flex-wrap gap-2">
          {steps.map((label, i) => (
            <li
              key={label}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                i === step
                  ? "bg-primary text-primary-fg"
                  : i < step
                    ? "bg-primary-soft text-primary"
                    : "bg-surface-2 text-muted",
              )}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {step === 0 ? (
          <div className="space-y-4">
            <a
              href="/api/admin/leads/import/template"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Download className="size-4" />
              Download sample template
            </a>
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-border bg-surface-2 px-6 py-16 text-center transition-colors hover:border-primary hover:bg-primary-soft",
                pending && "pointer-events-none opacity-60",
              )}
            >
              <Upload className="size-10 text-muted" />
              <div>
                <p className="text-sm font-medium text-text">
                  Drop .xlsx or .csv here, or click to browse
                </p>
                <p className="mt-1 text-xs text-muted">
                  Max 4 MB · up to 20,000 data rows
                </p>
              </div>
              <input
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="sr-only"
                disabled={pending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleParse(f);
                }}
              />
              {pending ? (
                <Loader2 className="size-5 animate-spin text-primary" />
              ) : null}
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              <FileSpreadsheet className="mr-1 inline size-4" />
              {file?.name} · {totalRows.toLocaleString()} rows
              {hasCities
                ? ` · ${sections.length} city tables`
                : ""}
            </p>
            <div className="overflow-x-auto rounded-[var(--radius-control)] border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 text-xs">
                  <tr>
                    <th className="px-3 py-2 font-medium">Detected column</th>
                    <th className="px-3 py-2 font-medium">Map to</th>
                    <th className="px-3 py-2 font-medium">Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header, hi) => (
                    <tr key={header} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{header}</td>
                      <td className="min-w-[240px] px-3 py-2">
                        <Select
                          className="min-w-[220px]"
                          value={mapping[header] ?? "ignore"}
                          onChange={(e) =>
                            setMapping((m) => ({
                              ...m,
                              [header]: e.target.value as ColumnTarget,
                            }))
                          }
                        >
                          {TARGET_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-muted tabular">
                        {previewRows[0]?.[hi] ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!phoneMapped ? (
              <p className="text-sm text-danger">
                Map at least one column to Phone to continue.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(0)}
                disabled={pending}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (hasCities) setStep(2);
                  else void handleReview();
                }}
                disabled={!phoneMapped || pending}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Next
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 && hasCities ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted">
                {selectedCities.length} of {sections.length} cities ·{" "}
                {selectedLeadCount.toLocaleString()} leads
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setSelectedCities(sections.map((section) => section.name))
                  }
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedCities([])}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((section) => {
                const checked = selectedCities.includes(section.name);
                return (
                  <label
                    key={section.name}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-control)] border px-3 py-2 text-sm",
                      checked
                        ? "border-primary bg-primary-soft"
                        : "border-border bg-surface",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={checked}
                        onChange={() =>
                          setSelectedCities((current) =>
                            checked
                              ? current.filter((name) => name !== section.name)
                              : [...current, section.name],
                          )
                        }
                      />
                      <span className="font-medium">{section.name}</span>
                    </span>
                    <span className="tabular text-muted">{section.count}</span>
                  </label>
                );
              })}
            </div>
            {selectedCities.length === 0 ? (
              <p className="text-sm text-danger">
                Select at least one city to continue.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                disabled={pending}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => void handleReview()}
                disabled={selectedCities.length === 0 || pending}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Next
              </Button>
            </div>
          </div>
        ) : null}

        {step === reviewStep && review ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <SummaryCard label="Total rows" value={review.totalRows} />
              <SummaryCard
                label="Valid new"
                value={review.validNewCount}
                tone="success"
              />
              <SummaryCard
                label="Duplicates"
                value={review.duplicatesCount}
                tone="warning"
              />
              <SummaryCard
                label="Invalid"
                value={review.invalidCount}
                tone="danger"
              />
            </div>
            <div className="overflow-x-auto rounded-[var(--radius-control)] border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 text-xs">
                  <tr>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">City</th>
                    <th className="px-3 py-2">Trade</th>
                    <th className="px-3 py-2">Exp</th>
                  </tr>
                </thead>
                <tbody>
                  {review.previewValid.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-muted"
                      >
                        No valid new rows to import.
                      </td>
                    </tr>
                  ) : (
                    review.previewValid.map((r) => (
                      <tr key={r.rowNumber} className="border-t border-border">
                        <td className="px-3 py-2 tabular">{r.phone}</td>
                        <td className="px-3 py-2">{r.name ?? "—"}</td>
                        <td className="px-3 py-2">{r.city ?? "—"}</td>
                        <td className="px-3 py-2">{r.trade ?? "—"}</td>
                        <td className="px-3 py-2 tabular">
                          {r.experienceYears ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(hasCities ? 2 : 1)}
                disabled={pending}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void downloadErrors()}
                disabled={pending}
              >
                <Download className="size-4" />
                Download error report (.xlsx)
              </Button>
              <Button
                type="button"
                onClick={() => void handleCommit()}
                disabled={pending || review.validNewCount === 0}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Import {review.validNewCount.toLocaleString()} leads
              </Button>
            </div>
          </div>
        ) : null}

        {step === doneStep && done ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <div>
              <p className="text-lg font-semibold">Import complete</p>
              <p className="text-sm text-muted">
                Imported {done.imported.toLocaleString()} of{" "}
                {done.totalRows.toLocaleString()} rows ·{" "}
                {done.duplicates.toLocaleString()} duplicates ·{" "}
                {done.invalid.toLocaleString()} invalid
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/admin/leads">View leads</Link>
              </Button>
              <Button type="button" variant="secondary" onClick={resetWizard}>
                Import another
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular",
          tone === "success" && "text-success-strong",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger",
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
