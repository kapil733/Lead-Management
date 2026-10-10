import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetAllRateLimitsForTests,
  checkRateLimit,
  consumeRateLimit,
  hitRateLimit,
} from "@/server/security/rate-limit";

describe("generic rate limit", () => {
  beforeEach(() => {
    _resetAllRateLimitsForTests();
  });

  it("allows under max then blocks", () => {
    const opts = { max: 3, windowMs: 60_000 };
    expect(consumeRateLimit("k", opts).ok).toBe(true);
    expect(consumeRateLimit("k", opts).ok).toBe(true);
    expect(consumeRateLimit("k", opts).ok).toBe(true);
    const blocked = consumeRateLimit("k", opts);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("isolates keys", () => {
    const opts = { max: 1, windowMs: 60_000 };
    hitRateLimit("a", opts);
    expect(checkRateLimit("a", opts).ok).toBe(false);
    expect(checkRateLimit("b", opts).ok).toBe(true);
  });
});
