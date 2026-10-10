import { z } from "zod";
import {
  AdjustmentType,
  ContractEmployeeStatus,
  DayDivisor,
  DocumentType,
} from "@prisma/client";

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const clientInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(120).optional().nullable(),
  contactPhone: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const clientIdSchema = z.object({ id: z.string().min(1) });

export const salaryComponentSchema = z.object({
  key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(80),
  amountPaise: z.number().int().nonnegative(),
  pfWage: z.boolean(),
  esicWage: z.boolean(),
});

export const salaryStructureInputSchema = z
  .object({
    employeeId: z.string().min(1),
    effectiveFrom: ymd,
    monthlyGrossPaise: z.number().int().positive(),
    components: z.array(salaryComponentSchema).min(1),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const sum = data.components.reduce((a, c) => a + c.amountPaise, 0);
    if (sum !== data.monthlyGrossPaise) {
      ctx.addIssue({
        code: "custom",
        message: `Components must sum to monthly gross (got ${sum}, expected ${data.monthlyGrossPaise})`,
        path: ["components"],
      });
    }
  });

export const employeeCoreSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, "Alphanumeric code"),
  fullName: z.string().trim().min(1).max(160),
  fatherName: z.string().trim().max(160).optional().nullable(),
  gender: z.string().trim().min(1).max(40),
  dob: ymd,
  mobile: z.string().trim().min(10).max(15),
  email: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
  addressLine: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "6-digit pincode"),
  designation: z.string().trim().min(1).max(120),
  department: z.string().trim().max(120).optional().nullable(),
  clientId: z.string().min(1).optional().nullable(),
  deploymentSite: z.string().trim().max(200).optional().nullable(),
  dateOfJoining: ymd,
  dateOfExit: ymd.optional().nullable(),
  status: z.nativeEnum(ContractEmployeeStatus).default("ACTIVE"),
  weeklyOffDays: z.array(z.number().int().min(0).max(6)).default([0]),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const employeeStatutorySchema = z.object({
  employeeId: z.string().min(1),
  aadhaar: z.string().trim().max(20).optional().nullable(),
  pan: z.string().trim().max(12).optional().nullable(),
  uan: z.string().trim().max(20).optional().nullable(),
  pfApplicable: z.boolean(),
  pfOnActualWage: z.boolean(),
  esicApplicable: z.boolean(),
  esicIpNumber: z.string().trim().max(30).optional().nullable(),
  bankName: z.string().trim().max(120).optional().nullable(),
  accountHolder: z.string().trim().max(160).optional().nullable(),
  accountNumber: z.string().trim().max(30).optional().nullable(),
  ifsc: z
    .string()
    .trim()
    .max(11)
    .optional()
    .nullable()
    .refine(
      (v) => !v || /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(v),
      "Invalid IFSC",
    ),
  emergencyContactName: z.string().trim().max(160).optional().nullable(),
  emergencyContactPhone: z.string().trim().max(15).optional().nullable(),
  nomineeName: z.string().trim().max(160).optional().nullable(),
  nomineeRelation: z.string().trim().max(80).optional().nullable(),
});

export const revealFieldSchema = z.object({
  employeeId: z.string().min(1),
  field: z.enum(["aadhaar", "pan", "account"]),
});

export const documentUploadMetaSchema = z.object({
  employeeId: z.string().min(1),
  type: z.nativeEnum(DocumentType),
});

export const documentIdSchema = z.object({ id: z.string().min(1) });

export const employeeListFiltersSchema = z.object({
  status: z.nativeEnum(ContractEmployeeStatus).optional(),
  clientId: z.string().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const DOC_MAX_BYTES = 5 * 1024 * 1024;

const monthKey = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Use YYYY-MM");

export const attendanceStatusSchema = z.enum([
  "PRESENT",
  "HALF_DAY",
  "ABSENT",
  "PAID_LEAVE",
  "WEEKLY_OFF",
  "HOLIDAY_WORKED",
]);

export const batchMarkSchema = z.object({
  month: monthKey,
  cells: z
    .array(
      z.object({
        employeeId: z.string().min(1),
        date: ymd,
        status: attendanceStatusSchema.nullable(),
      }),
    )
    .max(5000),
});

export const lockMonthSchema = z.object({
  month: monthKey,
  treatUnmarkedAsAbsent: z.boolean().default(false),
});

export const unlockMonthSchema = z.object({
  month: monthKey,
});

export const holidayInputSchema = z.object({
  date: ymd,
  name: z.string().trim().min(1).max(120),
  isPaid: z.boolean().default(true),
});

export const holidayIdSchema = z.object({ id: z.string().min(1) });

export const monthQuerySchema = z.object({
  month: monthKey.optional(),
});

export const recalculateRunSchema = z.object({
  month: monthKey,
});

export const statutoryConfigInputSchema = z.object({
  effectiveFrom: ymd,
  pfEmployeeRate: z.number().positive().max(1),
  pfEmployerEpsRate: z.number().positive().max(1),
  pfEmployerEpfRate: z.number().nonnegative().max(1),
  pfWageCeilingPaise: z.number().int().positive(),
  edliRate: z.number().nonnegative().max(1),
  pfAdminRate: z.number().nonnegative().max(1),
  esicEmployeeRate: z.number().positive().max(1),
  esicEmployerRate: z.number().positive().max(1),
  esicWageCeilingPaise: z.number().int().positive(),
  dayDivisor: z.nativeEnum(DayDivisor),
});

export const adjustmentInputSchema = z.object({
  id: z.string().optional(),
  employeeId: z.string().min(1),
  month: monthKey,
  type: z.nativeEnum(AdjustmentType),
  amountPaise: z.number().int().nonnegative(),
  note: z.string().trim().max(500).optional().nullable(),
});

export const adjustmentIdSchema = z.object({ id: z.string().min(1) });

export type ClientInput = z.infer<typeof clientInputSchema>;
export type EmployeeCoreInput = z.infer<typeof employeeCoreSchema>;
export type EmployeeStatutoryInput = z.infer<typeof employeeStatutorySchema>;
export type SalaryStructureInput = z.infer<typeof salaryStructureInputSchema>;
