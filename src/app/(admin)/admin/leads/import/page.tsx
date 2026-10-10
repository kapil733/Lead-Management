import { listImportBatches } from "@/server/leads/import-batch";
import { ImportLeadsClient } from "@/components/leads/import-leads-client";
import { PageIntro } from "@/components/shared/page-intro";

export default async function ImportLeadsPage() {
  const batches = await listImportBatches();
  const serialized = batches.map((b) => ({
    id: b.id,
    fileName: b.fileName,
    totalRows: b.totalRows,
    imported: b.imported,
    duplicates: b.duplicates,
    invalid: b.invalid,
    createdAt: b.createdAt.toISOString(),
    revertedAt: b.revertedAt?.toISOString() ?? null,
    uploadedByName: b.uploadedBy.name,
    leadCount: b._count.leads,
  }));

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Recruitment · refill the pool"
        title="Import leads"
        description="Upload a spreadsheet. Every import becomes a batch you can filter in Leads and trace in the audit log."
      />
      <ImportLeadsClient batches={serialized} />
    </div>
  );
}
