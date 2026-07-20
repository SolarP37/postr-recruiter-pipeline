import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  createBrandOutreach,
  createBrandPersonalizedOpening,
  createBrandSubjectOptions,
  createCreatorOutreach,
  createPersonalizedOpening,
  createSubjectOptions,
  renderEditedHtml,
  replacePersonalizedOpening,
} from "@/lib/outreach";
import { canSendApprovedDraft } from "@/lib/prospect-guards";
import { requireSameOrigin } from "@/lib/request-security";

const schema = z.object({
  action: z.enum([
    "approve",
    "reject",
    "mark_sent",
    "edit",
    "regenerate_subject",
    "regenerate_opening",
    "regenerate_full",
  ]),
  subject: z.string().trim().min(1).max(180).optional(),
  body: z.string().trim().min(1).max(10000).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid outreach action." }, { status: 400 });
  const message = await db.outreachMessage.findUnique({ where: { id }, include: { prospect: true } });
  if (!message) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  const contextData = {
    creatorFirstName: message.prospect.creatorFirstName,
    displayName: message.prospect.displayName,
    creatorCategory: message.prospect.creatorCategory,
    personalizationHook: message.prospect.personalizationHook,
  };
  const brandContextData = {
    contactFirstName: message.prospect.creatorFirstName,
    organizationName:
      message.prospect.organizationName || message.prospect.displayName,
    brandCategory: message.prospect.creatorCategory,
    personalizationHook: message.prospect.personalizationHook,
  };
  if (parsed.data.action === "edit") {
    if (message.sentAt) return NextResponse.json({ error: "Sent outreach cannot be edited." }, { status: 409 });
    if (!parsed.data.subject || !parsed.data.body) {
      return NextResponse.json({ error: "Subject and body are required." }, { status: 400 });
    }
    await db.outreachMessage.update({
      where: { id },
      data: {
        subject: parsed.data.subject,
        body: parsed.data.body,
        htmlBody: renderEditedHtml(
          parsed.data.body,
          message.prospect.leadType === "BRAND" ? "brand" : "creator",
        ),
        approvalStatus: "PENDING",
      },
    });
  } else if (parsed.data.action === "regenerate_subject") {
    if (message.sentAt) return NextResponse.json({ error: "Sent outreach cannot be regenerated." }, { status: 409 });
    await db.outreachMessage.update({
      where: { id },
      data: {
        subject:
          message.prospect.leadType === "BRAND"
            ? createBrandSubjectOptions(brandContextData)[0].subject
            : createSubjectOptions(contextData)[0].subject,
        approvalStatus: "PENDING",
      },
    });
  } else if (parsed.data.action === "regenerate_opening") {
    if (message.sentAt) return NextResponse.json({ error: "Sent outreach cannot be regenerated." }, { status: 409 });
    const body = replacePersonalizedOpening(
      message.body,
      message.prospect.leadType === "BRAND"
        ? createBrandPersonalizedOpening(brandContextData)
        : createPersonalizedOpening(contextData),
    );
    await db.outreachMessage.update({
      where: { id },
      data: {
        body,
        htmlBody: renderEditedHtml(
          body,
          message.prospect.leadType === "BRAND" ? "brand" : "creator",
        ),
        approvalStatus: "PENDING",
      },
    });
  } else if (parsed.data.action === "regenerate_full") {
    if (message.sentAt) return NextResponse.json({ error: "Sent outreach cannot be regenerated." }, { status: 409 });
    const regenerated =
      message.prospect.leadType === "BRAND"
        ? createBrandOutreach(brandContextData)
        : createCreatorOutreach(contextData);
    await db.outreachMessage.update({
      where: { id },
      data: {
        subject: regenerated.subject,
        body: regenerated.body,
        htmlBody: regenerated.htmlBody,
        approvalStatus: "PENDING",
      },
    });
  } else if (parsed.data.action === "approve") {
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
      db.prospect.update({
        where: { id: message.prospectId },
        data: {
          status: "SENT",
          lastContactedAt: now,
          nextFollowUpAt: null,
          followUpStage: Math.max(
            message.prospect.followUpStage,
            message.followUpNumber,
          ),
        },
      }),
    ]);
  }
  await audit(`OUTREACH_${parsed.data.action.toUpperCase()}`, "OutreachMessage", id);
  return NextResponse.json({ message: "Outreach updated." });
}
