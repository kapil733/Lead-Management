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
import { releaseCase } from "@/server/cases/release";
import { getDashboardData } from "@/server/dashboard/queries";

const prisma = new PrismaClient();

describe("release case + dashboard stale", () => {
  const employeeEmail = "release-emp@demo.test";
  const phone = "9644444401";
  let adminId: string;
  let employeeId: string;
  let caseId: string;
  let leadId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword("Caller@12345");
    const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    expect(admin).not.toBeNull();
    adminId = admin!.id;

    const employee = await prisma.user.upsert({
      where: { email: employeeEmail },
      create: {
        email: employeeEmail,
        name: "Release Emp",
        role: Role.EMPLOYEE,
        passwordHash,
        mustChangePassword: false,
      },
      update: { isActive: true },
    });
    employeeId = employee.id;

    await prisma.case.deleteMany({ where: { employeeId } });
    await prisma.lead.deleteMany({ where: { phone } });

    const lead = await prisma.lead.create({
      data: {
        phone,
        name: "Release Lead",
        source: LeadSource.IMPORT,
        status: LeadStatus.IN_CASE,
      },
    });
    leadId = lead.id;

    const open = await prisma.case.create({
      data: {
        leadId,
        employeeId,
        status: CaseStatus.OPEN,
        startedAt: new Date(Date.now() - 90 * 60 * 1000),
      },
    });
    caseId = open.id;

    await prisma.appSetting.upsert({
      where: { key: "staleCaseMinutes" },
      create: { key: "staleCaseMinutes", value: 60 },
      update: { value: 60 },
    });
  });

  afterAll(async () => {
    await prisma.case.deleteMany({ where: { employeeId } });
    await prisma.lead.deleteMany({ where: { phone } });
    await prisma.auditLog.deleteMany({
      where: { action: "CASE_RELEASE", entityId: caseId },
    });
    await prisma.user.deleteMany({ where: { email: employeeEmail } });
    await prisma.$disconnect();
  });

  it("flags stale open cases on dashboard", async () => {
    const dash = await getDashboardData("30d");
    expect(dash.alerts.staleCount).toBeGreaterThanOrEqual(1);
    const mine = dash.live.find((c) => c.id === caseId);
    expect(mine).toBeDefined();
    expect(mine!.stale).toBe(true);
  });

  it("releases open case and returns lead to NEW", async () => {
    const result = await releaseCase({
      actorId: adminId,
      payload: { caseId, reason: "Stale — employee offline" },
    });
    expect(result.ok).toBe(true);

    const c = await prisma.case.findUniqueOrThrow({ where: { id: caseId } });
    expect(c.status).toBe(CaseStatus.RELEASED);
    expect(c.releasedById).toBe(adminId);
    expect(c.releaseReason).toBe("Stale — employee offline");

    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    expect(lead.status).toBe(LeadStatus.NEW);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "CASE_RELEASE", entityId: caseId },
    });
    expect(audit).not.toBeNull();

    const again = await releaseCase({
      actorId: adminId,
      payload: { caseId, reason: "Already gone" },
    });
    expect(again.ok).toBe(false);
  });

  it("rejects short reason", async () => {
    // recreate open case for validation-only path on a fresh id
    const lead = await prisma.lead.create({
      data: {
        phone: "9644444402",
        name: "Temp",
        source: LeadSource.IMPORT,
        status: LeadStatus.IN_CASE,
      },
    });
    const open = await prisma.case.create({
      data: {
        leadId: lead.id,
        employeeId,
        status: CaseStatus.OPEN,
        startedAt: new Date(),
      },
    });
    const bad = await releaseCase({
      actorId: adminId,
      payload: { caseId: open.id, reason: "no" },
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("VALIDATION");

    await prisma.case.delete({ where: { id: open.id } });
    await prisma.lead.delete({ where: { id: lead.id } });
  });
});
