import { listTelecallers } from "@/server/telecallers/queries";
import { AddTelecallerDialog } from "@/components/telecallers/add-telecaller-dialog";
import { TelecallersTable } from "@/components/telecallers/telecallers-table";
import { PageIntro } from "@/components/shared/page-intro";

export default async function AdminEmployeesPage() {
  const rows = await listTelecallers();

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Recruitment · team"
        title="Telecallers"
        description="Manage employee logins for the recruitment CRM."
        actions={<AddTelecallerDialog />}
      />

      <TelecallersTable
        rows={rows.map((r) => ({
          ...r,
          lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
