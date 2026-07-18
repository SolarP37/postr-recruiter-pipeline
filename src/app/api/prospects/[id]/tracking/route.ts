import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { EnvironmentPostrAdapter } from "@/lib/postr";
import { canApplyTrackingAction } from "@/lib/lifecycle";
import { requireSameOrigin } from "@/lib/request-security";

const schema = z.object({ action: z.enum(["replied", "interested", "copy_referral", "referral_sent", "joined"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid tracking action." }, { status: 400 });
  const { id } = await context.params;
  const prospect = await db.prospect.findUnique({ where: { id } });
  if (!prospect) return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
  if (prospect.doNotContact) return NextResponse.json({ error: "Suppressed prospect cannot advance." }, { status: 409 });
  const transition = canApplyTrackingAction(prospect.status, parsed.data.action);
  if (!transition.allowed) {
    return NextResponse.json({ error: transition.reason }, { status: 409 });
  }
  const now = new Date();
  let data = {};
  let referralLink: string | undefined;
  if (parsed.data.action === "replied") data = { status: "REPLIED" as const };
  if (parsed.data.action === "interested") data = { status: "INTERESTED" as const };
  if (parsed.data.action === "copy_referral") {
    try { referralLink = new EnvironmentPostrAdapter().getRecruiterLink(); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Referral link unavailable." }, { status: 409 }); }
    data = { referralLinkGeneratedAt: prospect.referralLinkGeneratedAt || now, referralLinkCopiedAt: now };
  }
  if (parsed.data.action === "referral_sent") data = { status: "REFERRAL_SENT" as const, referralLinkGeneratedAt: prospect.referralLinkGeneratedAt || now, referralLinkSentAt: now };
  if (parsed.data.action === "joined") data = { status: "JOINED" as const, joinedAt: now };
  await db.prospect.update({ where: { id }, data });
  await audit(`TRACKING_${parsed.data.action.toUpperCase()}`, "Prospect", id);
  return NextResponse.json({ message: "Tracking updated.", referralLink });
}
