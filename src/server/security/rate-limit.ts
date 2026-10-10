/**
 * Generic in-memory sliding-window rate limiter.
 * Suitable for single-instance / warm serverless; see OQ-011 for Redis.
 */

export type RateLimitOptions = {
  /** Max hits allowed in the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

function prune(hits: number[], now: number, windowMs: number): number[] {
  return hits.filter((t) => now - t < windowMs);
}

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket) return { ok: true };
  bucket.hits = prune(bucket.hits, now, opts.windowMs);
  if (bucket.hits.length >= opts.max) {
    const oldest = bucket.hits[0]!;
    const retryAfterSeconds = Math.ceil(
      (opts.windowMs - (now - oldest)) / 1000,
    );
    return { ok: false, retryAfterSeconds };
  }
  return { ok: true };
}

/** Record a hit. Call after a successful check (or on failure paths that should count). */
export function hitRateLimit(key: string, opts: RateLimitOptions): void {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = prune(bucket.hits, now, opts.windowMs);
  bucket.hits.push(now);
  buckets.set(key, bucket);
}

/** Check then hit atomically for “consume on attempt” semantics. */
export function consumeRateLimit(
  key: string,
  opts: RateLimitOptions,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const check = checkRateLimit(key, opts);
  if (!check.ok) return check;
  hitRateLimit(key, opts);
  return { ok: true };
}

export function _resetAllRateLimitsForTests(): void {
  buckets.clear();
}

/** Presets used across the app. */
export const RATE_LIMITS = {
  claim: { max: 30, windowMs: 60_000 } satisfies RateLimitOptions,
  importCommit: { max: 10, windowMs: 15 * 60_000 } satisfies RateLimitOptions,
  sensitiveReveal: { max: 20, windowMs: 15 * 60_000 } satisfies RateLimitOptions,
  export: { max: 30, windowMs: 15 * 60_000 } satisfies RateLimitOptions,
} as const;
