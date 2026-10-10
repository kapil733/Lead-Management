import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient, LeadStatus, Role } from "@prisma/client";
import { mapRows, classifyMappedRows } from "@/server/leads/classify";
import {
  commitLeadImport,
  revertImportBatch,
} from "@/server/leads/import-batch";
import { hashPassword } from "@/server/auth/password";
import { parseLeadImportFile } from "@/server/leads/parse-file";

const prisma = new PrismaClient();
const PREFIX = "9"; // valid Indian start

function phone(n: number) {
  return `${PREFIX}${String(800000000 + n).slice(-9)}`;
}

describe("lead import + revert", () => {
  let adminId: string;
  const phones = [phone(1), phone(2), phone(3), phone(1)]; // last is in-file dup

  beforeAll(async () => {
    const passwordHash = await hashPassword("TestAdmin@12345");
    const admin = await prisma.user.upsert({
      where: { email: "import-test-admin@demo.test" },
      create: {
        email: "import-test-admin@demo.test",
        name: "Import Tester",
        role: Role.ADMIN,
        passwordHash,
        mustChangePassword: false,
      },
      update: {},
    });
    adminId = admin.id;
    await prisma.lead.deleteMany({ where: { phone: { in: phones } } });
  });

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { phone: { in: [...new Set(phones)] } } });
    await prisma.importBatch.deleteMany({
      where: { uploadedById: adminId, fileName: "integration-test.csv" },
    });
    await prisma.$disconnect();
  });

  it("classifies valid, duplicate-in-file, invalid, and imports then reverts NEW unclaimed", async () => {
    const csv = [
      "Phone,Name,City,Trade,Experience",
      `${phones[0]},Alpha,Pune,EV Technician,3`,
      `${phones[1]},Beta,Delhi,Electrician,5`,
      `${phones[2]},Gamma,Noida,Helper,2`,
      `${phones[3]},AlphaDup,Pune,EV Technician,3`,
      `12345,Bad,X,Y,1`,
    ].join("\n");

    const parsed = await parseLeadImportFile(
      Buffer.from(csv, "utf8"),
      "integration-test.csv",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const mapped = mapRows(parsed.data.headers, parsed.data.rows, {
      Phone: "phone",
      Name: "name",
      City: "city",
      Trade: "trade",
      Experience: "experienceYears",
    });
    const classified = await classifyMappedRows(mapped);

    expect(classified.validNew).toHaveLength(3);
    expect(classified.duplicates.length).toBeGreaterThanOrEqual(1);
    expect(classified.invalid.length).toBeGreaterThanOrEqual(1);

    const batch = await commitLeadImport({
      fileName: "integration-test.csv",
      uploadedById: adminId,
      validNew: classified.validNew,
      duplicatesCount: classified.duplicates.length,
      invalidCount: classified.invalid.length,
      totalRows: classified.totalRows,
    });

    expect(batch.imported).toBe(3);
    const leads = await prisma.lead.findMany({
      where: { importBatchId: batch.id },
    });
    expect(leads).toHaveLength(3);
    expect(leads.every((l) => l.status === LeadStatus.NEW)).toBe(true);

    // Claim one lead → should not be deleted on revert
    const keep = leads[0]!;
    await prisma.case.create({
      data: {
        leadId: keep.id,
        employeeId: adminId,
        status: "CLOSED",
        outcome: "CONNECTED",
        rating: 3,
        remarks: "test case for revert guard",
        closedAt: new Date(),
      },
    });
    await prisma.lead.update({
      where: { id: keep.id },
      data: { status: LeadStatus.CLOSED },
    });

    const revert = await revertImportBatch({
      batchId: batch.id,
      actorId: adminId,
    });
    expect(revert.ok).toBe(true);
    if (!revert.ok) return;
    expect(revert.data.deleted).toBe(2);

    const remaining = await prisma.lead.findMany({
      where: { importBatchId: batch.id },
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe(keep.id);

    await prisma.case.deleteMany({ where: { leadId: keep.id } });
    await prisma.lead.delete({ where: { id: keep.id } });
  });
});
