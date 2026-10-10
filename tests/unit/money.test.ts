import { describe, expect, it } from "vitest";
import { formatINR, fromPaise, toPaise } from "@/lib/money";

describe("money", () => {
  it("converts rupees to paise without float drift for common amounts", () => {
    expect(toPaise(18000)).toBe(1_800_000);
    expect(toPaise(15000)).toBe(1_500_000);
    expect(fromPaise(1_026_00)).toBe(1026);
  });

  it("formats INR in en-IN", () => {
    const formatted = formatINR(1_594_500);
    expect(formatted).toContain("15,945");
  });
});
