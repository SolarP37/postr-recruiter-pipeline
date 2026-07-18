import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { canSendApprovedDraft } from "@/lib/prospect-guards";

const schema = z.object({ action: z.enum(["approve", "reject", "mark_sent"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid outreach action." }, { status: 400 });
  const message = await db.outreachMessage.findUnique({ where: { id }, include: { prospect: true } });
  if (!message) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  if (parsed.data.action === "approve") {
    if (message.approvalStatus !== "PENDING") return NextResponse.json({ error: "Only pending drafts can be approved." }, { status: 409 });
    await db.outreachMessage.update({ where: { id }, data: { approvalStatus: "APPROVED" } });
  } else if (parsed.data.action === "reject") {
    if (message.sentAt) return NextResponse.json({ error: "Sent outreach cannot be rejected." }, { status: 409 });
    await db.outreachMessage.update({ where: { id }, data: { approvalStatus: "REJECTED" } });
    await db.prospect.update({ where: { id: message.prospectId }, data: { status: "APPROVED" } });
  } else {
    const suppressed = message.prospect.normalizedEmail ? await db.suppressionEntry.findUnique({ where: { normalizedEmail: message.prospect.normalizedEmail } }) : null;
    const guard = canSendApprovedDraft({ approvalStatus: message.approvalStatus, sentAt: message.sentAt, suppressed: Boolean(suppressed), prospectDoNotContact: message.prospect.doNotContact });
    if (!guard.allowed) return NextResponse.json({ error: guard.reason }, { status: 409 });
    const now = new Date();
    await db.$transaction([
      db.outreachMessage.update({ where: { id }, data: { sentAt: now } }),
      db.prospect.update({ where: { id: message.prospectId }, data: { status: "SENT" } }),
    ]);
  }
  await audit(`OUTREACH_${parsed.data.action.toUpperCase()}`, "OutreachMessage", id);
  return NextResponse.json({ message: "Outreach updated." });
}
