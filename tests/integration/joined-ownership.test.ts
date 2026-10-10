import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CaseStatus,
  CallOutcome,
  LeadSource,
  LeadStatus,
  PrismaClient,
  Role,
} from "@prisma/client";
import { hashPassword } from "@/server/auth/password";
import { setLeadJoined } from "@/server/leads/joined";
import { listCompletedCasesForEmployee } from "@/server/cases/completed";

const prisma = new PrismaClient();

describe("joined ownership + completed isolation", () => {
  const emails = {
    a: "joined-owner-a@demo.test",
    b: "joined-owner-b@demo.test",
  };
  const phones = {
    a: "9633333301",
    b: "9633333302",
  };
  let employeeA: string;
  let employeeB: string;
  let leadA: string;
  let leadB: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword("Caller@12345");

    const [a, b] = await Promise.all([
      prisma.user.upsert({
        where: { email: emails.a },
        create: {
          email: emails.a,
          name: "Joined A",
          role: Role.EMPLOYEE,
          passwordHash,
          mustChangePassword: false,
        },
        update: { isActive: true },
      }),
      prisma.user.upsert({
        where: { email: emails.b },
        create: {
          email: emails.b,
          name: "Joined B",
          role: Role.EMPLOYEE,
          passwordHash,
          mustChangePassword: false,
        },
        update: { isActive: true },
      }),
    ]);
    employeeA = a.id;
    employeeB = b.id;

    await prisma.referral.deleteMany({
      where: { case: { employeeId: { in: [employeeA, employeeB] } } },
    });
    await prisma.case.deleteMany({
      where: { employeeId: { in: [employeeA, employeeB] } },
    });
    await prisma.lead.deleteMany({
      where: { phone: { in: Object.values(phones) } },
    });

    const [la, lb] = await Promise.all([
      prisma.lead.create({
        data: {
          phone: phones.a,
          name: "Lead A",
          source: LeadSource.IMPORT,
          status: LeadStatus.CLOSED,
        },
      }),
      prisma.lead.create({
        data: {
          phone: phones.b,
          name: "Lead B",
          source: LeadSource.IMPORT,
          status: LeadStatus.CLOSED,
        },
      }),
    ]);
    leadA = la.id;
    leadB = lb.id;

    await prisma.case.createMany({
      data: [
        {
          leadId: leadA,
          employeeId: employeeA,
          status: CaseStatus.CLOSED,
          outcome: CallOutcome.CONNECTED,
          rating: 4,
          closedAt: new Date(),
          remarks: "A closed",
        },
        {
          leadId: leadB,
          employeeId: employeeB,
          status: CaseStatus.CLOSED,
          outcome: CallOutcome.NO_ANSWER,
          closedAt: new Date(),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.referral.deleteMany({
      where: { case: { employeeId: { in: [employeeA, employeeB] } } },
    });
    await prisma.case.deleteMany({
      where: { employeeId: { in: [employeeA, employeeB] } },
    });
    await prisma.lead.deleteMany({
      where: { phone: { in: Object.values(phones) } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
    await prisma.$disconnect();
  });

  it("employee can toggle joined only on own closed lead", async () => {
    const ok = await setLeadJoined({
      leadId: leadA,
      joined: true,
      actorId: employeeA,
      actorRole: Role.EMPLOYEE,
    });
    expect(ok.ok).toBe(true);

    const denied = await setLeadJoined({
      leadId: leadB,
      joined: true,
      actorId: employeeA,
      actorRole: Role.EMPLOYEE,
    });
    expect(denied.ok).toBe(false);

    const audit = await prisma.auditLog.findFirst({
      where: {
        action: "LEAD_JOINED_ON",
        entityId: leadA,
        actorId: employeeA,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).not.toBeNull();
  });

  it("completed list returns only own cases", async () => {
    const listA = await listCompletedCasesForEmployee(employeeA, {
      joined: "all",
      page: 1,
      pageSize: 25,
    });
    expect(listA.rows.every((r) => r.leadId === leadA)).toBe(true);
    expect(listA.rows.some((r) => r.leadId === leadB)).toBe(false);

    const listB = await listCompletedCasesForEmployee(employeeB, {
      joined: "all",
      page: 1,
      pageSize: 25,
    });
    expect(listB.rows.every((r) => r.leadId === leadB)).toBe(true);
  });

  it("admin can toggle any lead", async () => {
    const admin = await prisma.user.findFirst({
      where: { role: Role.ADMIN },
    });
    expect(admin).not.toBeNull();
    const result = await setLeadJoined({
      leadId: leadB,
      joined: true,
      actorId: admin!.id,
      actorRole: Role.ADMIN,
    });
    expect(result.ok).toBe(true);
  });
});
