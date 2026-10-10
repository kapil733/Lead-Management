import { z } from "zod";

export const auditFiltersSchema = z.object({
  action: z.string().trim().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type AuditFilters = z.infer<typeof auditFiltersSchema>;
