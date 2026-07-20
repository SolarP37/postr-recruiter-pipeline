import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";
import { isValidTimeZone } from "@/lib/outreach-schedule";
import { qualificationFromEvidence } from "@/lib/qualification";
import { requireSameOrigin } from "@/lib/request-security";

const schema = z.object({
  leadType: z.enum(["CREATOR", "BRAND"]),
  email: z.string().email().max(254),
  displayName: z.string().trim().max(120).optional(),
  contactFirstName: z.string().trim().max(60).optional(),
  organizationName: z.string().trim().max(120).optional(),
  businessWebsite: z.union([z.literal(""), z.string().url()]).optional(),
  sourcePlatform: z.string().trim().min(1).max(80),
  sourceUrl: z.string().url().max(2048),
  emailSourceType: z.enum([
    "official_website",
    "public_business_profile",
    "public_business_directory",
  ]),
  category: z.string().trim().max(120).optional(),
  personalizationHook: z.string().trim().max(280).optional(),
  personalizationSourceUrl: z.union([z.literal(""), z.string().url()]).optional(),
  publicLocation: z.string().trim().max(120).optional(),
  locationEvidenceUrl: z.union([z.literal(""), z.string().url()]).optional(),
  timeZone: z.string().trim().max(100).optional(),
  preferredSendHourLocal: z.number().int().min(8).max(16).optional(),
  followerCount: z.number().int().nonnegative().nullable().optional(),
  followerCountVerified: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the public contact, source, and evidence fields." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (input.leadType === "BRAND" && !input.organizationName) {
    return NextResponse.json(
      { error: "Organization name is required for a brand lead." },
      { status: 400 },
    );
  }
  if (input.timeZone && !isValidTimeZone(input.timeZone)) {
    return NextResponse.json(
      { error: "Enter a valid IANA time zone, such as America/New_York." },
      { status: 400 },
    );
  }

  const normalizedEmail = normalizeEmail(input.email);
  const [suppressed, duplicateCount] = await Promise.all([
    db.suppressionEntry.findUnique({ where: { normalizedEmail } }),
    db.prospect.count({ where: { normalizedEmail } }),
  ]);
  const checkedAt = new Date();
  const qualificationStatus = qualificationFromEvidence({
    leadType: input.leadType,
    followerCount: input.followerCount ?? null,
    followerCountVerified: input.followerCountVerified || false,
    requestedStatus: "NEEDS_REVIEW",
  });

  const prospect = await db.$transaction(async (transaction) => {
    const created = await transaction.prospect.create({
      data: {
        leadType: input.leadType,
        email: input.email.trim(),
        normalizedEmail,
        displayName: input.displayName || input.organizationName || null,
        creatorFirstName: input.contactFirstName || null,
        organizationName: input.organizationName || null,
        businessWebsite: input.businessWebsite || null,
        sourcePlatform: input.sourcePlatform,
        sourceUrl: input.sourceUrl,
        emailSourceUrl: input.sourceUrl,
        emailSourceType: input.emailSourceType,
        visibleEmailEvidence: `Public business email recorded from ${input.sourceUrl}`,
        creatorCategory: input.category || null,
        personalizationHook: input.personalizationHook || null,
        personalizationSourceUrl:
          input.personalizationSourceUrl || input.sourceUrl,
        personalizationCheckedAt: input.personalizationHook ? checkedAt : null,
        publicLocation: input.publicLocation || null,
        locationEvidenceUrl:
          input.locationEvidenceUrl ||
          (input.publicLocation ? input.sourceUrl : null),
        timeZone: input.timeZone || null,
        preferredSendHourLocal: input.preferredSendHourLocal || 10,
        followerCount: input.followerCount ?? null,
        followerCountVerified: input.followerCountVerified || false,
        qualificationStatus,
        qualificationEvidenceUrl: input.sourceUrl,
        qualificationCheckedAt:
          input.leadType === "CREATOR" &&
          input.followerCountVerified &&
          input.followerCount !== null &&
          input.followerCount !== undefined
            ? checkedAt
            : null,
        notes: [
          input.notes,
          duplicateCount > 0
            ? `Duplicate review required: ${duplicateCount} existing record(s) use this email.`
            : null,
        ]
          .filter(Boolean)
          .join("\n") || null,
        status: suppressed ? "SUPPRESSED" : "NEEDS_REVIEW",
        doNotContact: Boolean(suppressed),
        suppressionReason: suppressed?.reason || null,
      },
    });
    await transaction.auditEvent.createMany({
      data: [
        {
          action: "LEAD_CREATED",
          entityType: "Prospect",
          entityId: created.id,
          metadata: JSON.stringify({
            leadType: input.leadType,
            method: "manual_public_business_contact",
            duplicateCount,
          }),
        },
        {
          action: "PUBLIC_CONTACT_SOURCE_CAPTURED",
          entityType: "Prospect",
          entityId: created.id,
          metadata: JSON.stringify({
            sourcePlatform: input.sourcePlatform,
            sourceUrl: input.sourceUrl,
            sourceType: input.emailSourceType,
          }),
        },
      ],
    });
    return created;
  });

  return NextResponse.json({ id: prospect.id, duplicate: duplicateCount > 0 });
}
