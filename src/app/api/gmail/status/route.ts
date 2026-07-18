import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET() {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
  const token = await db.oAuthToken.findUnique({ where: { provider: "google" }, select: { scope: true, expiryDate: true, updatedAt: true } });
  return NextResponse.json({ connected: Boolean(token), token });
}
