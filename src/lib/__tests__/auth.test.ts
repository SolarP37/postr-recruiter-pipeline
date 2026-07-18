import { afterEach, describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken, verifyCredentials } from "@/lib/auth";

const originalAuthMode = process.env.AUTH_MODE;
const originalAuthSecret = process.env.AUTH_SECRET;

afterEach(() => {
  process.env.AUTH_MODE = originalAuthMode;
  process.env.AUTH_SECRET = originalAuthSecret;
});

describe("authorization", () => {
  it("accepts the local demo account only in demo mode", async () => {
    process.env.AUTH_MODE = "demo";
    expect(await verifyCredentials("demo@postr.local", "postr-demo")).toEqual({
      email: "demo@postr.local", role: "admin",
    });
    expect(await verifyCredentials("demo@postr.local", "wrong")).toBeNull();
  });

  it("round-trips a signed admin session", async () => {
    process.env.AUTH_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
    const token = await createSessionToken({ email: "admin@example.com", role: "admin" });
    expect(await readSessionToken(token)).toEqual({ email: "admin@example.com", role: "admin" });
  });

  it("rejects a tampered session", async () => {
    process.env.AUTH_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
    const token = await createSessionToken({ email: "admin@example.com", role: "admin" });
    expect(await readSessionToken(`${token}broken`)).toBeNull();
  });
});
