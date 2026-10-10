import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/server/leads/http";
import { listLeadsForExport } from "@/server/leads/queries";
import { leadListFiltersSchema } from "@/lib/validators/leads";
import { writeAudit } from "@/server/audit/write";
import { LeadSource, LeadStatus } from "@prisma/client";
import {
  consumeRateLimit,
  RATE_LIMITS,
} from "@/server/security/rate-limit";

export async function GET(request: Request) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const rl = consumeRateLimit(`export:${gate.user.id}`, RATE_LIMITS.export);
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMIT",
          message: `Too many exports. Try again in ${rl.retryAfterSeconds}s.`,
        },
      },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const raw = {
    status: url.searchParams.get("status") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
    joined: url.searchParams.get("joined") ?? "all",
    importBatchId: url.searchParams.get("importBatchId") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  };

  // Coerce enums carefully
  const parsed = leadListFiltersSchema.safeParse({
    ...raw,
    status:
      raw.status && Object.values(LeadStatus).includes(raw.status as LeadStatus)
        ? raw.status
        : undefined,
    source:
      raw.source && Object.values(LeadSource).includes(raw.source as LeadSource)
        ? raw.source
        : undefined,
    page: 1,
    pageSize: 25,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "Invalid filters" } },
      { status: 400 },
    );
  }

  const { page, pageSize, ...filters } = parsed.data;
  void page;
  void pageSize;
  const { rows } = await listLeadsForExport(filters);

  const header = [
    "Phone",
    "Name",
    "City",
    "Trade",
    "ExperienceYears",
    "Source",
    "Status",
    "Attempts",
    "Joined",
    "CreatedAt",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.phone,
        csv(r.name),
        csv(r.city),
        csv(r.trade),
        r.experienceYears?.toString() ?? "",
        r.source,
        r.status,
        String(r.attempts),
        r.joined ? "yes" : "no",
        r.createdAt.toISOString(),
      ].join(","),
    ),
  ];

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;

  await writeAudit({
    actorId: gate.user.id,
    action: "LEAD_EXPORT_CSV",
    entityType: "Lead",
    entityId: "filtered",
    meta: { count: rows.length, filters },
    ip,
  });

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leads-export.csv"',
    },
  });
}

function csv(value: string | null | undefined): string {
  if (value == null) return "";
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
