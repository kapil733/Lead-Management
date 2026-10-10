import { z } from "zod";
import { CallOutcome } from "@prisma/client";

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
