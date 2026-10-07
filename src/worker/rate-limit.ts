export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(key: string): RateLimitResult;
}

interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
  /** Upper bound on tracked keys so a flood of distinct IPs cannot grow memory unbounded. */
  maxKeys?: number;
}

/**
 * Sliding-window-log limiter held in isolate memory. Best effort only: each Worker isolate
 * has its own counters and they reset on eviction. Pair it with a Cloudflare WAF
 * rate-limiting rule for a hard limit.
 */
export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
  maxKeys = 5000,
}: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>();

  function prune(currentTime: number): void {
    for (const [key, times] of hits) {
      const last = times[times.length - 1];
      if (last === undefined || last <= currentTime - windowMs) hits.delete(key);
    }
    // Still too many live keys: drop the least recently used (Map keeps insertion order).
    for (const key of hits.keys()) {
      if (hits.size <= maxKeys) break;
      hits.delete(key);
    }
  }

  return {
    consume(key) {
      const currentTime = now();
      const recent = (hits.get(key) ?? []).filter((time) => time > currentTime - windowMs);
      const oldest = recent[0];

      if (recent.length >= limit && oldest !== undefined) {
        hits.set(key, recent);
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - currentTime) / 1000)),
        };
      }

      recent.push(currentTime);
      hits.delete(key); // re-insert so insertion order tracks recency
      hits.set(key, recent);
      if (hits.size > maxKeys) prune(currentTime);
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
