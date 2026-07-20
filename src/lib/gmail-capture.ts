import type { gmail_v1 } from "googleapis";
import { google } from "googleapis";
import sharp from "sharp";
import { processScreenshotCapture } from "@/lib/capture-processing";
import { db } from "@/lib/db";
import {
  connectedGoogleClient,
  hasGmailCaptureScope,
} from "@/lib/gmail";
import {
  MAX_UPLOAD_BYTES,
  type AllowedMimeType,
  validateUpload,
} from "@/lib/upload";

type ImagePart = {
  attachmentId?: string | null;
  data?: string | null;
  filename: string;
  mimeType: string;
  partId: string;
};

export function gmailAttachmentExternalId(
  messageId: string,
  part: Pick<ImagePart, "partId">,
) {
  return `${messageId}:${part.partId}`;
}

export function gmailImportMetadataMatches(
  rawMetadata: string | null,
  messageId: string,
  part: Pick<ImagePart, "filename" | "partId">,
) {
  if (!rawMetadata) return false;

  try {
    const metadata = JSON.parse(rawMetadata) as {
      filename?: unknown;
      gmailMessageId?: unknown;
      partId?: unknown;
    };
    if (metadata.gmailMessageId !== messageId) return false;
    if (typeof metadata.partId === "string") {
      return metadata.partId === part.partId;
    }

    // Imports created before stable part IDs were recorded can still be
    // recognized by the Gmail message and attachment filename.
    return metadata.filename === part.filename;
  } catch {
    return false;
  }
}

function collectImageParts(
  part: gmail_v1.Schema$MessagePart,
): ImagePart[] {
  const nested = (part.parts || []).flatMap(collectImageParts);
  const mimeType =
    part.mimeType === "image/jpg" ? "image/jpeg" : part.mimeType || "";
  if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
    return nested;
  }
  if (!part.body?.attachmentId && !part.body?.data) return nested;
  return [
    ...nested,
    {
      attachmentId: part.body.attachmentId,
      data: part.body.data,
      filename: part.filename || "screenshot",
      mimeType,
      partId: part.partId || "root",
    },
  ];
}

function header(
  message: gmail_v1.Schema$Message,
  name: string,
): string | null {
  return (
    message.payload?.headers?.find(
      (item) => item.name?.toLowerCase() === name.toLowerCase(),
    )?.value || null
  );
}

function classifySubject(subject: string | null) {
  const value = subject?.toLowerCase() || "";
  return {
    leadType: value.includes("[brand]") ? ("BRAND" as const) : ("CREATOR" as const),
    platform: value.includes("[tiktok]")
      ? ("tiktok" as const)
      : value.includes("[youtube]")
        ? ("youtube" as const)
        : value.includes("[instagram]")
          ? ("instagram" as const)
          : ("other" as const),
  };
}

async function attachmentBytes(
  gmail: gmail_v1.Gmail,
  messageId: string,
  part: ImagePart,
): Promise<Uint8Array> {
  let data = part.data;
  if (!data && part.attachmentId) {
    const response = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: part.attachmentId,
    });
    data = response.data.data;
  }
  if (!data) throw new Error("Gmail returned an empty attachment.");
  return new Uint8Array(Buffer.from(data, "base64url"));
}

async function normalizeOversizedImage(
  bytes: Uint8Array,
  mimeType: AllowedMimeType,
): Promise<{
  bytes: Uint8Array;
  mimeType: AllowedMimeType;
  optimized: boolean;
}> {
  if (bytes.byteLength <= MAX_UPLOAD_BYTES) {
    return { bytes, mimeType, optimized: false };
  }

  for (const option of [
    { dimension: 2400, quality: 85 },
    { dimension: 2000, quality: 78 },
    { dimension: 1600, quality: 72 },
  ]) {
    const output = await sharp(bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: option.dimension,
        height: option.dimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: option.quality, mozjpeg: true })
      .toBuffer();
    if (output.byteLength <= MAX_UPLOAD_BYTES) {
      return {
        bytes: new Uint8Array(output),
        mimeType: "image/jpeg",
        optimized: true,
      };
    }
  }

  throw new Error(
    "The image remains larger than 4 MB after safe optimization.",
  );
}

