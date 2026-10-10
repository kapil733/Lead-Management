import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient, Role } from "@prisma/client";
import {
  createTelecaller,
  setTelecallerActive,
  resetTelecallerPassword,
} from "@/server/telecallers/mutations";
import { verifyPassword } from "@/server/auth/password";

const prisma = new PrismaClient();

describe("telecaller management", () => {
  const email = "new-telecaller-phase4@demo.test";
  let adminId: string;
  let createdId: string | undefined;

  afterAll(async () => {
    if (createdId) {
      await prisma.auditLog.deleteMany({ where: { entityId: createdId } });
      await prisma.user.deleteMany({ where: { id: createdId } });
    }
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("creates, resets password, and deactivates", async () => {
    const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    expect(admin).not.toBeNull();
    adminId = admin!.id;

    await prisma.user.deleteMany({ where: { email } });

    const created = await createTelecaller({
      data: { name: "Phase Four", email },
      actorId: adminId,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdId = created.data.id;

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: created.data.id },
    });
    expect(user.role).toBe(Role.EMPLOYEE);
    expect(user.mustChangePassword).toBe(true);
    expect(
      await verifyPassword(created.data.tempPassword, user.passwordHash),
    ).toBe(true);

    const reset = await resetTelecallerPassword({
      userId: created.data.id,
      actorId: adminId,
    });
    expect(reset.ok).toBe(true);
    if (!reset.ok) return;

    const afterReset = await prisma.user.findUniqueOrThrow({
      where: { id: created.data.id },
    });
    expect(
      await verifyPassword(reset.data.tempPassword, afterReset.passwordHash),
    ).toBe(true);

    const deactivated = await setTelecallerActive({
      userId: created.data.id,
      isActive: false,
      actorId: adminId,
    });
    expect(deactivated.ok).toBe(true);
    if (!deactivated.ok) return;
    expect(deactivated.data.isActive).toBe(false);

    const audit = await prisma.auditLog.count({
      where: {
        entityId: created.data.id,
        action: {
          in: [
            "TELECALLER_CREATED",
            "TELECALLER_PASSWORD_RESET",
            "TELECALLER_DEACTIVATED",
          ],
        },
      },
    });
    expect(audit).toBe(3);
  });
});
