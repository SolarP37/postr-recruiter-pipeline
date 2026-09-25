import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { googleOAuthClient } from "@/lib/gmail";
import { encryptToken } from "@/lib/token-crypto";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth callback state." }, { status: 400 });
  }
  try {
    const client = googleOAuthClient();
    const { tokens } = await client.getToken(code);
    await db.oAuthToken.upsert({
      where: { provider: "google" },
      create: {
        provider: "google",
        encryptedAccessToken: tokens.access_token ? encryptToken(tokens.access_token) : null,
        encryptedRefreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        scope: tokens.scope || null,
        tokenType: tokens.token_type || null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      update: {
        encryptedAccessToken: tokens.access_token ? encryptToken(tokens.access_token) : undefined,
        encryptedRefreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        scope: tokens.scope || undefined,
        tokenType: tokens.token_type || undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
    await audit("GMAIL_CONNECTED", "OAuthToken", "google");
    const response = NextResponse.redirect(new URL("/settings", request.url));
    response.cookies.set("google_oauth_state", "", { path: "/", maxAge: 0 });
    return response;
  } catch {
    console.error("Google OAuth callback failed; exception detail was redacted.");
    return NextResponse.json({ error: "Unable to connect Gmail." }, { status: 500 });
  }
}
