import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { CallOutcome } from "@prisma/client";
import { requireAdminApi } from "@/server/leads/http";
import { writeAudit } from "@/server/audit/write";
import { listAnalyticsCasesForExport } from "@/server/analytics/queries";
import { analyticsFiltersSchema } from "@/lib/validators/analytics";
import { formatPhoneDisplay } from "@/lib/phone";

function csv(value: string | null | undefined): string {
  if (value == null) return "";
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export async function GET(request: Request) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const url = new URL(request.url);
  const get = (key: string) => url.searchParams.get(key) ?? undefined;

  const outcomeRaw = get("outcome");
  const parsed = analyticsFiltersSchema.safeParse({
    tab: get("tab") ?? "data",
    from: get("from"),
    to: get("to"),
    employeeId: get("employeeId"),
    outcome:
      outcomeRaw &&
      Object.values(CallOutcome).includes(outcomeRaw as CallOutcome)
        ? outcomeRaw
        : undefined,
    rating: get("rating"),
    city: get("city"),
    trade: get("trade"),
    hour: get("hour"),
    dow: get("dow"),
    page: "1",
    pageSize: "100",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "Invalid filters" } },
      { status: 400 },
    );
  }

  const rows = await listAnalyticsCasesForExport(parsed.data);

  const header = [
    "ClosedAt",
    "Employee",
    "Phone",
    "Name",
    "City",
    "Trade",
    "Outcome",
    "Rating",
    "Referrals",
    "Joined",
    "DurationSeconds",
    "Remarks",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.closedAt?.toISOString() ?? "",
        csv(r.employeeName),
        formatPhoneDisplay(r.phone),
        csv(r.leadName),
        csv(r.city),
        csv(r.trade),
        r.outcome ?? "",
        r.rating != null ? String(r.rating) : "",
        String(r.referralsCount),
        r.joined ? "yes" : "no",
        r.durationSeconds != null ? String(r.durationSeconds) : "",
        csv(r.remarks),
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
    action: "ANALYTICS_EXPORT_CSV",
    entityType: "Analytics",
    entityId: "export",
    meta: {
      rowCount: rows.length,
      from: parsed.data.from,
      to: parsed.data.to,
      employeeId: parsed.data.employeeId ?? null,
      outcome: parsed.data.outcome ?? null,
    },
    ip,
  });

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics-cases.csv"`,
    },
  });
}
