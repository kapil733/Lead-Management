import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient, Role } from "@prisma/client";
import { mapRows, classifyMappedRows } from "@/server/leads/classify";
import { commitLeadImport, revertImportBatch } from "@/server/leads/import-batch";
import { hashPassword } from "@/server/auth/password";
import { parseLeadImportFile } from "@/server/leads/parse-file";
import { buildErrorReportBuffer } from "@/server/leads/error-report";

const prisma = new PrismaClient();

/** Deterministic phones in 95xxxxxxxx range to avoid colliding with seed 6–9 prefixes used elsewhere. */
function phoneAt(i: number): string {
  return `95${String(10000000 + i).padStart(8, "0")}`;
}

describe("5k lead import acceptance", () => {
  let adminId: string;
  const ROW_COUNT = 5000;
  const phones = Array.from({ length: ROW_COUNT }, (_, i) => phoneAt(i));

  beforeAll(async () => {
    const passwordHash = await hashPassword("TestAdmin@12345");
    const admin = await prisma.user.upsert({
      where: { email: "import-5k-admin@demo.test" },
      create: {
        email: "import-5k-admin@demo.test",
        name: "Import 5k Tester",
        role: Role.ADMIN,
        passwordHash,
        mustChangePassword: false,
      },
      update: {},
    });
    adminId = admin.id;
    await prisma.lead.deleteMany({ where: { phone: { in: phones } } });
  }, 60_000);

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { phone: { startsWith: "95" } } });
    await prisma.importBatch.deleteMany({
      where: { uploadedById: adminId, fileName: "five-k-test.csv" },
    });
    await prisma.$disconnect();
  }, 60_000);

  it(
    "imports 5k rows with correct dedupe/invalid counts and supports revert",
    async () => {
      // 5000 unique + 50 in-file dups + 30 invalid
      const lines = ["Phone,Name,City,Trade,Experience"];
      for (let i = 0; i < ROW_COUNT; i++) {
        lines.push(
          `${phones[i]},Person ${i},Pune,EV Technician,${(i % 10) + 1}`,
        );
      }
      for (let i = 0; i < 50; i++) {
        lines.push(`${phones[i]},Dup ${i},Pune,EV Technician,1`);
      }
      for (let i = 0; i < 30; i++) {
        lines.push(`bad-${i},Bad ${i},X,Y,1`);
      }

      const parsed = await parseLeadImportFile(
        Buffer.from(lines.join("\n"), "utf8"),
        "five-k-test.csv",
      );
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      expect(parsed.data.totalRows).toBe(ROW_COUNT + 50 + 30);

      const mapped = mapRows(parsed.data.headers, parsed.data.rows, {
        Phone: "phone",
        Name: "name",
        City: "city",
        Trade: "trade",
        Experience: "experienceYears",
      });
      const classified = await classifyMappedRows(mapped);

      expect(classified.validNew).toHaveLength(ROW_COUNT);
      expect(classified.duplicates).toHaveLength(50);
      expect(classified.invalid).toHaveLength(30);

      const report = await buildErrorReportBuffer({
        invalid: classified.invalid,
        duplicates: classified.duplicates,
      });
      expect(report.byteLength).toBeGreaterThan(1000);

      const batch = await commitLeadImport({
        fileName: "five-k-test.csv",
        uploadedById: adminId,
        validNew: classified.validNew,
        duplicatesCount: classified.duplicates.length,
        invalidCount: classified.invalid.length,
        totalRows: classified.totalRows,
      });

      expect(batch.imported).toBe(ROW_COUNT);

      const revert = await revertImportBatch({
        batchId: batch.id,
        actorId: adminId,
      });
      expect(revert.ok).toBe(true);
      if (!revert.ok) return;
      expect(revert.data.deleted).toBe(ROW_COUNT);

      const left = await prisma.lead.count({
        where: { importBatchId: batch.id },
      });
      expect(left).toBe(0);
    },
    120_000,
  );
});
