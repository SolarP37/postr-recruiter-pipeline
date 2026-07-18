import { google } from "googleapis";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { connectedGoogleClient, gmailRawMessage } from "@/lib/gmail";
import { canSendApprovedDraft } from "@/lib/prospect-guards";
import { requireSameOrigin } from "@/lib/request-security";

const schema = z.object({ messageId: z.string().min(1) });

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request); if (crossSite) return crossSite;
  const unauthorized = await requireApiSession(); if (unauthorized) return unauthorized;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Message is required." }, { status: 400 });
  const message = await db.outreachMessage.findUnique({ where: { id: parsed.data.messageId }, include: { prospect: true } });
  if (!message || !message.prospect.email) return NextResponse.json({ error: "Outreach message not found." }, { status: 404 });
  if (message.gmailDraftId) return NextResponse.json({ error: "A Gmail draft already exists." }, { status: 409 });
  const suppressed = message.prospect.normalizedEmail ? await db.suppressionEntry.findUnique({ where: { normalizedEmail: message.prospect.normalizedEmail } }) : null;
  const guard = canSendApprovedDraft({ approvalStatus: message.approvalStatus, sentAt: message.sentAt, suppressed: Boolean(suppressed), prospectDoNotContact: message.prospect.doNotContact });
  if (!guard.allowed) return NextResponse.json({ error: guard.reason }, { status: 409 });
  const auth = await connectedGoogleClient();
  const gmail = google.gmail({ version: "v1", auth });
  const result = await gmail.users.drafts.create({ userId: "me", requestBody: { message: { raw: gmailRawMessage(message.prospect.email, message.subject, message.body) } } });
  if (!result.data.id) return NextResponse.json({ error: "Gmail did not return a draft ID." }, { status: 502 });
  await db.$transaction([
    db.outreachMessage.update({ where: { id: message.id }, data: { gmailDraftId: result.data.id } }),
    db.prospect.update({ where: { id: message.prospectId }, data: { gmailDraftId: result.data.id, status: "DRAFT_CREATED" } }),
  ]);
  await audit("GMAIL_DRAFT_CREATED", "OutreachMessage", message.id, { gmailDraftId: result.data.id });
  return NextResponse.json({ gmailDraftId: result.data.id });
}
