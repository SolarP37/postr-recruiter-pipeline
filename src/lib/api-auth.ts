import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function requireApiSession(): Promise<NextResponse | null> {
  return (await getSession())
    ? null
    : NextResponse.json({ error: "Authentication required." }, { status: 401 });
}
