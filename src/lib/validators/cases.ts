import { z } from "zod";
import { CallOutcome } from "@prisma/client";

export const BIKE_TYPE_OPTIONS = [
  { value: "PETROL_BIKE", label: "Petrol bike technician" },
  { value: "EV_BIKE", label: "EV bike technician" },
] as const;

export const bikeTypeSchema = z.enum(["PETROL_BIKE", "EV_BIKE"]);

export type BikeTypeValue = z.infer<typeof bikeTypeSchema>;

export function bikeTypeLabel(value: string | null | undefined): string | null {
  return BIKE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? null;
}

export const DESIGNATION_SUGGESTIONS = [
  "EV Technician",
  "Electrician",
  "Mechanic",
  "Battery Technician",
  "Charging Station Technician",
  "Helper",
  "Other",
] as const;

export const referralRowSchema = z
  .object({
    phone: z.string().trim().optional().default(""),
    name: z.string().trim().optional(),
    experienceText: z.string().trim().optional(),
    designation: z.string().trim().optional(),
  })
  .superRefine((row, ctx) => {
    const hasOther =
      Boolean(row.name?.trim()) ||
      Boolean(row.experienceText?.trim()) ||
      Boolean(row.designation?.trim());
    if (hasOther && !row.phone?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Phone is required when other friend fields are filled",
        path: ["phone"],
      });
    }
  });

export const closeCaseSchema = z
  .object({
    caseId: z.string().min(1),
    outcome: z.nativeEnum(CallOutcome),
    rating: z.number().int().min(0).max(5).optional().nullable(),
    remarks: z.string().trim().optional().default(""),
    referrals: z.array(referralRowSchema).default([]),
    /** Omitted fields are left unchanged. Empty string clears city or location. */
    city: z.string().trim().max(80).optional(),
    location: z.string().trim().max(120).optional(),
    bikeType: z.union([bikeTypeSchema, z.literal("")]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.outcome === CallOutcome.CONNECTED) {
      if (data.rating == null) {
        ctx.addIssue({
          code: "custom",
          message: "Rating is required when connected",
          path: ["rating"],
        });
      }
    }
    if (
      data.outcome === CallOutcome.CONNECTED ||
      data.outcome === CallOutcome.CALL_BACK_LATER
    ) {
      if (!data.remarks || data.remarks.length < 3) {
        ctx.addIssue({
          code: "custom",
          message:
            data.outcome === CallOutcome.CALL_BACK_LATER
              ? "Add a remark of at least 3 characters for reconnect"
              : "Remarks must be at least 3 characters when connected",
          path: ["remarks"],
        });
      }
    }
  });

export type CloseCaseInput = z.infer<typeof closeCaseSchema>;
