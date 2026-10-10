import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getContractEmployee,
  listEmployeeActivity,
  toEmployeeSafeView,
} from "@/server/payroll/employees";
import { listClients } from "@/server/payroll/clients";
import { prisma } from "@/server/db";
import { EmployeeProfile } from "@/components/payroll/employee-profile";
import { Button } from "@/components/ui/button";

export default async function PayrollEmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [emp, clients, activity, lines] = await Promise.all([
    getContractEmployee(id),
    listClients(),
    listEmployeeActivity(id),
    prisma.payrollLine.findMany({
      where: { employeeId: id },
      include: { run: { select: { month: true, status: true } } },
      orderBy: { run: { month: "desc" } },
    }),
  ]);
  if (!emp) notFound();

  const view = toEmployeeSafeView(emp);

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/admin/payroll/employees">← Employees</Link>
      </Button>
      <EmployeeProfile
        employee={{
          ...view,
          dob: view.dob.toISOString(),
          dateOfJoining: view.dateOfJoining.toISOString(),
          dateOfExit: view.dateOfExit?.toISOString() ?? null,
        }}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        salaryStructures={view.salaryStructures.map((s) => ({
          id: s.id,
          effectiveFrom: s.effectiveFrom.toISOString(),
          monthlyGrossPaise: s.monthlyGrossPaise,
          components: s.components,
          note: s.note,
          createdBy: { name: s.createdBy.name },
        }))}
        documents={view.documents.map((d) => ({
          id: d.id,
          type: d.type,
          fileName: d.fileName,
          uploadedAt: d.uploadedAt.toISOString(),
        }))}
        activity={activity.map((a) => ({
          id: a.id,
          action: a.action,
          entityType: a.entityType,
          createdAt: a.createdAt.toISOString(),
          actor: a.actor,
        }))}
        payslips={lines.map((l) => ({
          month: l.run.month,
          status: l.run.status,
          payableDays: Number(l.payableDays),
          earnedGrossPaise: l.earnedGrossPaise,
          netPayPaise: l.netPayPaise,
          runLocked: l.run.status === "LOCKED",
        }))}
      />
    </div>
  );
}
