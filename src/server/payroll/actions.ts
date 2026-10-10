"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";
import {
  requireRole,
  isActionResult,
  type SessionUser,
} from "@/server/auth/session";
import { fail, ok, type ActionResult } from "@/server/action-result";
import {
  batchMarkSchema,
  clientIdSchema,
  clientInputSchema,
  documentIdSchema,
  employeeCoreSchema,
  employeeStatutorySchema,
  adjustmentIdSchema,
  adjustmentInputSchema,
  holidayIdSchema,
  holidayInputSchema,
  lockMonthSchema,
  recalculateRunSchema,
  revealFieldSchema,
  salaryStructureInputSchema,
  statutoryConfigInputSchema,
  unlockMonthSchema,
} from "@/lib/validators/payroll";
import { createClient, updateClient } from "@/server/payroll/clients";
import {
  createContractEmployee,
  revealSensitiveField,
  updateContractEmployeeCore,
  updateEmployeeStatutory,
} from "@/server/payroll/employees";
import { addSalaryStructure } from "@/server/payroll/salary";
import { deleteDocument } from "@/server/payroll/documents";
import { batchMarkAttendance } from "@/server/payroll/attendance/mark";
import {
  lockAttendanceMonth,
  unlockAttendanceMonth,
} from "@/server/payroll/attendance/lock";
import { applyAttendanceImport } from "@/server/payroll/attendance/import";
import type { ImportDiffRow } from "@/lib/payroll/attendance-types";
import {
  deleteHoliday,
  upsertHoliday,
} from "@/server/payroll/holidays";
import {
  previewEmployeePayroll,
  recalculatePayrollRun,
} from "@/server/payroll/runs";
import { createStatutoryConfig } from "@/server/payroll/statutory";
import {
  deleteAdjustment,
  upsertAdjustment,
} from "@/server/payroll/adjustments";
import {
  consumeRateLimit,
  RATE_LIMITS,
} from "@/server/security/rate-limit";

async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null
  );
}

function authFail<T>(gate: ActionResult<SessionUser>): ActionResult<T> {
  if (!gate.ok) {
    return fail(gate.error.code, gate.error.message, gate.error.fieldErrors);
  }
  return fail("FORBIDDEN", "Not authorised");
}

async function requireAdmin() {
  return requireRole(Role.ADMIN);
}

export async function createClientAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Invalid client data");
  }
  const result = await createClient({
    data: parsed.data,
    actorId: gate.id,
    ip: await clientIp(),
  });
  revalidatePath("/admin/payroll/clients");
  return ok({ id: result.data.id });
}

export async function updateClientAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = clientIdSchema.and(clientInputSchema).safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Invalid client data");
  }
  const { id, ...data } = parsed.data;
  const result = await updateClient({
    id,
    data,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("NOT_FOUND", result.error);
  revalidatePath("/admin/payroll/clients");
  return ok({ id: result.data.id });
}

export async function createContractEmployeeAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = employeeCoreSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid data",
    );
  }
  const result = await createContractEmployee({
    data: parsed.data,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("CONFLICT", result.error);
  revalidatePath("/admin/payroll/employees");
  return ok({ id: result.data.id });
}

export async function updateContractEmployeeAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = employeeCoreSchema
    .extend({ id: z.string().min(1) })
    .safeParse(input);
  if (!parsed.success) {
    return fail(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid data",
    );
  }
  const { id, ...data } = parsed.data;
  const result = await updateContractEmployeeCore({
    id,
    data,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("CONFLICT", result.error);
  revalidatePath("/admin/payroll/employees");
  revalidatePath(`/admin/payroll/employees/${id}`);
  return ok({ id: result.data.id });
}

export async function updateEmployeeStatutoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = employeeStatutorySchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid data",
    );
  }
  const result = await updateEmployeeStatutory({
    data: parsed.data,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("VALIDATION", result.error);
  revalidatePath(`/admin/payroll/employees/${parsed.data.employeeId}`);
  return ok(result.data);
}

export async function revealSensitiveFieldAction(
  input: unknown,
): Promise<ActionResult<{ field: string; value: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const rl = consumeRateLimit(
    `reveal:${gate.id}`,
    RATE_LIMITS.sensitiveReveal,
  );
  if (!rl.ok) {
    return fail(
      "RATE_LIMIT",
      `Too many reveal attempts. Try again in ${rl.retryAfterSeconds}s.`,
    );
  }
  const parsed = revealFieldSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "Invalid request");
  const result = await revealSensitiveField({
    ...parsed.data,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("NOT_FOUND", result.error);
  return ok(result.data);
}

export async function addSalaryStructureAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = salaryStructureInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid salary",
    );
  }
  const result = await addSalaryStructure({
    data: parsed.data,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("CONFLICT", result.error);
  revalidatePath(`/admin/payroll/employees/${parsed.data.employeeId}`);
  return ok({ id: result.data.id });
}

export async function deleteDocumentAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = documentIdSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "id required");
  const result = await deleteDocument({
    id: parsed.data.id,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("NOT_FOUND", result.error);
  revalidatePath("/admin/payroll/employees");
  return ok(result.data);
}

export async function batchMarkAttendanceAction(
  input: unknown,
): Promise<ActionResult<{ written: number; cleared: number }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = batchMarkSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid");
  }
  const result = await batchMarkAttendance({
    month: parsed.data.month,
    cells: parsed.data.cells,
    actorId: gate.id,
  });
  if (!result.ok) return fail("CONFLICT", result.error);
  revalidatePath("/admin/payroll/attendance");
  return ok(result.data);
}

