import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";
import { privacyHash } from "@/lib/privacy";
import { requireSameOrigin } from "@/lib/request-security";

const schema = z.object({ email: z.string().email().max(254) });

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const normalizedEmail = normalizeEmail(parsed.data.email);
  const optedOutAt = new Date();
  await db.$transaction([
    db.suppressionEntry.upsert({ where: { normalizedEmail }, create: { normalizedEmail, reason: "Public opt-out request" }, update: { reason: "Public opt-out request" } }),
    db.prospect.updateMany({ where: { normalizedEmail }, data: {
      doNotContact: true,
      status: "OPTED_OUT",
      qualificationStatus: "DO_NOT_CONTACT",
      optedOutAt,
      nextFollowUpAt: null,
      suppressionReason: "Public opt-out request",
    } }),
  ]);
  await audit("PUBLIC_OPT_OUT", "SuppressionEntry", undefined, {
    emailHash: privacyHash(normalizedEmail),
  });
  return NextResponse.json({ ok: true });
}
