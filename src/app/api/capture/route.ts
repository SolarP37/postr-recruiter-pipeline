import { unlink, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";
import { requireSameOrigin } from "@/lib/request-security";
import { randomizedUploadPath, validateUpload } from "@/lib/upload";
import { getVisionProvider } from "@/lib/vision";

const metadataSchema = z.object({
  platform: z.enum(["instagram", "tiktok", "youtube", "other"]),
  sourceUrl: z.union([z.literal(""), z.string().url()]).optional(),
  campaign: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
  let stored: ReturnType<typeof randomizedUploadPath> | null = null;
  let committed = false;
  try {
    const form = await request.formData();
    const metadata = metadataSchema.safeParse({
      platform: form.get("platform"),
      sourceUrl: form.get("sourceUrl") || "",
      campaign: form.get("campaign") || "",
    });
    if (!metadata.success) return NextResponse.json({ error: "Check the platform, URL, and campaign fields." }, { status: 400 });
    const file = form.get("screenshot");
    if (!(file instanceof File)) return NextResponse.json({ error: "A screenshot is required." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validateUpload({ size: file.size, type: file.type, bytes });
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });
    stored = randomizedUploadPath(validation.mimeType);
    await writeFile(stored.absolutePath, bytes, { flag: "wx" });
    const extraction = await getVisionProvider().extractPublicContactInformation(stored.absolutePath);
    const extractedItems = extraction.emails.length ? extraction.emails : [null];
    const preparedItems = await Promise.all(extractedItems.map(async (item) => {
      const normalizedEmail = item ? normalizeEmail(item.email) : null;
      const suppressed = normalizedEmail
        ? await db.suppressionEntry.findUnique({ where: { normalizedEmail } })
        : null;
      return { item, normalizedEmail, suppressed: Boolean(suppressed) };
    }));
    const prospectIds = await db.$transaction(async (transaction) => {
      const ids: string[] = [];
      for (const prepared of preparedItems) {
        const { item, normalizedEmail, suppressed } = prepared;
        const prospect = await transaction.prospect.create({
          data: {
            email: item?.email || null,
            normalizedEmail,
            displayName: extraction.displayName,
            sourcePlatform: metadata.data.platform,
            sourceUrl: metadata.data.sourceUrl || null,
            campaign: metadata.data.campaign || null,
            screenshotPath: stored!.relativePath,
            visibleEmailEvidence: item?.visibleContext || null,
            extractionConfidence: item?.confidence || null,
            notes: extraction.notes.join("\n") || null,
            status: item ? (suppressed ? "SUPPRESSED" : "NEEDS_REVIEW") : "NO_EMAIL_FOUND",
            doNotContact: suppressed,
            sourceAssets: {
              create: {
                filePath: stored!.relativePath,
                mimeType: validation.mimeType,
                extractedText: item?.visibleContext || extraction.notes.join("\n") || null,
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
              emailFound: Boolean(item),
            }),
          },
        });
      }
      return ids;
    });
    committed = true;
    return NextResponse.json({ created: prospectIds.length, prospectIds });
  } catch (error) {
    if (stored && !committed) {
      await unlink(stored.absolutePath).catch(() => undefined);
    }
    console.error("Capture failed", error);
    const message =
      process.env.NODE_ENV === "production"
        ? "Capture processing failed. No prospect was created."
        : error instanceof Error
          ? error.message
          : "Capture failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
