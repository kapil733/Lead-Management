import { NextResponse } from "next/server";
import { requireAdminApi } from "@/server/leads/http";
import { prisma } from "@/server/db";
import { renderPayslipPdf } from "@/server/payroll/payslip";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ employeeId: string; month: string }> },
) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { employeeId, month } = await ctx.params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "Invalid month" } },
      { status: 400 },
    );
  }

  const run = await prisma.payrollRun.findUnique({ where: { month } });
  if (!run) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "No run" } },
      { status: 404 },
    );
  }

  const line = await prisma.payrollLine.findUnique({
    where: {
      runId_employeeId: { runId: run.id, employeeId },
    },
    include: {
      employee: {
        select: {
          employeeCode: true,
          fullName: true,
          designation: true,
          client: { select: { name: true } },
        },
      },
    },
  });
  if (!line) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "No payslip line" } },
      { status: 404 },
    );
  }

  const snap = line.snapshot as {
    components?: { label: string; earnedPaise: number }[];
  };

  const pdf = await renderPayslipPdf({
    month,
    companyName: "EVerified",
    employeeCode: line.employee.employeeCode,
    fullName: line.employee.fullName,
    designation: line.employee.designation,
    clientName: line.employee.client?.name,
    payableDays: Number(line.payableDays),
    earnedGrossPaise: line.earnedGrossPaise,
    pfEmployeePaise: line.pfEmployeePaise,
    esicEmployeePaise: line.esicEmployeePaise,
    otherEarningsPaise: line.otherEarningsPaise,
    otherDeductionsPaise: line.otherDeductionsPaise,
    netPayPaise: line.netPayPaise,
    employerPfPaise: line.employerPfPaise,
    employerEsicPaise: line.employerEsicPaise,
    components: snap.components ?? [],
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="payslip-${line.employee.employeeCode}-${month}.pdf"`,
    },
  });
}
