import { listAuditLogs } from "@/server/audit/queries";
import { auditFiltersSchema } from "@/lib/validators/audit";
import { AuditFilters } from "@/components/audit/audit-filters";
import { AuditTable } from "@/components/audit/audit-table";
import { PageIntro } from "@/components/shared/page-intro";

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const get = (key: string) => {
    const v = raw[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const filters = auditFiltersSchema.parse({
    action: get("action") || undefined,
    from: get("from") || undefined,
    to: get("to") || undefined,
    q: get("q") || undefined,
    page: get("page") ?? "1",
    pageSize: "50",
  });

  const result = await listAuditLogs(filters);

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Recruitment · immutable trail"
        title="Audit log"
        description="Claims, closes, imports, joined toggles and user admin actions."
      />

      <AuditFilters actions={result.actionOptions} />

      <AuditTable
        rows={result.rows.map((r) => ({
          id: r.id,
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId,
          ip: r.ip,
          createdAt: r.createdAt.toISOString(),
          actor: r.actor,
        }))}
        total={result.total}
        pageSize={result.pageSize}
      />
    </div>
  );
}
