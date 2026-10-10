import Link from "next/link";
import { ContractEmployeeStatus } from "@prisma/client";
import { listContractEmployees } from "@/server/payroll/employees";
import { listClients } from "@/server/payroll/clients";
import { employeeListFiltersSchema } from "@/lib/validators/payroll";
import { formatINR } from "@/lib/money";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDisplayDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { EmployeeFilters } from "@/components/payroll/employee-filters";
import { AddEmployeeDialog } from "@/components/payroll/add-employee-dialog";
import { PageIntro } from "@/components/shared/page-intro";

export default async function PayrollEmployeesPage({
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
  const filters = employeeListFiltersSchema.parse({
    status:
      statusRaw &&
      Object.values(ContractEmployeeStatus).includes(
        statusRaw as ContractEmployeeStatus,
      )
        ? statusRaw
        : undefined,
    clientId: get("clientId") || undefined,
    q: get("q") || undefined,
    page: get("page") ?? "1",
    pageSize: "25",
  });

  const [result, clients] = await Promise.all([
    listContractEmployees(filters),
    listClients(),
  ]);

  const from =
    result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Payroll · master list"
        title="Contract employees"
        description="KYC encrypted at rest."
        actions={
          <AddEmployeeDialog
            clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          />
        }
      />

      <EmployeeFilters
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      />

      {result.rows.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface py-16 text-center text-sm text-muted shadow-[var(--shadow-card)]">
          No employees match these filters
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface-2 text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Mobile</th>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Designation</th>
                  <th className="px-3 py-2 font-medium">Gross</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">DOJ</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr
                    key={r.id}
                    className="h-10 border-t border-border hover:bg-surface-2"
                  >
                    <td className="px-3 py-1">
                      <Link
                        href={`/admin/payroll/employees/${r.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {r.employeeCode}
                      </Link>
                    </td>
                    <td className="px-3 py-1">
                      <Link
                        href={`/admin/payroll/employees/${r.id}`}
                        className="hover:underline"
                      >
                        {r.fullName}
                      </Link>
                    </td>
                    <td className="px-3 py-1 tabular">
                      {formatPhoneDisplay(r.mobile)}
                    </td>
                    <td className="px-3 py-1 text-muted">
                      {r.client?.name ?? "—"}
                    </td>
                    <td className="px-3 py-1">{r.designation}</td>
                    <td className="px-3 py-1 tabular">
                      {r.currentGrossPaise != null
                        ? formatINR(r.currentGrossPaise)
                        : "—"}
                    </td>
                    <td className="px-3 py-1">
                      <StatusChip status={r.status} />
                    </td>
                    <td className="px-3 py-1 tabular text-muted">
                      {formatDisplayDate(r.dateOfJoining)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted">
            <span className="tabular">
              {from}–{to} of {result.total}
            </span>
            <div className="flex gap-2">
              {result.page > 1 ? (
                <Button asChild variant="secondary" size="sm">
                  <Link
                    href={`?page=${result.page - 1}${get("q") ? `&q=${get("q")}` : ""}`}
                  >
                    Previous
                  </Link>
                </Button>
              ) : null}
              {to < result.total ? (
                <Button asChild variant="secondary" size="sm">
                  <Link
                    href={`?page=${result.page + 1}${get("q") ? `&q=${get("q")}` : ""}`}
                  >
                    Next
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: ContractEmployeeStatus }) {
  if (status === "ACTIVE") {
    return (
      <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success-strong">
        Active
      </span>
    );
  }
  if (status === "EXITED") {
    return (
      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs text-danger">
        Exited
      </span>
    );
  }
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
      Inactive
    </span>
  );
}
