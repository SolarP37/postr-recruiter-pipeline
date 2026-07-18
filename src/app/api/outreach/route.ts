import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { createCreatorOutreach } from "@/lib/outreach";
import { canCreateOutreach } from "@/lib/prospect-guards";
import { requireSameOrigin } from "@/lib/request-security";

const schema = z.object({ prospectId: z.string().min(1) });

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Prospect is required." }, { status: 400 });
  const prospect = await db.prospect.findUnique({ where: { id: parsed.data.prospectId }, include: { outreachMessages: true } });
  if (!prospect) return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
  const suppressed = prospect.normalizedEmail ? await db.suppressionEntry.findUnique({ where: { normalizedEmail: prospect.normalizedEmail } }) : null;
  const guard = canCreateOutreach({
    status: prospect.status, email: prospect.email, doNotContact: prospect.doNotContact,
    isSuppressed: Boolean(suppressed), hasSentMessage: prospect.outreachMessages.some((item) => item.sentAt),
  });
  if (!guard.allowed) return NextResponse.json({ error: guard.reason }, { status: 409 });
  if (prospect.outreachMessages.some((item) => !item.sentAt && item.approvalStatus !== "REJECTED")) {
    return NextResponse.json({ error: "An active draft already exists." }, { status: 409 });
  }
  const content = createCreatorOutreach(prospect.displayName);
  const message = await db.outreachMessage.create({ data: { prospectId: prospect.id, ...content } });
  await db.prospect.update({ where: { id: prospect.id }, data: { status: "DRAFT_CREATED" } });
  await audit("OUTREACH_PREPARED", "OutreachMessage", message.id, { prospectId: prospect.id });
  return NextResponse.json({ id: message.id });
}
