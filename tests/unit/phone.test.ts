import { describe, expect, it } from "vitest";
import {
  formatPhoneDisplay,
  friendPhoneError,
  isIncompletePhone,
  normalisePhone,
} from "@/lib/phone";

describe("normalisePhone", () => {
  it("accepts plain 10-digit mobiles", () => {
    expect(normalisePhone("9876543210")).toBe("9876543210");
    expect(normalisePhone("6123456789")).toBe("6123456789");
  });

  it("strips +91, 91, leading 0, spaces and dashes", () => {
    expect(normalisePhone("+91 98765-43210")).toBe("9876543210");
    expect(normalisePhone("919876543210")).toBe("9876543210");
    expect(normalisePhone("09876543210")).toBe("9876543210");
  });

  it("rejects invalid numbers", () => {
    expect(normalisePhone("5876543210")).toBeNull();
    expect(normalisePhone("12345")).toBeNull();
    expect(normalisePhone("")).toBeNull();
  });
});

describe("friendPhoneError", () => {
  it("stays quiet while a mobile is still being typed", () => {
    expect(isIncompletePhone("98")).toBe(true);
    expect(friendPhoneError("98", false)).toBeUndefined();
    expect(friendPhoneError("+91 98765", false)).toBeUndefined();
  });

  it("flags a finished number that cannot be a mobile", () => {
    expect(friendPhoneError("5876543210", false)).toMatch(/10-digit/);
    expect(friendPhoneError("98765", true)).toMatch(/10-digit/);
  });

  it("accepts a complete mobile", () => {
    expect(friendPhoneError("98765 43210", true)).toBeUndefined();
    expect(friendPhoneError("+91 9876543210", false)).toBeUndefined();
  });
});

describe("formatPhoneDisplay", () => {
  it("formats as 5+5 groups", () => {
    expect(formatPhoneDisplay("9876543210")).toBe("98765 43210");
  });
});
