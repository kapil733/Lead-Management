import "server-only";

import { Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { writeAudit } from "@/server/audit/write";
import { generateTempPassword } from "@/server/telecallers/password";
import type { CreateTelecallerInput } from "@/lib/validators/telecallers";

export async function createTelecaller(input: {
  data: CreateTelecallerInput;
  actorId: string;
  ip?: string | null;
}) {
  const email = input.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false as const, error: "Email already in use" };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: {
      name: input.data.name,
      email,
      passwordHash,
      role: Role.EMPLOYEE,
      isActive: true,
      mustChangePassword: true,
    },
  });

  await writeAudit({
    actorId: input.actorId,
    action: "TELECALLER_CREATED",
    entityType: "User",
    entityId: user.id,
    meta: { email: user.email, name: user.name },
    ip: input.ip,
  });

  return {
    ok: true as const,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      tempPassword,
    },
  };
}

export async function resetTelecallerPassword(input: {
  userId: string;
  actorId: string;
  ip?: string | null;
}) {
  const user = await prisma.user.findFirst({
    where: { id: input.userId, role: Role.EMPLOYEE },
  });
  if (!user) {
    return { ok: false as const, error: "Telecaller not found" };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: true,
    },
  });

  await writeAudit({
    actorId: input.actorId,
    action: "TELECALLER_PASSWORD_RESET",
    entityType: "User",
    entityId: user.id,
    meta: { email: user.email },
    ip: input.ip,
  });

  return {
    ok: true as const,
    data: { id: user.id, email: user.email, tempPassword },
  };
}

export async function setTelecallerActive(input: {
  userId: string;
  isActive: boolean;
  actorId: string;
  ip?: string | null;
}) {
  const user = await prisma.user.findFirst({
    where: { id: input.userId, role: Role.EMPLOYEE },
  });
  if (!user) {
    return { ok: false as const, error: "Telecaller not found" };
  }

  if (user.isActive === input.isActive) {
    return {
      ok: true as const,
      data: { id: user.id, isActive: user.isActive },
    };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isActive: input.isActive },
  });

  await writeAudit({
    actorId: input.actorId,
    action: input.isActive ? "TELECALLER_ACTIVATED" : "TELECALLER_DEACTIVATED",
    entityType: "User",
    entityId: user.id,
    meta: { email: user.email, previous: user.isActive },
    ip: input.ip,
  });

  return {
    ok: true as const,
    data: { id: updated.id, isActive: updated.isActive },
  };
}
