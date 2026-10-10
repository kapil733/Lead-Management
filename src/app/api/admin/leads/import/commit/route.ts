import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  requireAdminApi,
  parseMappingField,
} from "@/server/leads/http";
import { parseLeadImportFile } from "@/server/leads/parse-file";
import { classifyMappedRows, mapRows } from "@/server/leads/classify";
import { commitLeadImport } from "@/server/leads/import-batch";
import { columnMappingSchema } from "@/lib/validators/leads";
import {
  consumeRateLimit,
  RATE_LIMITS,
} from "@/server/security/rate-limit";

export async function POST(request: Request) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const rl = consumeRateLimit(
    `import-commit:${gate.user.id}`,
    RATE_LIMITS.importCommit,
  );
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMIT",
          message: `Too many imports. Try again in ${rl.retryAfterSeconds}s.`,
        },
      },
      { status: 429 },
    );
  }

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
  if (!Object.values(mappingParsed.data).includes("phone")) {
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

  const mapped = mapRows(
    parsed.data.headers,
    parsed.data.rows,
    mappingParsed.data,
  );
  const classified = await classifyMappedRows(mapped);

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;

  const batch = await commitLeadImport({
    fileName: parsed.data.fileName,
    uploadedById: gate.user.id,
    validNew: classified.validNew,
    duplicatesCount: classified.duplicates.length,
    invalidCount: classified.invalid.length,
    totalRows: classified.totalRows,
    ip,
  });

  return NextResponse.json({
    ok: true,
    data: {
      batchId: batch.id,
      imported: batch.imported,
      duplicates: batch.duplicates,
      invalid: batch.invalid,
      totalRows: batch.totalRows,
    },
  });
}
