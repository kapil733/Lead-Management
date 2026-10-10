/**
 * Login rate limit: 5 failures per 15 minutes per email+IP.
 * Built on the shared in-memory limiter.
 */

import {
  checkRateLimit,
  hitRateLimit,
  _resetAllRateLimitsForTests,
} from "@/server/security/rate-limit";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function loginKey(email: string, ip: string): string {
  return `login:${email.toLowerCase()}|${ip}`;
}

export function checkLoginRateLimit(
  email: string,
  ip: string,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  return checkRateLimit(loginKey(email, ip), {
    max: MAX_FAILURES,
    windowMs: WINDOW_MS,
  });
}

export function recordLoginFailure(email: string, ip: string): void {
  hitRateLimit(loginKey(email, ip), {
    max: MAX_FAILURES,
    windowMs: WINDOW_MS,
  });
}

/** Test helper */
export function _resetLoginRateLimitForTests(): void {
  _resetAllRateLimitsForTests();
}
