import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const unauthorized = await requireApiSession(); if (unauthorized) return unauthorized;
  await db.oAuthToken.deleteMany({ where: { provider: "google" } });
  await audit("GMAIL_DISCONNECTED", "OAuthToken", "google");
  const acceptsHtml = request.headers.get("accept")?.includes("text/html");
  return acceptsHtml ? NextResponse.redirect(new URL("/settings", request.url), 303) : NextResponse.json({ disconnected: true });
}
