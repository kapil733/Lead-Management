import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "@/env";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function key(): Buffer {
  return Buffer.from(env.FIELD_ENCRYPTION_KEY, "base64");
}

/**
 * AES-256-GCM. Wire format: base64(iv || tag || ciphertext).
 */
export function encryptField(plain: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptField(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("Invalid ciphertext");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

export function last4Digits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return digits;
  return digits.slice(-4);
}

export {
  maskAadhaar,
  maskPan,
  maskAccount,
} from "@/lib/mask";

/** Normalise Aadhaar to 12 digits. */
export function normaliseAadhaar(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (!/^\d{12}$/.test(d)) return null;
  return d;
}

/** Normalise PAN to 10 alphanumeric uppercase. */
export function normalisePan(input: string): string | null {
  const v = input.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(v)) return null;
  return v;
}

/** Bank account: 9–18 digits. */
export function normaliseAccountNumber(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (!/^\d{9,18}$/.test(d)) return null;
  return d;
}
