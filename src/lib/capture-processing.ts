import type { LeadType } from "@prisma/client";
import {
  assetStorageForReference,
  configuredAssetStorage,
} from "@/lib/asset-storage";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";
import {
  isAllowedMimeType,
  type AllowedMimeType,
  validateUpload,
} from "@/lib/upload";
import { getVisionProvider } from "@/lib/vision";

export type ScreenshotMetadata = {
  leadType: LeadType;
  platform: "instagram" | "tiktok" | "youtube" | "other";
  sourceUrl?: string | null;
  organizationName?: string | null;
  businessWebsite?: string | null;
  campaign?: string | null;
  captureSource?: "web_upload" | "gmail_attachment";
};

export async function processScreenshotCapture(input: {
  bytes: Uint8Array;
  mimeType: AllowedMimeType;
  metadata: ScreenshotMetadata;
}): Promise<string[]> {
  const { bytes, mimeType, metadata } = input;
  const storage = configuredAssetStorage();
  let storedReference: string | null = null;
  let committed = false;

  try {
    const extraction =
      await getVisionProvider().extractPublicContactInformation({
        bytes,
        mimeType,
      });
    const assetReference = (
      await storage.store({ bytes, mimeType })
    ).reference;
    storedReference = assetReference;

    const extractedItems = extraction.emails.length
      ? extraction.emails
      : [null];
    const preparedItems = await Promise.all(
      extractedItems.map(async (item) => {
        const normalizedEmail = item ? normalizeEmail(item.email) : null;
        const suppressed = normalizedEmail
          ? await db.suppressionEntry.findUnique({
              where: { normalizedEmail },
            })
          : null;
        return { item, normalizedEmail, suppressed: Boolean(suppressed) };
      }),
    );

    const prospectIds = await db.$transaction(async (transaction) => {
      const ids: string[] = [];
      for (const prepared of preparedItems) {
        const { item, normalizedEmail, suppressed } = prepared;
        const prospect = await transaction.prospect.create({
          data: {
            email: item?.email || null,
            normalizedEmail,
            leadType: metadata.leadType,
            displayName: extraction.displayName,
            organizationName:
              metadata.organizationName ||
              (metadata.leadType === "BRAND"
                ? extraction.displayName
                : null),
            businessWebsite: metadata.businessWebsite || null,
            sourcePlatform: metadata.platform,
            sourceUrl: metadata.sourceUrl || null,
            emailSourceUrl: metadata.sourceUrl || null,
            emailSourceType: metadata.sourceUrl
              ? "public_creator_profile"
              : metadata.captureSource === "gmail_attachment"
                ? "emailed_public_profile_screenshot"
                : "uploaded_public_profile_screenshot",
            campaign: metadata.campaign || null,
            screenshotPath: assetReference,
            visibleEmailEvidence: item?.visibleContext || null,
            extractionConfidence: item?.confidence || null,
            profileBio: extraction.profileBio,
            creatorCategory: extraction.creatorCategory,
            personalizationHook: extraction.personalizationHook,
            personalizationSourceUrl: metadata.sourceUrl || null,
            personalizationCheckedAt: extraction.personalizationHook
              ? new Date()
              : null,
            publicLocation: extraction.publicLocation,
            locationEvidenceUrl: metadata.sourceUrl || null,
            notes: extraction.notes.join("\n") || null,
            status: item
              ? suppressed
                ? "SUPPRESSED"
                : "NEEDS_REVIEW"
              : "NO_EMAIL_FOUND",
            doNotContact: suppressed,
            sourceAssets: {
              create: {
                filePath: assetReference,
                mimeType,
                extractedText:
                  item?.visibleContext ||
                  extraction.notes.join("\n") ||
                  null,
              },
            },
          },
        });
        ids.push(prospect.id);
        await transaction.auditEvent.create({
          data: {
            action: "CAPTURE_PROCESSED",
            entityType: "Prospect",
            entityId: prospect.id,
            metadata: JSON.stringify({
              provider: process.env.VISION_PROVIDER || "mock",
              captureSource: metadata.captureSource || "web_upload",
              emailFound: Boolean(item),
            }),
          },
        });
      }
      return ids;
    });

    committed = true;
    return prospectIds;
  } finally {
    if (storedReference && !committed) {
      await storage.remove(storedReference).catch(() => undefined);
    }
  }
}

export class ScreenshotReprocessError extends Error {
  constructor(
    message: string,
    readonly status = 409,
  ) {
    super(message);
  }
}

async function storedBodyBytes(
  body: ArrayBuffer | ReadableStream<Uint8Array>,
) {
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  return new Uint8Array(await new Response(body).arrayBuffer());
}

