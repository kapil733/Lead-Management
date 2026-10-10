import { NextResponse } from "next/server";
import { requireAdminApi } from "@/server/leads/http";
import { getDocumentBytes } from "@/server/payroll/documents";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const result = await getDocumentBytes(id);
  if (!result) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 },
    );
  }

  return new NextResponse(new Uint8Array(result.bytes), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `inline; filename="${result.doc.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
