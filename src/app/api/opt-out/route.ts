import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email().max(254) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const normalizedEmail = normalizeEmail(parsed.data.email);
  await db.$transaction([
    db.suppressionEntry.upsert({ where: { normalizedEmail }, create: { normalizedEmail, reason: "Public opt-out request" }, update: { reason: "Public opt-out request" } }),
    db.prospect.updateMany({ where: { normalizedEmail }, data: { doNotContact: true, status: "OPTED_OUT" } }),
  ]);
  await audit("PUBLIC_OPT_OUT", "SuppressionEntry", undefined, { normalizedEmail });
  return NextResponse.json({ ok: true });
}