function combinedExtractionNotes(
  existing: string | null,
  extracted: string[],
) {
  const notes = new Set(
    [existing, ...extracted]
      .flatMap((value) => value?.split("\n") || [])
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return [...notes].join("\n") || null;
}

export async function reprocessScreenshotProspect(id: string) {
  if (process.env.VISION_PROVIDER !== "openai") {
    throw new ScreenshotReprocessError(
      "Real OCR must be enabled before reprocessing screenshots.",
    );
  }

  const prospect = await db.prospect.findUnique({
    where: { id },
    include: {
      sourceAssets: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!prospect) {
    throw new ScreenshotReprocessError("Prospect not found.", 404);
  }
  if (
    !["CAPTURED", "NEEDS_REVIEW", "REJECTED", "NO_EMAIL_FOUND"].includes(
      prospect.status,
    )
  ) {
    throw new ScreenshotReprocessError(
      "Only review-stage prospects can be reprocessed.",
    );
  }

  const asset = prospect.sourceAssets[0];
  if (!asset) {
    throw new ScreenshotReprocessError(
      "No protected screenshot is available for this prospect.",
    );
  }
  const stored = await assetStorageForReference(asset.filePath).read(
    asset.filePath,
  );
  if (!stored) {
    throw new ScreenshotReprocessError(
      "The protected screenshot is unavailable.",
      404,
    );
  }
  const mimeType = isAllowedMimeType(stored.contentType)
    ? stored.contentType
    : isAllowedMimeType(asset.mimeType)
      ? asset.mimeType
      : null;
  if (!mimeType) {
    throw new ScreenshotReprocessError(
      "The protected screenshot type is unsupported.",
    );
  }

  const bytes = await storedBodyBytes(stored.body);
  const validation = validateUpload({
    size: bytes.byteLength,
    type: mimeType,
    bytes,
  });
  if (!validation.valid) {
    throw new ScreenshotReprocessError(validation.error);
  }

  const extraction =
    await getVisionProvider().extractPublicContactInformation({
      bytes,
      mimeType: validation.mimeType,
    });
  const currentMatch = prospect.normalizedEmail
    ? extraction.emails.find(
        (item) => normalizeEmail(item.email) === prospect.normalizedEmail,
      )
    : undefined;
  if (!currentMatch && extraction.emails.length > 1) {
    throw new ScreenshotReprocessError(
      "Multiple visible emails were found. Upload the screenshot again so each contact can receive its own review record.",
    );
  }
  const item = currentMatch || extraction.emails[0] || null;
  const normalizedEmail = item ? normalizeEmail(item.email) : null;
  const suppression = normalizedEmail
    ? await db.suppressionEntry.findUnique({
        where: { normalizedEmail },
      })
    : null;
  const doNotContact = prospect.doNotContact || Boolean(suppression);

  await db.$transaction([
    db.prospect.update({
      where: { id },
      data: {
        email: item?.email || null,
        normalizedEmail,
        displayName: extraction.displayName,
        organizationName:
          prospect.organizationName ||
          (prospect.leadType === "BRAND"
            ? extraction.displayName
            : null),
        visibleEmailEvidence: item?.visibleContext || null,
        extractionConfidence: item?.confidence || null,
        profileBio: extraction.profileBio,
        creatorCategory: extraction.creatorCategory,
        personalizationHook: extraction.personalizationHook,
        personalizationCheckedAt: extraction.personalizationHook
          ? new Date()
          : null,
        publicLocation: extraction.publicLocation,
        locationEvidenceUrl:
          extraction.publicLocation
            ? prospect.locationEvidenceUrl ||
              prospect.sourceUrl ||
              prospect.emailSourceUrl
            : prospect.locationEvidenceUrl,
        notes: combinedExtractionNotes(
          prospect.notes,
          extraction.notes,
        ),
        status: doNotContact
          ? "SUPPRESSED"
          : item
            ? "NEEDS_REVIEW"
            : "NO_EMAIL_FOUND",
        doNotContact,
        suppressionReason: doNotContact
          ? prospect.suppressionReason ||
            suppression?.reason ||
            "Existing do-not-contact decision"
          : null,
      },
    }),
    db.sourceAsset.update({
      where: { id: asset.id },
      data: {
        extractedText:
          item?.visibleContext ||
          extraction.notes.join("\n") ||
          null,
      },
    }),
    db.auditEvent.create({
      data: {
        action: "CAPTURE_REPROCESSED",
        entityType: "Prospect",
        entityId: id,
        metadata: JSON.stringify({
          provider: process.env.VISION_PROVIDER,
          emailFound: Boolean(item),
        }),
      },
    }),
  ]);

  return {
    emailFound: Boolean(item),
    confidence: item?.confidence || null,
  };
}
