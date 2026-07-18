import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE, verifyCredentials } from "@/lib/auth";
import { loginRateLimiter, loginThrottleKey } from "@/lib/login-rate-limit";
import { requireSameOrigin } from "@/lib/request-security";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  const throttleKey = loginThrottleKey(request, parsed.data.email);
  const limit = loginRateLimiter.check(throttleKey);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again later." },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSeconds) },
      },
    );
  }
  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    loginRateLimiter.recordFailure(throttleKey);
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  loginRateLimiter.reset(throttleKey);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(user), sessionCookieOptions());
  return response;
}
