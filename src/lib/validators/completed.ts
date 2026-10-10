import { z } from "zod";
import { CallOutcome } from "@prisma/client";

export const completedFiltersSchema = z.object({
  from: z.string().optional(), // YYYY-MM-DD
  to: z.string().optional(),
  rating: z.coerce.number().int().min(0).max(5).optional(),
  outcome: z.nativeEnum(CallOutcome).optional(),
  joined: z.enum(["all", "yes", "no"]).default("all"),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type CompletedFilters = z.infer<typeof completedFiltersSchema>;
