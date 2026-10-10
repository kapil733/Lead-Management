import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.string().url().optional(),
  FIELD_ENCRYPTION_KEY: z
    .string()
    .min(1)
    .refine((v) => {
      try {
        return Buffer.from(v, "base64").length === 32;
      } catch {
        return false;
      }
    }, "FIELD_ENCRYPTION_KEY must be 32 bytes base64"),
  /** Optional — when unset, payroll docs store under `.data/uploads`. */
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  SEED_DEMO: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    FIELD_ENCRYPTION_KEY: process.env.FIELD_ENCRYPTION_KEY,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || undefined,
    SEED_DEMO: process.env.SEED_DEMO,
  });

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${message}`);
  }

  return parsed.data;
}

export const env = loadEnv();
