import { NextResponse } from "next/server";
import { DocumentType } from "@prisma/client";
import { requireAdminApi } from "@/server/leads/http";
import { uploadDocument } from "@/server/payroll/documents";
import { DOC_MAX_BYTES } from "@/lib/validators/payroll";

export async function POST(request: Request) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const form = await request.formData();
  const employeeId = String(form.get("employeeId") ?? "");
  const typeRaw = String(form.get("type") ?? "");
  const file = form.get("file");

  if (!employeeId || !(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "Missing fields" } },
      { status: 400 },
    );
  }
  if (!Object.values(DocumentType).includes(typeRaw as DocumentType)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "Invalid type" } },
      { status: 400 },
    );
  }
  if (file.size > DOC_MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "File must be ≤ 5 MB" } },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await uploadDocument({
    employeeId,
    type: typeRaw as DocumentType,
    fileName: file.name,
    bytes,
    contentType: file.type || "application/octet-stream",
    actorId: gate.user.id,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { code: "UPLOAD_FAILED", message: result.error } },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, data: { id: result.data.id } });
}
