import { z } from "zod";

export const createTelecallerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Valid email required").max(200),
});

export const telecallerIdSchema = z.object({
  userId: z.string().min(1),
});

export type CreateTelecallerInput = z.infer<typeof createTelecallerSchema>;
