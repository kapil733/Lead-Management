import "server-only";

import ExcelJS from "exceljs";
import JSZip from "jszip";
import { prisma } from "@/server/db";
import { getPayrollRunDetail } from "@/server/payroll/runs";
import { renderPayslipPdf } from "@/server/payroll/payslip";
import { fromPaise } from "@/lib/money";

function rupees(paise: number) {
  return fromPaise(paise);
}

export async function exportPayrollRegisterXlsx(month: string): Promise<Buffer> {
  const detail = await getPayrollRunDetail(month);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Register");
  ws.addRow([
    "Employee Code",
    "Name",
    "Client",
    "Payable Days",
    "Earned Gross",
    "PF Employee",
    "ESIC Employee",
    "Other Earnings",
    "Other Deductions",
    "Net Pay",
    "Employer PF",
    "Employer ESIC",
  ]);
  for (const l of detail.lines) {
    ws.addRow([
      l.employeeCode,
      l.fullName,
      l.clientName ?? "",
      l.payableDays,
      rupees(l.earnedGrossPaise),
      rupees(l.pfEmployeePaise),
      rupees(l.esicEmployeePaise),
      rupees(l.otherEarningsPaise),
      rupees(l.otherDeductionsPaise),
      rupees(l.netPayPaise),
      rupees(l.employerPfPaise),
      rupees(l.employerEsicPaise),
    ]);
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function exportPfSummaryXlsx(month: string): Promise<Buffer> {
  const detail = await getPayrollRunDetail(month);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("PF");
  ws.addRow([
    "Employee Code",
    "Name",
    "PF Employee",
    "Employer PF",
    "EDLI",
    "Admin",
  ]);
  for (const l of detail.lines) {
    ws.addRow([
      l.employeeCode,
      l.fullName,
      rupees(l.pfEmployeePaise),
      rupees(l.employerPfPaise),
      rupees(l.employerEdliPaise),
      rupees(l.employerAdminPaise),
    ]);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function exportEsicSummaryXlsx(month: string): Promise<Buffer> {
  const detail = await getPayrollRunDetail(month);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("ESIC");
  ws.addRow(["Employee Code", "Name", "ESIC Employee", "ESIC Employer"]);
  for (const l of detail.lines) {
    ws.addRow([
      l.employeeCode,
      l.fullName,
      rupees(l.esicEmployeePaise),
      rupees(l.employerEsicPaise),
    ]);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function exportPayslipsZip(month: string): Promise<Buffer> {
  const detail = await getPayrollRunDetail(month);
  const zip = new JSZip();

  for (const l of detail.lines) {
    const snap = l.snapshot as {
      components?: { label: string; earnedPaise: number }[];
    };
    const emp = await prisma.contractEmployee.findUnique({
      where: { id: l.employeeId },
      select: { designation: true },
    });
    const pdf = await renderPayslipPdf({
      month,
      companyName: "TechConnect Ops",
      employeeCode: l.employeeCode,
      fullName: l.fullName,
      designation: emp?.designation,
      clientName: l.clientName,
      payableDays: l.payableDays,
      earnedGrossPaise: l.earnedGrossPaise,
      pfEmployeePaise: l.pfEmployeePaise,
      esicEmployeePaise: l.esicEmployeePaise,
      otherEarningsPaise: l.otherEarningsPaise,
      otherDeductionsPaise: l.otherDeductionsPaise,
      netPayPaise: l.netPayPaise,
      employerPfPaise: l.employerPfPaise,
      employerEsicPaise: l.employerEsicPaise,
      components: snap.components ?? [],
    });
    zip.file(`payslip-${l.employeeCode}-${month}.pdf`, pdf);
  }

  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}
