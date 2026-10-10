import { listClients } from "@/server/payroll/clients";
import { ClientsManager } from "@/components/payroll/clients-manager";
import { PageIntro } from "@/components/shared/page-intro";

export default async function PayrollClientsPage() {
  const clients = await listClients();

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Payroll · deployments"
        title="Clients"
        description="Deployment clients for contract technicians."
      />
      <ClientsManager
        initial={clients.map((c) => ({
          id: c.id,
          name: c.name,
          contactName: c.contactName,
          contactPhone: c.contactPhone,
          address: c.address,
          isActive: c.isActive,
          employeeCount: c._count.employees,
        }))}
      />
    </div>
  );
}
