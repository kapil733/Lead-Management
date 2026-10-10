import { describe, expect, it } from "vitest";
import { CallOutcome } from "@prisma/client";
import { closeCaseSchema } from "@/lib/validators/cases";

describe("closeCaseSchema", () => {
  it("requires rating and remarks for CONNECTED", () => {
    const bad = closeCaseSchema.safeParse({
      caseId: "c1",
      outcome: CallOutcome.CONNECTED,
      remarks: "ab",
    });
    expect(bad.success).toBe(false);

    const good = closeCaseSchema.safeParse({
      caseId: "c1",
      outcome: CallOutcome.CONNECTED,
      rating: 4,
      remarks: "Keen to join soon",
    });
    expect(good.success).toBe(true);
  });

  it("allows optional remarks for NO_ANSWER", () => {
    const ok = closeCaseSchema.safeParse({
      caseId: "c1",
      outcome: CallOutcome.NO_ANSWER,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects referral rows with fields but no phone", () => {
    const bad = closeCaseSchema.safeParse({
      caseId: "c1",
      outcome: CallOutcome.NO_ANSWER,
      referrals: [{ name: "Friend", phone: "" }],
    });
    expect(bad.success).toBe(false);
  });
});
