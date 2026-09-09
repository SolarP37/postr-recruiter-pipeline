import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { GMAIL_SCOPES, googleOAuthClient } from "@/lib/gmail";

export async function GET() {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
  try {
    const state = randomBytes(32).toString("base64url");
    const client = googleOAuthClient();
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [...GMAIL_SCOPES],
      state,
      include_granted_scopes: false,
    });
    const response = NextResponse.redirect(url);
    response.cookies.set("google_oauth_state", state, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 600,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OAuth configuration failed." }, { status: 503 });
  }
}
