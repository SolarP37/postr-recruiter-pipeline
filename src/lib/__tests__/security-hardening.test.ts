import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginRateLimiter } from "@/lib/login-rate-limit";
import {
  canApplyReviewAction,
  canApplyTrackingAction,
} from "@/lib/lifecycle";
import { privacyHash } from "@/lib/privacy";
import { isSameOriginRequest } from "@/lib/request-security";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("same-origin mutation protection", () => {
  it("accepts the configured application origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://recruit.example.com");
    const headers = new Headers({ origin: "https://recruit.example.com" });
    expect(isSameOriginRequest({ url: "https://internal/api", headers })).toBe(true);
  });

  it("rejects a foreign origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://recruit.example.com");
    const headers = new Headers({ origin: "https://attacker.example" });
    expect(isSameOriginRequest({ url: "https://internal/api", headers })).toBe(false);
  });

  it("requires an Origin header in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isSameOriginRequest({
      url: "https://recruit.example.com/api",
      headers: new Headers(),
    })).toBe(false);
  });
});

describe("login attempt throttling", () => {
  it("blocks after the configured number of failures", () => {
    const limiter = new LoginRateLimiter(3, 60_000);
    limiter.recordFailure("key", 1_000);
    limiter.recordFailure("key", 2_000);
    limiter.recordFailure("key", 3_000);
    expect(limiter.check("key", 3_001).allowed).toBe(false);
  });

  it("expires old failures and resets successful accounts", () => {
    const limiter = new LoginRateLimiter(2, 1_000);
    limiter.recordFailure("key", 1_000);
    limiter.recordFailure("key", 1_100);
    expect(limiter.check("key", 2_101).allowed).toBe(true);
    limiter.recordFailure("key", 2_200);
    limiter.reset("key");
    expect(limiter.check("key", 2_201).allowed).toBe(true);
  });
});

describe("prospect lifecycle guards", () => {
  it("blocks review edits after outreach begins", () => {
    expect(canApplyReviewAction("SENT", "edit").allowed).toBe(false);
  });

  it("always allows suppression", () => {
    expect(canApplyReviewAction("JOINED", "suppress").allowed).toBe(true);
  });

  it("requires interest before sending a referral", () => {
    expect(canApplyTrackingAction("REPLIED", "referral_sent").allowed).toBe(false);
    expect(canApplyTrackingAction("INTERESTED", "referral_sent").allowed).toBe(true);
  });

  it("requires a sent referral before confirming signup", () => {
    expect(canApplyTrackingAction("INTERESTED", "joined").allowed).toBe(false);
    expect(canApplyTrackingAction("REFERRAL_SENT", "joined").allowed).toBe(true);
  });
});

describe("privacy-safe audit identifiers", () => {
  it("produces a stable hash without retaining the address", () => {
    const hashed = privacyHash("creator@example.com");
    expect(hashed).toHaveLength(64);
    expect(hashed).not.toContain("creator@example.com");
    expect(hashed).toBe(privacyHash("creator@example.com"));
  });
});
