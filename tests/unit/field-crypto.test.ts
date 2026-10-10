import "dotenv/config";
import { describe, expect, it } from "vitest";
import {
  decryptField,
  encryptField,
  last4Digits,
  normaliseAadhaar,
  normalisePan,
  normaliseAccountNumber,
} from "@/server/crypto/fields";
import { maskAadhaar, maskPan, maskAccount } from "@/lib/mask";

describe("field encryption", () => {
  it("round-trips AES-256-GCM", () => {
    const plain = "234567890123";
    const enc = encryptField(plain);
    expect(enc).not.toContain(plain);
    expect(decryptField(enc)).toBe(plain);
    // distinct ciphertexts (random IV)
    expect(encryptField(plain)).not.toBe(enc);
  });

  it("normalises and masks", () => {
    expect(normaliseAadhaar("2345 6789 0123")).toBe("234567890123");
    expect(normalisePan("abcde1234f")).toBe("ABCDE1234F");
    expect(normaliseAccountNumber("1234-5678-9012")).toBe("123456789012");
    expect(last4Digits("234567890123")).toBe("0123");
    expect(maskAadhaar("0123")).toBe("XXXX XXXX 0123");
    expect(maskPan("234F")).toBe("XXXXX234F");
    expect(maskAccount("9012")).toBe("XXXXXX9012");
  });
});
