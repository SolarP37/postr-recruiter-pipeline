import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { proxy } from "@/proxy";

describe("protected-page proxy", () => {
  beforeEach(() => {
    vi.stubEnv(
      "AUTH_SECRET",
      "proxy-test-secret-with-at-least-32-characters",
    );
  });

  it("redirects before rendering when no session is present", async () => {
    const response = await proxy(
      new NextRequest("https://example.com/prospects"),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.com/login?next=%2Fprospects",
    );
  });

  it("allows a valid administrator session", async () => {
    const token = await createSessionToken({
      email: "admin@example.com",
      role: "admin",
    });
    const request = new NextRequest("https://example.com/capture", {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
    });
    const response = await proxy(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rejects a tampered session token", async () => {
    const request = new NextRequest("https://example.com/settings", {
      headers: { cookie: `${SESSION_COOKIE}=invalid-token` },
    });
    expect((await proxy(request)).status).toBe(307);
  });
});
