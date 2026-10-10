import { NextResponse } from "next/server";
import { requireAdminApi } from "@/server/leads/http";
import { buildAttendanceTemplate } from "@/server/payroll/attendance/import";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "Invalid month" } },
      { status: 400 },
    );
  }
  const buf = await buildAttendanceTemplate(month);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="attendance-${month}.xlsx"`,
    },
  });
}
