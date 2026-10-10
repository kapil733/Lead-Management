import { describe, expect, it } from "vitest";
import { releaseCaseSchema } from "@/lib/validators/dashboard";

describe("releaseCaseSchema", () => {
  it("requires reason ≥ 3 chars", () => {
    expect(
      releaseCaseSchema.safeParse({ caseId: "x", reason: "ab" }).success,
    ).toBe(false);
    expect(
      releaseCaseSchema.safeParse({
        caseId: "x",
        reason: "Stuck",
      }).success,
    ).toBe(true);
  });
});