export async function importGmailCaptureImages() {
  const captureEmail = process.env.INBOUND_CAPTURE_EMAIL?.trim();
  if (!captureEmail) {
    throw new Error("INBOUND_CAPTURE_EMAIL is not configured.");
  }
  const token = await db.oAuthToken.findUnique({
    where: { provider: "google" },
    select: { scope: true },
  });
  if (!token || !hasGmailCaptureScope(token.scope)) {
    throw new Error(
      "Reconnect Gmail to grant read-only access for the capture inbox.",
    );
  }

  const auth = await connectedGoogleClient();
  const gmail = google.gmail({ version: "v1", auth });
  const result = await gmail.users.messages.list({
    userId: "me",
    maxResults: 25,
    q: `to:${captureEmail} has:attachment newer_than:30d`,
  });

  const report = {
    messagesFound: result.data.messages?.length || 0,
    supportedAttachmentsFound: 0,
    optimizedAttachments: 0,
    attachmentsImported: 0,
    prospectsCreated: 0,
    skipped: 0,
    errors: [] as string[],
    prospectIds: [] as string[],
  };

  for (const summary of result.data.messages || []) {
    if (!summary.id) continue;
    const full = await gmail.users.messages.get({
      userId: "me",
      id: summary.id,
      format: "full",
    });
    const subject = header(full.data, "subject");
    const sender = header(full.data, "from");
    const classification = classifySubject(subject);
    const parts = full.data.payload
      ? collectImageParts(full.data.payload)
      : [];
    report.supportedAttachmentsFound += parts.length;
    if (parts.length === 0) {
      report.errors.push(
        `${subject || "Message without a subject"}: no supported PNG, JPEG, or WebP attachment was found.`,
      );
    }

    for (const part of parts) {
      const externalId = gmailAttachmentExternalId(summary.id, part);
      const priorImports = await db.auditEvent.findMany({
        where: {
          action: "GMAIL_CAPTURE_IMPORTED",
          entityType: "GmailAttachment",
          OR: [
            { entityId: externalId },
            {
              metadata: {
                contains: `"gmailMessageId":"${summary.id}"`,
              },
            },
          ],
        },
        select: { entityId: true, metadata: true },
      });
      const alreadyImported = priorImports.some(
        (event) =>
          event.entityId === externalId ||
          gmailImportMetadataMatches(
            event.metadata,
            summary.id as string,
            part,
          ),
      );
      if (alreadyImported) {
        report.skipped += 1;
        continue;
      }

      try {
        const originalBytes = await attachmentBytes(gmail, summary.id, part);
        const prepared = await normalizeOversizedImage(
          originalBytes,
          part.mimeType as AllowedMimeType,
        );
        const validation = validateUpload({
          size: prepared.bytes.byteLength,
          type: prepared.mimeType,
          bytes: prepared.bytes,
        });
        if (!validation.valid) {
          throw new Error(validation.error);
        }
        const prospectIds = await processScreenshotCapture({
          bytes: prepared.bytes,
          mimeType: validation.mimeType,
          metadata: {
            ...classification,
            captureSource: "gmail_attachment",
          },
        });
        await db.auditEvent.create({
          data: {
            action: "GMAIL_CAPTURE_IMPORTED",
            entityType: "GmailAttachment",
            entityId: externalId,
            metadata: JSON.stringify({
              captureEmail,
              filename: part.filename,
              gmailMessageId: summary.id,
              partId: part.partId,
              sender,
              subject,
              prospectIds,
            }),
          },
        });
        report.attachmentsImported += 1;
        if (prepared.optimized) report.optimizedAttachments += 1;
        report.prospectsCreated += prospectIds.length;
        report.prospectIds.push(...prospectIds);
      } catch (error) {
        report.errors.push(
          `${part.filename}: ${
            error instanceof Error ? error.message : "Import failed."
          }`,
        );
      }
    }
  }

  return report;
}
