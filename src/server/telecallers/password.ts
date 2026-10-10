import { randomBytes } from "crypto";

/** Temp password: ≥10 chars, includes a digit, URL-safe. */
export function generateTempPassword(): string {
  const raw = randomBytes(12).toString("base64url");
  return `Tmp${raw.slice(0, 8)}1`;
}
