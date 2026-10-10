import { describe, expect, it, beforeEach } from "vitest";
import {
  _resetLoginRateLimitForTests,
  checkLoginRateLimit,
  recordLoginFailure,
} from "@/server/auth/rate-limit";

describe("login rate limit", () => {
  beforeEach(() => {
    _resetLoginRateLimitForTests();
  });

  it("allows under 5 failures", () => {
    for (let i = 0; i < 4; i++) {
      recordLoginFailure("a@demo.test", "1.1.1.1");
    }
    expect(checkLoginRateLimit("a@demo.test", "1.1.1.1")).toEqual({ ok: true });
  });

  it("blocks after 5 failures", () => {
    for (let i = 0; i < 5; i++) {
      recordLoginFailure("a@demo.test", "1.1.1.1");
    }
    const result = checkLoginRateLimit("a@demo.test", "1.1.1.1");
    expect(result.ok).toBe(false);
  });

  it("is keyed by email+ip", () => {
    for (let i = 0; i < 5; i++) {
      recordLoginFailure("a@demo.test", "1.1.1.1");
    }
    expect(checkLoginRateLimit("a@demo.test", "2.2.2.2").ok).toBe(true);
    expect(checkLoginRateLimit("b@demo.test", "1.1.1.1").ok).toBe(true);
  });
});
