import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "postr_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

export type SessionUser = {
  email: string;
  role: "admin";
};

function secretKey(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must contain at least 32 characters.");
    }
    return new TextEncoder().encode(
      "local-development-only-auth-secret-change-before-deploy",
    );
  }
  return new TextEncoder().encode(value);
}

export function isDemoAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_MODE === "demo";
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  if (isDemoAuthEnabled()) {
    if (email === "demo@postr.local" && password === "postr-demo") {
      return { email, role: "admin" };
    }
    return null;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !passwordHash || email !== adminEmail) {
    return null;
  }

  return (await bcrypt.compare(password, passwordHash))
    ? { email, role: "admin" }
    : null;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey());
}

export async function readSessionToken(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.role !== "admin" || !payload.sub) return null;
    return { email: payload.sub, role: "admin" };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}
