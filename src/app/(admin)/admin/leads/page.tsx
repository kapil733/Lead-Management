import Link from "next/link";
import { LeadSource, LeadStatus } from "@prisma/client";
import { listLeads } from "@/server/leads/queries";
import { listImportBatches } from "@/server/leads/import-batch";
import { leadListFiltersSchema } from "@/lib/validators/leads";
import { LeadsFilters } from "@/components/leads/leads-filters";
import { LeadsTable } from "@/components/leads/leads-table";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const get = (key: string) => {
    const v = raw[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const statusRaw = get("status");
  const sourceRaw = get("source");
  const filters = leadListFiltersSchema.parse({
    status:
      statusRaw && Object.values(LeadStatus).includes(statusRaw as LeadStatus)
        ? statusRaw
        : undefined,
    source:
      sourceRaw && Object.values(LeadSource).includes(sourceRaw as LeadSource)
        ? sourceRaw
        : undefined,
    joined: get("joined") ?? "all",
    importBatchId: get("importBatchId") || undefined,
    q: get("q") || undefined,
    page: get("page") ?? "1",
    pageSize: "25",
  });

  const [result, batches] = await Promise.all([
    listLeads(filters),
    listImportBatches(),
  ]);

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Recruitment · pool and history"
        title="Leads"
        description="Imported and referred technicians, one row per phone number."
        actions={
          <Button asChild>
            <Link href="/admin/leads/import">
              <Upload className="size-4" />
              Import
            </Link>
          </Button>
        }
      />

      <LeadsFilters
        importBatches={batches.map((b) => ({
          id: b.id,
          fileName: b.fileName,
        }))}
      />

      <LeadsTable
        rows={result.rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
        total={result.total}
        pageSize={result.pageSize}
      />
    </div>
  );
}
