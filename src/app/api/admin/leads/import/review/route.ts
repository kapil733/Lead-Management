import { NextResponse } from "next/server";
import { requireAdminApi, parseMappingField } from "@/server/leads/http";
import { parseLeadImportFile } from "@/server/leads/parse-file";
import { scopeImportSheet } from "@/server/leads/import-scope";
import { classifyMappedRows, mapRows } from "@/server/leads/classify";
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
  if (!mappingRaw) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "VALIDATION", message: "mapping JSON is required" },
      },
      { status: 400 },
    );
  }
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

  const hasPhone = Object.values(mappingParsed.data).includes("phone");
  if (!hasPhone) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "Map at least one column to Phone",
        },
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

  return NextResponse.json({
    ok: true,
    data: {
      fileName: parsed.data.fileName,
      totalRows: classified.totalRows,
      validNewCount: classified.validNew.length,
      duplicatesCount: classified.duplicates.length,
      invalidCount: classified.invalid.length,
      previewValid: classified.previewValid.map((r) => ({
        rowNumber: r.rowNumber,
        phone: r.phone,
        name: r.name,
        city: r.city,
        trade: r.trade,
        experienceYears: r.experienceYears,
      })),
    },
  });
}
