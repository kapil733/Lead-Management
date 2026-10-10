import { NextResponse } from "next/server";
import { requireAdminApi } from "@/server/leads/http";
import { previewAttendanceImport } from "@/server/payroll/attendance/import";

export const runtime = "nodejs";

const MAX = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const form = await req.formData();
  const month = String(form.get("month") ?? "");
  const file = form.get("file");
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "Invalid month" } },
      { status: 400 },
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "File required" } },
      { status: 400 },
    );
  }
  if (file.size > MAX) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "File too large (max 4 MB)" } },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const preview = await previewAttendanceImport({ month, buffer });
  return NextResponse.json({ ok: true, data: preview });
}
