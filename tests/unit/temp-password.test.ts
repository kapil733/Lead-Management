import { describe, expect, it } from "vitest";
import { generateTempPassword } from "@/server/telecallers/password";
import { validatePasswordStrength } from "@/server/auth/password";

describe("generateTempPassword", () => {
  it("meets strength rules", () => {
    for (let i = 0; i < 20; i++) {
      const pw = generateTempPassword();
      expect(validatePasswordStrength(pw)).toBeNull();
      expect(pw.length).toBeGreaterThanOrEqual(10);
      expect(/\d/.test(pw)).toBe(true);
    }
  });
});
