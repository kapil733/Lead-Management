import { NextResponse } from "next/server";
import { requireAdminApi, readUploadFile } from "@/server/leads/http";
import { parseLeadImportFile } from "@/server/leads/parse-file";
import { guessColumnTarget } from "@/lib/validators/leads";

export async function POST(request: Request) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const upload = await readUploadFile(request);
  if (!upload.ok) return upload.response;

  const parsed = await parseLeadImportFile(upload.buffer, upload.fileName);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: { code: "PARSE_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const suggestedMapping: Record<string, string> = {};
  for (const header of parsed.data.headers) {
    suggestedMapping[header] = guessColumnTarget(header);
  }

  // One column per named field. A second guess (two mobile columns) is kept as extra.
  const seen = new Set<string>();
  for (const [h, t] of Object.entries(suggestedMapping)) {
    if (t === "extra" || t === "ignore") continue;
    if (seen.has(t)) suggestedMapping[h] = "extra";
    else seen.add(t);
  }

  return NextResponse.json({
    ok: true,
    data: {
      fileName: parsed.data.fileName,
      headers: parsed.data.headers,
      previewRows: parsed.data.previewRows,
      totalRows: parsed.data.totalRows,
      suggestedMapping,
    },
  });
}
