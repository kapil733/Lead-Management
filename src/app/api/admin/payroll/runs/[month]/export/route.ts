import { NextResponse } from "next/server";
import { requireAdminApi } from "@/server/leads/http";
import {
  exportEcrTxt,
  exportEsicSummaryXlsx,
  exportPayrollRegisterXlsx,
  exportPayslipsZip,
  exportPfSummaryXlsx,
} from "@/server/payroll/exports";

export const runtime = "nodejs";

type Kind = "register" | "pf" | "esic" | "payslips" | "ecr";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ month: string }> },
) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { month } = await ctx.params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "Invalid month" } },
      { status: 400 },
    );
  }

  const kind = (new URL(req.url).searchParams.get("kind") ??
    "register") as Kind;

  try {
    if (kind === "payslips") {
      const buf = await exportPayslipsZip(month);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="payslips-${month}.zip"`,
        },
      });
    }

    if (kind === "ecr") {
      const buf = await exportEcrTxt(month);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="ecr-${month}.txt"`,
        },
      });
    }

    let buf: Buffer;
    let name: string;
    if (kind === "pf") {
      buf = await exportPfSummaryXlsx(month);
      name = `pf-summary-${month}.xlsx`;
    } else if (kind === "esic") {
      buf = await exportEsicSummaryXlsx(month);
      name = `esic-summary-${month}.xlsx`;
    } else {
      buf = await exportPayrollRegisterXlsx(month);
      name = `payroll-register-${month}.xlsx`;
    }

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    return NextResponse.json(
      { ok: false, error: { code: "ERROR", message } },
      { status: 500 },
    );
  }
}
