import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { canApplyReviewAction } from "@/lib/lifecycle";
import { requireSameOrigin } from "@/lib/request-security";

const requestSchema = z.object({
  action: z.enum(["approve", "edit", "reject", "no_email", "suppress"]),
  email: z.string().optional(),
  displayName: z.string().max(120).nullable().optional(),
  profileBio: z.string().max(500).nullable().optional(),
  creatorCategory: z.string().max(120).nullable().optional(),
  personalizationHook: z.string().max(280).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review action." }, { status: 400 });
  const prospect = await db.prospect.findUnique({ where: { id } });
  if (!prospect) return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
  const transition = canApplyReviewAction(prospect.status, parsed.data.action);
  if (!transition.allowed) {
    return NextResponse.json({ error: transition.reason }, { status: 409 });
  }

  if (parsed.data.action === "approve") {
    if (!prospect.email || !prospect.normalizedEmail) return NextResponse.json({ error: "A valid visible email is required." }, { status: 409 });
    const suppressed = await db.suppressionEntry.findUnique({ where: { normalizedEmail: prospect.normalizedEmail } });
    if (suppressed || prospect.doNotContact) return NextResponse.json({ error: "Suppressed contacts cannot be approved." }, { status: 409 });
    await db.prospect.update({ where: { id }, data: { status: "APPROVED" } });
  } else if (parsed.data.action === "edit") {
    const email = parsed.data.email?.trim() || null;
    if (email && !isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    const normalizedEmail = email ? normalizeEmail(email) : null;
    const suppressed = normalizedEmail ? await db.suppressionEntry.findUnique({ where: { normalizedEmail } }) : null;
    await db.prospect.update({ where: { id }, data: {
      email, normalizedEmail, displayName: parsed.data.displayName?.trim() || null,
      profileBio: parsed.data.profileBio?.trim() || null,
      creatorCategory: parsed.data.creatorCategory?.trim() || null,
      personalizationHook: parsed.data.personalizationHook?.trim() || null,
      notes: parsed.data.notes?.trim() || null, status: suppressed ? "SUPPRESSED" : "NEEDS_REVIEW",
      doNotContact: Boolean(suppressed),
    } });
  } else if (parsed.data.action === "reject") {
    await db.prospect.update({ where: { id }, data: { status: "REJECTED" } });
  } else if (parsed.data.action === "no_email") {
    await db.prospect.update({ where: { id }, data: { email: null, normalizedEmail: null, status: "NO_EMAIL_FOUND" } });
  } else if (parsed.data.action === "suppress") {
    if (!prospect.normalizedEmail) return NextResponse.json({ error: "No email is available to suppress." }, { status: 409 });
    await db.$transaction([
      db.suppressionEntry.upsert({ where: { normalizedEmail: prospect.normalizedEmail }, create: { normalizedEmail: prospect.normalizedEmail, reason: "Manual recruiter suppression" }, update: { reason: "Manual recruiter suppression" } }),
      db.prospect.updateMany({ where: { normalizedEmail: prospect.normalizedEmail }, data: { status: "SUPPRESSED", doNotContact: true } }),
    ]);
  }
  await audit(`PROSPECT_${parsed.data.action.toUpperCase()}`, "Prospect", id);
  return NextResponse.json({ message: "Prospect updated." });
}
