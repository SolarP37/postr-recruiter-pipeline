import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import {
  reprocessScreenshotProspect,
  ScreenshotReprocessError,
} from "@/lib/capture-processing";
import { db } from "@/lib/db";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { canApplyReviewAction } from "@/lib/lifecycle";
import { createTailoredOutreach } from "@/lib/outreach";
import {
  formatScheduledTime,
  isValidTimeZone,
  suggestedSendAt,
} from "@/lib/outreach-schedule";
import { qualificationFromEvidence } from "@/lib/qualification";
import { requireSameOrigin } from "@/lib/request-security";

const requestSchema = z.object({
  action: z.enum([
    "approve",
    "edit",
    "reject",
    "no_email",
    "reprocess",
    "suppress",
  ]),
  email: z.string().optional(),
  leadType: z.enum(["CREATOR", "BRAND"]).optional(),
  displayName: z.string().max(120).nullable().optional(),
  creatorFirstName: z.string().max(60).nullable().optional(),
  username: z.string().max(120).nullable().optional(),
  organizationName: z.string().max(120).nullable().optional(),
  businessWebsite: z.string().max(2048).nullable().optional(),
  emailSourceUrl: z.string().max(2048).nullable().optional(),
  emailSourceType: z.string().max(120).nullable().optional(),
  profileBio: z.string().max(500).nullable().optional(),
  creatorCategory: z.string().max(120).nullable().optional(),
  personalizationHook: z.string().max(280).nullable().optional(),
  personalizationSourceUrl: z.string().max(2048).nullable().optional(),
  publicLocation: z.string().max(120).nullable().optional(),
  locationEvidenceUrl: z.string().max(2048).nullable().optional(),
  timeZone: z.string().max(100).nullable().optional(),
  preferredSendHourLocal: z.union([
    z.string().max(2),
    z.number().int().min(8).max(16),
  ]).nullable().optional(),
  followerCount: z.union([z.string().max(20), z.number().int().nonnegative()]).nullable().optional(),
  followerCountVerified: z.boolean().optional(),
  qualificationStatus: z.enum([
    "QUALIFIED",
    "LIKELY_QUALIFIED",
    "NEEDS_REVIEW",
    "NOT_YET_QUALIFIED",
    "DO_NOT_CONTACT",
  ]).optional(),
  qualificationEvidenceUrl: z.string().max(2048).nullable().optional(),
  outreachCountryCode: z.string().max(2).nullable().optional(),
  outreachPermissionBasis: z.enum([
    "UNKNOWN",
    "EXPRESS_CONSENT",
    "EXISTING_BUSINESS_RELATIONSHIP",
    "CORPORATE_BUSINESS_CONTACT",
    "PUBLICLY_LISTED_BUSINESS_CONTACT",
  ]).optional(),
  outreachPermissionEvidence: z.string().max(2048).nullable().optional(),
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

  if (parsed.data.action === "reprocess") {
    try {
      const result = await reprocessScreenshotProspect(id);
      return NextResponse.json({
        message: result.emailFound
          ? `OCR refreshed${
              result.confidence == null
                ? ""
                : ` at ${Math.round(result.confidence * 100)}% confidence`
            }. Review the extracted evidence before approval.`
          : "OCR refreshed. No visible business email was found.",
      });
    } catch (error) {
      if (error instanceof ScreenshotReprocessError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status },
        );
      }
      return NextResponse.json(
        { error: "OCR reprocessing failed. The original record was preserved." },
        { status: 502 },
      );
    }
  } else if (parsed.data.action === "approve") {
    if (!prospect.email || !prospect.normalizedEmail) return NextResponse.json({ error: "A valid visible email is required." }, { status: 409 });
    if (!["QUALIFIED", "LIKELY_QUALIFIED"].includes(prospect.qualificationStatus)) {
      return NextResponse.json({ error: "Only qualified or likely qualified creators can be approved for outreach." }, { status: 409 });
    }
    if (!prospect.qualificationEvidenceUrl || !prospect.qualificationCheckedAt) {
      return NextResponse.json({ error: "Qualification evidence and its review timestamp are required." }, { status: 409 });
    }
    const suppressed = await db.suppressionEntry.findUnique({ where: { normalizedEmail: prospect.normalizedEmail } });
    if (suppressed || prospect.doNotContact) return NextResponse.json({ error: "Suppressed contacts cannot be approved." }, { status: 409 });
    const duplicateCount = await db.prospect.count({
      where: { normalizedEmail: prospect.normalizedEmail },
    });
    if (duplicateCount > 1) {
      return NextResponse.json(
        { error: "Resolve duplicate contacts before approving outreach." },
        { status: 409 },
      );
    }
    const activeDraft = await db.outreachMessage.findFirst({
      where: {
        prospectId: id,
        sentAt: null,
        approvalStatus: { not: "REJECTED" },
      },
      select: { id: true },
    });
    if (activeDraft) {
      return NextResponse.json(
        { error: "An active outreach draft already exists." },
        { status: 409 },
      );
    }
    const content = createTailoredOutreach(prospect);
    const suggestion = suggestedSendAt({
      earliestAt: new Date(),
      timeZone: prospect.timeZone,
      preferredHourLocal: prospect.preferredSendHourLocal,
    });
    const [, message] = await db.$transaction([
      db.prospect.update({
        where: { id },
        data: { status: "DRAFT_CREATED" },
      }),
      db.outreachMessage.create({
        data: {
          prospectId: id,
          subject: content.subject,
          body: content.body,
          htmlBody: content.htmlBody,
          scheduledFor: suggestion.scheduledFor,
        },
      }),
    ]);
    await audit("PROSPECT_APPROVE", "Prospect", id);
    await audit("OUTREACH_PREPARED", "OutreachMessage", message.id, {
      prospectId: id,
      generatedFrom: prospect.leadType.toLowerCase(),
      reviewRequired: true,
      scheduledFor: suggestion.scheduledFor.toISOString(),
    });
    return NextResponse.json({
      message: `Prospect approved and a tailored outreach draft was created for review. Suggested window: ${formatScheduledTime(
        suggestion.scheduledFor,
        prospect.timeZone,
      )}${suggestion.usedTimeZone ? ` (${prospect.timeZone})` : " (timezone not recorded)"}.`,
    });
  } else if (parsed.data.action === "edit") {
    const email = parsed.data.email?.trim() || null;
    if (email && !isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    const normalizedEmail = email ? normalizeEmail(email) : null;
    const suppressed = normalizedEmail ? await db.suppressionEntry.findUnique({ where: { normalizedEmail } }) : null;
    const followerValue = parsed.data.followerCount;
    const followerCount =
      followerValue === null || followerValue === ""
        ? null
        : Number(followerValue);
    if (followerCount !== null && (!Number.isInteger(followerCount) || followerCount < 0)) {
      return NextResponse.json({ error: "Follower count must be a non-negative whole number." }, { status: 400 });
    }
    const timeZone = parsed.data.timeZone?.trim() || null;
    if (timeZone && !isValidTimeZone(timeZone)) {
      return NextResponse.json(
        { error: "Enter a valid IANA time zone, such as America/New_York." },
        { status: 400 },
      );
    }
    const preferredHourValue = parsed.data.preferredSendHourLocal;
    const preferredSendHourLocal =
      preferredHourValue === null || preferredHourValue === undefined
        ? prospect.preferredSendHourLocal
        : Number(preferredHourValue);
    if (
      !Number.isInteger(preferredSendHourLocal) ||
      preferredSendHourLocal < 8 ||
      preferredSendHourLocal > 16
    ) {
      return NextResponse.json(
        { error: "Preferred local send hour must be between 8 and 16." },
        { status: 400 },
      );
    }
    const qualificationStatus = qualificationFromEvidence({
      leadType: parsed.data.leadType || prospect.leadType,
      followerCount,
      followerCountVerified: parsed.data.followerCountVerified || false,
      requestedStatus: parsed.data.qualificationStatus || "NEEDS_REVIEW",
    });
    const doNotContact = Boolean(suppressed) || qualificationStatus === "DO_NOT_CONTACT";
    const outreachCountryCode = parsed.data.outreachCountryCode?.trim().toUpperCase() || null;
    if (outreachCountryCode && !/^[A-Z]{2}$/.test(outreachCountryCode)) {
      return NextResponse.json({ error: "Use a two-letter country code such as US, CA, or GB." }, { status: 400 });
    }
    const permissionEvidence = parsed.data.outreachPermissionEvidence?.trim() || null;
    await db.prospect.update({ where: { id }, data: {
      email, normalizedEmail, displayName: parsed.data.displayName?.trim() || null,
      leadType: parsed.data.leadType || prospect.leadType,
      creatorFirstName: parsed.data.creatorFirstName?.trim() || null,
      username: parsed.data.username?.trim() || null,
      organizationName: parsed.data.organizationName?.trim() || null,
      businessWebsite: parsed.data.businessWebsite?.trim() || null,
      emailSourceUrl: parsed.data.emailSourceUrl?.trim() || null,
      emailSourceType: parsed.data.emailSourceType?.trim() || null,
      profileBio: parsed.data.profileBio?.trim() || null,
      creatorCategory: parsed.data.creatorCategory?.trim() || null,
      personalizationHook: parsed.data.personalizationHook?.trim() || null,
      personalizationSourceUrl: parsed.data.personalizationSourceUrl?.trim() || null,
      personalizationCheckedAt: parsed.data.personalizationSourceUrl ? new Date() : null,
      publicLocation: parsed.data.publicLocation?.trim() || null,
      locationEvidenceUrl: parsed.data.locationEvidenceUrl?.trim() || null,
      timeZone,
      preferredSendHourLocal,
      followerCount,
      followerCountVerified: parsed.data.followerCountVerified || false,
      qualificationStatus,
      qualificationEvidenceUrl: parsed.data.qualificationEvidenceUrl?.trim() || null,
      qualificationCheckedAt: parsed.data.qualificationEvidenceUrl ? new Date() : null,
      outreachCountryCode,
      outreachPermissionBasis: parsed.data.outreachPermissionBasis || "UNKNOWN",
      outreachPermissionEvidence: permissionEvidence,
      outreachPermissionCheckedAt: permissionEvidence ? new Date() : null,
      notes: parsed.data.notes?.trim() || null,
      status: doNotContact ? "SUPPRESSED" : "NEEDS_REVIEW",
      doNotContact,
      suppressionReason: doNotContact ? (suppressed?.reason || "Manual qualification decision") : null,
    } });
  } else if (parsed.data.action === "reject") {
    await db.prospect.update({ where: { id }, data: { status: "REJECTED" } });
  } else if (parsed.data.action === "no_email") {
    await db.prospect.update({ where: { id }, data: { email: null, normalizedEmail: null, status: "NO_EMAIL_FOUND" } });
  } else if (parsed.data.action === "suppress") {
    if (!prospect.normalizedEmail) return NextResponse.json({ error: "No email is available to suppress." }, { status: 409 });
    await db.$transaction([
      db.suppressionEntry.upsert({ where: { normalizedEmail: prospect.normalizedEmail }, create: { normalizedEmail: prospect.normalizedEmail, reason: "Manual recruiter suppression" }, update: { reason: "Manual recruiter suppression" } }),
      db.prospect.updateMany({ where: { normalizedEmail: prospect.normalizedEmail }, data: { status: "SUPPRESSED", qualificationStatus: "DO_NOT_CONTACT", doNotContact: true, suppressionReason: "Manual recruiter suppression" } }),
    ]);
  }
  await audit(`PROSPECT_${parsed.data.action.toUpperCase()}`, "Prospect", id);
  return NextResponse.json({ message: "Prospect updated." });
}
