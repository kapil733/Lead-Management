import { describe, expect, it } from "vitest";
import { CallOutcome } from "@prisma/client";
import { analyticsFiltersSchema } from "@/lib/validators/analytics";

describe("analyticsFiltersSchema", () => {
  it("defaults tab and pagination", () => {
    const parsed = analyticsFiltersSchema.parse({});
    expect(parsed.tab).toBe("overview");
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(25);
  });

  it("accepts cross-filter dims", () => {
    const parsed = analyticsFiltersSchema.parse({
      tab: "time",
      outcome: CallOutcome.CONNECTED,
      hour: 14,
      dow: 1,
      rating: 5,
    });
    expect(parsed.hour).toBe(14);
    expect(parsed.dow).toBe(1);
    expect(parsed.outcome).toBe(CallOutcome.CONNECTED);
  });

  it("rejects invalid hour", () => {
    expect(analyticsFiltersSchema.safeParse({ hour: 25 }).success).toBe(false);
  });
});
