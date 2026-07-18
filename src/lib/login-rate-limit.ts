import { createHash } from "node:crypto";
import { normalizeEmail } from "@/lib/email";

type AttemptState = { failures: number[] };

export class LoginRateLimiter {
  private attempts = new Map<string, AttemptState>();

  constructor(
    private readonly maximumFailures = 5,
    private readonly windowMs = 15 * 60 * 1000,
  ) {}

  check(key: string, now = Date.now()) {
    const cutoff = now - this.windowMs;
    const failures = (this.attempts.get(key)?.failures ?? []).filter(
      (timestamp) => timestamp > cutoff,
    );
    if (failures.length === 0) this.attempts.delete(key);
    else this.attempts.set(key, { failures });
    const allowed = failures.length < this.maximumFailures;
    const retryAfterSeconds = allowed
      ? 0
      : Math.max(1, Math.ceil((failures[0] + this.windowMs - now) / 1000));
    return { allowed, retryAfterSeconds };
  }

  recordFailure(key: string, now = Date.now()) {
    const current = this.check(key, now);
    const failures = this.attempts.get(key)?.failures ?? [];
    this.attempts.set(key, { failures: [...failures, now] });
    return current;
  }

  reset(key: string) {
    this.attempts.delete(key);
  }
}

const globalForLimiter = globalThis as unknown as {
  postrLoginRateLimiter?: LoginRateLimiter;
};

export const loginRateLimiter =
  globalForLimiter.postrLoginRateLimiter ?? new LoginRateLimiter();

if (process.env.NODE_ENV !== "production") {
  globalForLimiter.postrLoginRateLimiter = loginRateLimiter;
}

export function loginThrottleKey(request: Request, email: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256")
    .update(`${ip}:${normalizeEmail(email)}`)
    .digest("hex");
}
