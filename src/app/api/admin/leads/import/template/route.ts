import { NextResponse } from "next/server";
import { requireAdminApi } from "@/server/leads/http";
import { buildSampleTemplateBuffer } from "@/server/leads/parse-file";

export async function GET() {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const buffer = await buildSampleTemplateBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="techconnect-leads-template.xlsx"',
    },
  });
}
