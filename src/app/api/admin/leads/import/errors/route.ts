import { NextResponse } from "next/server";
import {
  requireAdminApi,
  parseMappingField,
} from "@/server/leads/http";
import { parseLeadImportFile } from "@/server/leads/parse-file";
import { scopeImportSheet } from "@/server/leads/import-scope";
import { classifyMappedRows, mapRows } from "@/server/leads/classify";
import { buildErrorReportBuffer } from "@/server/leads/error-report";
import { columnMappingSchema } from "@/lib/validators/leads";

export async function POST(request: Request) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "file is required" } },
      { status: 400 },
    );
  }

  const mappingRaw = parseMappingField(form);
  const mappingParsed = columnMappingSchema.safeParse(mappingRaw);
  if (!mappingParsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "VALIDATION", message: "Invalid column mapping" },
      },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseLeadImportFile(buffer, file.name);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: { code: "PARSE_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const scoped = scopeImportSheet(form, parsed.data);
  if (!scoped.ok) return scoped.response;

  const mapped = mapRows(
    scoped.sheet.headers,
    scoped.sheet.rows,
    mappingParsed.data,
    scoped.sheet.rowSections,
  );
  const classified = await classifyMappedRows(mapped);
  const report = await buildErrorReportBuffer({
    invalid: classified.invalid,
    duplicates: classified.duplicates,
  });

  return new NextResponse(new Uint8Array(report), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="lead-import-errors.xlsx"',
    },
  });
}
