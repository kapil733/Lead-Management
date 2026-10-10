import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { CallOutcome, CaseStatus, PrismaClient } from "@prisma/client";
import {
  defaultAnalyticsRange,
  getAnalyticsData,
} from "@/server/analytics/queries";

const prisma = new PrismaClient();

describe("analytics aggregations", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns series and respects outcome cross-filter", async () => {
    const range = defaultAnalyticsRange();
    const closed = await prisma.case.count({
      where: {
        status: CaseStatus.CLOSED,
        closedAt: {
          gte: new Date(`${range.from}T00:00:00+05:30`),
          lte: new Date(`${range.to}T23:59:59.999+05:30`),
        },
      },
    });

    const all = await getAnalyticsData({
      tab: "overview",
      from: range.from,
      to: range.to,
      page: 1,
      pageSize: 25,
    });

    expect(all.kpis.closed).toBe(closed);
    expect(all.series.byDay.length).toBeGreaterThan(0);
    expect(all.series.byOutcome.length).toBe(Object.keys(CallOutcome).length);
    expect(all.series.byHour).toHaveLength(24);
    expect(all.series.byDow).toHaveLength(7);

    if (closed === 0) return;

    const connectedOnly = await getAnalyticsData({
      tab: "overview",
      from: range.from,
      to: range.to,
      outcome: CallOutcome.CONNECTED,
      page: 1,
      pageSize: 25,
    });
    expect(connectedOnly.kpis.closed).toBeLessThanOrEqual(all.kpis.closed);
    expect(
      connectedOnly.drill.rows.every(
        (r) => r.outcome === CallOutcome.CONNECTED,
      ),
    ).toBe(true);
  });

  it("telecaller filter narrows drill rows", async () => {
    const range = defaultAnalyticsRange();
    const sample = await prisma.case.findFirst({
      where: {
        status: CaseStatus.CLOSED,
        closedAt: {
          gte: new Date(`${range.from}T00:00:00+05:30`),
        },
      },
      select: { employeeId: true },
    });
    if (!sample) return;

    const filtered = await getAnalyticsData({
      tab: "data",
      from: range.from,
      to: range.to,
      employeeId: sample.employeeId,
      page: 1,
      pageSize: 25,
    });
    expect(
      filtered.drill.rows.every((r) => r.employeeId === sample.employeeId),
    ).toBe(true);
    expect(filtered.telecallers.every((t) => t.id === sample.employeeId)).toBe(
      true,
    );
  });
});
