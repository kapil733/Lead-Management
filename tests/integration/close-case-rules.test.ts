import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CallOutcome,
  CaseStatus,
  LeadSource,
  LeadStatus,
  PrismaClient,
  Role,
} from "@prisma/client";
import { hashPassword } from "@/server/auth/password";
import { claimNextCase } from "@/server/cases/claim";
import { closeCase } from "@/server/cases/close";

const prisma = new PrismaClient();

describe("close case rules §6.1", () => {
  const email = "close-rules@demo.test";
  let employeeId: string;
  const phones = {
    main: "9622222201",
    friendNew: "9622222202",
    friendExisting: "9622222203",
  };

  beforeAll(async () => {
    const passwordHash = await hashPassword("Caller@12345");
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: "Close Rules",
        role: Role.EMPLOYEE,
        passwordHash,
        mustChangePassword: false,
      },
      update: { isActive: true },
    });
    employeeId = user.id;

    await prisma.referral.deleteMany({
      where: { case: { employeeId } },
    });
    await prisma.referral.deleteMany({
      where: { phone: { in: Object.values(phones) } },
    });
    await prisma.case.deleteMany({ where: { employeeId } });
    await prisma.lead.deleteMany({
      where: { phone: { in: Object.values(phones) } },
    });

    await prisma.appSetting.upsert({
      where: { key: "maxAttempts" },
      create: { key: "maxAttempts", value: 3 },
      update: { value: 3 },
    });
    await prisma.appSetting.upsert({
      where: { key: "retryCooldownHours" },
      create: { key: "retryCooldownHours", value: 4 },
      update: { value: 4 },
    });
    await prisma.appSetting.upsert({
      where: { key: "dailyCaseCap" },
      create: { key: "dailyCaseCap", value: 200 },
      update: { value: 200 },
    });

    await prisma.lead.create({
      data: {
        phone: phones.friendExisting,
        name: "Existing Friend",
        source: LeadSource.IMPORT,
        status: LeadStatus.NEW,
      },
    });
  });

  afterAll(async () => {
    await prisma.referral.deleteMany({
      where: { case: { employeeId } },
    });
    await prisma.case.deleteMany({ where: { employeeId } });
    await prisma.lead.deleteMany({
      where: {
        phone: {
          in: [
            ...Object.values(phones),
            "9622222210",
            "9622222211",
            "9622222212",
            "9622222230",
            "9622222231",
            "9622222232",
          ],
        },
      },
    });
    await prisma.$disconnect();
  });

  async function clearEmployeeCases() {
    await prisma.referral.deleteMany({
      where: { case: { employeeId } },
    });
    await prisma.case.deleteMany({ where: { employeeId } });
  }

  async function seedMainLead(phone: string) {
    await clearEmployeeCases();
    await prisma.lead.deleteMany({ where: { phone } });
    await prisma.lead.create({
      data: {
        phone,
        name: "Main Lead",
        source: LeadSource.MANUAL,
        status: LeadStatus.NEW,
        priority: 50,
        attempts: 0,
      },
    });
  }

  it("CONNECTED closes lead and creates warm referral priority 10", async () => {
    await seedMainLead(phones.main);
    const claim = await claimNextCase({ employeeId });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;

    const closed = await closeCase({
      employeeId,
      payload: {
        caseId: claim.data.caseId,
        outcome: CallOutcome.CONNECTED,
        rating: 5,
        remarks: "Will join and bring friends",
        referrals: [
          {
            phone: phones.friendNew,
            name: "New Friend",
            designation: "EV Technician",
            experienceText: "2 yrs",
          },
          {
            phone: phones.friendExisting,
            name: "Already There",
          },
        ],
      },
    });
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    expect(closed.data.referralsSaved).toBe(2);
    expect(closed.data.referralNotes.length).toBe(1);

    const main = await prisma.lead.findUnique({ where: { phone: phones.main } });
    expect(main?.status).toBe(LeadStatus.CLOSED);

    const friend = await prisma.lead.findUnique({
      where: { phone: phones.friendNew },
    });
    expect(friend?.source).toBe(LeadSource.REFERRAL);
    expect(friend?.priority).toBe(10);
    expect(friend?.referredByLeadId).toBe(main?.id);

    const existing = await prisma.lead.findUnique({
      where: { phone: phones.friendExisting },
    });
    expect(existing?.status).toBe(LeadStatus.NEW);
  });

  it("NO_ANSWER increments attempts and returns lead to NEW with cooldown", async () => {
    const phone = "9622222210";
    await seedMainLead(phone);
    const claim = await claimNextCase({ employeeId });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;

    const closed = await closeCase({
      employeeId,
      payload: {
        caseId: claim.data.caseId,
        outcome: CallOutcome.NO_ANSWER,
      },
    });
    expect(closed.ok).toBe(true);

    const lead = await prisma.lead.findUnique({ where: { phone } });
    expect(lead?.status).toBe(LeadStatus.NEW);
    expect(lead?.attempts).toBe(1);
    expect(lead?.nextEligibleAt).not.toBeNull();

    await clearEmployeeCases();
    await prisma.lead.delete({ where: { phone } });
  });

  it("WRONG_NUMBER closes lead permanently", async () => {
    const phone = "9622222211";
    await seedMainLead(phone);
    const claim = await claimNextCase({ employeeId });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;

    const closed = await closeCase({
      employeeId,
      payload: {
        caseId: claim.data.caseId,
        outcome: CallOutcome.WRONG_NUMBER,
      },
    });
    expect(closed.ok).toBe(true);

    const lead = await prisma.lead.findUnique({ where: { phone } });
    expect(lead?.status).toBe(LeadStatus.CLOSED);

    await clearEmployeeCases();
    await prisma.lead.delete({ where: { phone } });
  });

  it("exhausts lead after maxAttempts retries", async () => {
    const phone = "9622222212";
    await clearEmployeeCases();
    await prisma.lead.deleteMany({ where: { phone } });
    await prisma.lead.create({
      data: {
        phone,
        name: "Exhaust",
        source: LeadSource.MANUAL,
        status: LeadStatus.NEW,
        attempts: 2,
        priority: 40,
      },
    });

    const claim = await claimNextCase({ employeeId });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;

    const closed = await closeCase({
      employeeId,
      payload: {
        caseId: claim.data.caseId,
        outcome: CallOutcome.SWITCHED_OFF,
      },
    });
    expect(closed.ok).toBe(true);

    const lead = await prisma.lead.findUnique({ where: { phone } });
    expect(lead?.attempts).toBe(3);
    expect(lead?.status).toBe(LeadStatus.EXHAUSTED);

    const openLeft = await prisma.case.count({
      where: { employeeId, status: CaseStatus.OPEN },
    });
    expect(openLeft).toBe(0);

    await clearEmployeeCases();
    await prisma.lead.delete({ where: { phone } });
  });

  it("saves city, location, and bike on the open lead only", async () => {
    const phone = "9622222230";
    const other = "9622222231";
    await clearEmployeeCases();
    await prisma.lead.deleteMany({ where: { phone: { in: [phone, other] } } });
    await prisma.lead.create({
      data: {
        phone,
        name: "Desk Lead",
        city: "Chennai",
        source: LeadSource.MANUAL,
        status: LeadStatus.NEW,
        priority: 1_000_000,
      },
    });
    await prisma.lead.create({
      data: {
        phone: other,
        name: "Other Lead",
        city: "Pune",
        source: LeadSource.MANUAL,
        status: LeadStatus.NEW,
        priority: 1,
      },
    });

    const claim = await claimNextCase({ employeeId });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;

    const open = await prisma.case.findUnique({
      where: { id: claim.data.caseId },
      select: { lead: { select: { phone: true } } },
    });
    expect(open?.lead.phone).toBe(phone);

    const closed = await closeCase({
      employeeId,
      payload: {
        caseId: claim.data.caseId,
        outcome: CallOutcome.NO_ANSWER,
        city: "Madurai",
        location: "T Nagar",
        bikeType: "EV_BIKE",
      },
    });
    expect(closed.ok).toBe(true);

    const saved = await prisma.lead.findUnique({ where: { phone } });
    expect(saved?.city).toBe("Madurai");
    expect(saved?.location).toBe("T Nagar");
    expect(saved?.bikeType).toBe("EV_BIKE");

    const untouched = await prisma.lead.findUnique({ where: { phone: other } });
    expect(untouched?.city).toBe("Pune");
    expect(untouched?.location).toBeNull();
    expect(untouched?.bikeType).toBeNull();
  });

  it("clears city, location, and bike when the desk sends blanks", async () => {
    const phone = "9622222232";
    await clearEmployeeCases();
    await prisma.lead.deleteMany({ where: { phone } });
    await prisma.lead.create({
      data: {
        phone,
        name: "Clear Lead",
        city: "Chennai",
        location: "Anna Nagar",
        bikeType: "PETROL_BIKE",
        source: LeadSource.MANUAL,
        status: LeadStatus.NEW,
        priority: 1_000_000,
      },
    });

    const claim = await claimNextCase({ employeeId });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;

    const closed = await closeCase({
      employeeId,
      payload: {
        caseId: claim.data.caseId,
        outcome: CallOutcome.NO_ANSWER,
        city: "",
        location: "",
        bikeType: "",
      },
    });
    expect(closed.ok).toBe(true);

    const saved = await prisma.lead.findUnique({ where: { phone } });
    expect(saved?.city).toBeNull();
    expect(saved?.location).toBeNull();
    expect(saved?.bikeType).toBeNull();
  });
});
