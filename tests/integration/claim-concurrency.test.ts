import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CaseStatus,
  LeadSource,
  LeadStatus,
  PrismaClient,
  Role,
} from "@prisma/client";
import { hashPassword } from "@/server/auth/password";
import { claimNextCase } from "@/server/cases/claim";

const prisma = new PrismaClient();

describe("claim concurrency", () => {
  const emails = [
    "claim-a@demo.test",
    "claim-b@demo.test",
  ] as const;
  let userA: string;
  let userB: string;
  const phones = ["9611111101", "9611111102", "9611111103"];

  beforeAll(async () => {
    const passwordHash = await hashPassword("Caller@12345");
    const a = await prisma.user.upsert({
      where: { email: emails[0] },
      create: {
        email: emails[0],
        name: "Claim A",
        role: Role.EMPLOYEE,
        passwordHash,
        mustChangePassword: false,
      },
      update: { isActive: true },
    });
    const b = await prisma.user.upsert({
      where: { email: emails[1] },
      create: {
        email: emails[1],
        name: "Claim B",
        role: Role.EMPLOYEE,
        passwordHash,
        mustChangePassword: false,
      },
      update: { isActive: true },
    });
    userA = a.id;
    userB = b.id;

    await prisma.case.deleteMany({
      where: { employeeId: { in: [userA, userB] } },
    });
    await prisma.lead.deleteMany({ where: { phone: { in: phones } } });

    // Ensure AppSettings exist
    await prisma.appSetting.upsert({
      where: { key: "dailyCaseCap" },
      create: { key: "dailyCaseCap", value: 200 },
      update: { value: 200 },
    });

    // Seed exactly one eligible lead so both claims race for it first,
    // then more leads so the second claim still succeeds with a different id.
    for (const [i, phone] of phones.entries()) {
      await prisma.lead.create({
        data: {
          phone,
          name: `Race Lead ${i}`,
          source: LeadSource.MANUAL,
          status: LeadStatus.NEW,
          priority: 100 - i,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.case.deleteMany({
      where: { employeeId: { in: [userA, userB] } },
    });
    await prisma.lead.deleteMany({ where: { phone: { in: phones } } });
    await prisma.$disconnect();
  });

  it("never assigns the same lead to two parallel claims", async () => {
    const [r1, r2] = await Promise.all([
      claimNextCase({ employeeId: userA }),
      claimNextCase({ employeeId: userB }),
    ]);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;

    expect(r1.data.leadId).not.toBe(r2.data.leadId);
    expect(r1.data.caseId).not.toBe(r2.data.caseId);

    const openCases = await prisma.case.findMany({
      where: {
        employeeId: { in: [userA, userB] },
        status: CaseStatus.OPEN,
      },
    });
    expect(openCases).toHaveLength(2);
    const leadIds = openCases.map((c) => c.leadId);
    expect(new Set(leadIds).size).toBe(2);
  });
});