export async function lockMonthAction(
  input: unknown,
): Promise<ActionResult<{ month: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = lockMonthSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "Invalid month");
  const result = await lockAttendanceMonth({
    month: parsed.data.month,
    treatUnmarkedAsAbsent: parsed.data.treatUnmarkedAsAbsent,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("CONFLICT", result.error);
  revalidatePath("/admin/payroll/attendance");
  revalidatePath("/admin/payroll/runs");
  revalidatePath(`/admin/payroll/runs/${parsed.data.month}`);
  return ok({ month: parsed.data.month });
}

export async function unlockMonthAction(
  input: unknown,
): Promise<ActionResult<{ month: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = unlockMonthSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "Invalid month");
  const result = await unlockAttendanceMonth({
    month: parsed.data.month,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("CONFLICT", result.error);
  revalidatePath("/admin/payroll/attendance");
  revalidatePath("/admin/payroll/runs");
  revalidatePath(`/admin/payroll/runs/${parsed.data.month}`);
  return ok({ month: parsed.data.month });
}

export async function applyAttendanceImportAction(
  input: unknown,
): Promise<ActionResult<{ written: number; cleared: number }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = z
    .object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      diffs: z.array(
        z.object({
          employeeId: z.string(),
          employeeCode: z.string(),
          fullName: z.string(),
          date: z.string(),
          current: z.string(),
          incoming: z.string(),
          action: z.enum(["set", "clear", "unchanged", "skip"]),
        }),
      ),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "Invalid import payload");
  const result = await applyAttendanceImport({
    month: parsed.data.month,
    diffs: parsed.data.diffs as ImportDiffRow[],
    actorId: gate.id,
  });
  if (!result.ok) return fail("CONFLICT", result.error);
  revalidatePath("/admin/payroll/attendance");
  return ok(result.data);
}

export async function upsertHolidayAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = holidayInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid");
  }
  const result = await upsertHoliday({
    ...parsed.data,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("CONFLICT", result.error);
  revalidatePath("/admin/payroll/holidays");
  revalidatePath("/admin/payroll/attendance");
  return ok({ id: result.data.id });
}

export async function deleteHolidayAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = holidayIdSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "id required");
  const result = await deleteHoliday({
    id: parsed.data.id,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("NOT_FOUND", result.error);
  revalidatePath("/admin/payroll/holidays");
  revalidatePath("/admin/payroll/attendance");
  return ok({ id: parsed.data.id });
}

export async function recalculateRunAction(
  input: unknown,
): Promise<ActionResult<{ lineCount: number; runId: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = recalculateRunSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "Invalid month");
  const result = await recalculatePayrollRun({
    month: parsed.data.month,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("CONFLICT", result.error);
  revalidatePath("/admin/payroll/runs");
  revalidatePath(`/admin/payroll/runs/${parsed.data.month}`);
  return ok(result.data);
}

export async function createStatutoryConfigAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = statutoryConfigInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid");
  }
  const result = await createStatutoryConfig({
    data: parsed.data,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("CONFLICT", result.error);
  revalidatePath("/admin/payroll/settings");
  return ok({ id: result.data.id });
}

export async function upsertAdjustmentAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = adjustmentInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid");
  }
  const result = await upsertAdjustment({
    ...parsed.data,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("CONFLICT", result.error);
  revalidatePath(`/admin/payroll/runs/${parsed.data.month}`);
  revalidatePath(`/admin/payroll/employees/${parsed.data.employeeId}`);
  return ok(result.data);
}

export async function deleteAdjustmentAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = adjustmentIdSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "id required");
  const result = await deleteAdjustment({
    id: parsed.data.id,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) return fail("CONFLICT", result.error);
  revalidatePath("/admin/payroll/runs");
  return ok({ id: parsed.data.id });
}

export async function previewPayrollAction(input: unknown) {
  const gate = await requireAdmin();
  if (isActionResult(gate)) return authFail(gate);
  const parsed = z
    .object({
      employeeId: z.string().min(1),
      month: z.string().regex(/^\d{4}-\d{2}$/),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "Invalid");
  const result = await previewEmployeePayroll(parsed.data);
  if (!result.ok) return fail("NOT_FOUND", result.error);
  return ok(result.data);
}
