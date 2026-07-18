import { writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireApiSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";
import { randomizedUploadPath, validateUpload } from "@/lib/upload";
import { getVisionProvider } from "@/lib/vision";

const metadataSchema = z.object({
  platform: z.enum(["instagram", "tiktok", "youtube", "other"]),
  sourceUrl: z.union([z.literal(""), z.string().url()]).optional(),
  campaign: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
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
    const stored = randomizedUploadPath(validation.mimeType);
    await writeFile(stored.absolutePath, bytes, { flag: "wx" });
    const extraction = await getVisionProvider().extractPublicContactInformation(stored.absolutePath);
    const prospectIds: string[] = [];
    const extractedItems = extraction.emails.length ? extraction.emails : [null];
    for (const item of extractedItems) {
      const normalizedEmail = item ? normalizeEmail(item.email) : null;
      const suppressed = normalizedEmail
        ? await db.suppressionEntry.findUnique({ where: { normalizedEmail } })
        : null;
      const prospect = await db.prospect.create({
        data: {
          email: item?.email || null,
          normalizedEmail,
          displayName: extraction.displayName,
          sourcePlatform: metadata.data.platform,
          sourceUrl: metadata.data.sourceUrl || null,
          campaign: metadata.data.campaign || null,
          screenshotPath: stored.relativePath,
          visibleEmailEvidence: item?.visibleContext || null,
          extractionConfidence: item?.confidence || null,
          notes: extraction.notes.join("\n") || null,
          status: item ? (suppressed ? "SUPPRESSED" : "NEEDS_REVIEW") : "NO_EMAIL_FOUND",
          doNotContact: Boolean(suppressed),
          sourceAssets: {
            create: {
              filePath: stored.relativePath,
              mimeType: validation.mimeType,
              extractedText: item?.visibleContext || extraction.notes.join("\n") || null,
            },
          },
        },
      });
      prospectIds.push(prospect.id);
      await audit("CAPTURE_PROCESSED", "Prospect", prospect.id, {
        provider: process.env.VISION_PROVIDER || "mock",
        emailFound: Boolean(item),
      });
    }
    return NextResponse.json({ created: prospectIds.length, prospectIds });
  } catch (error) {
    console.error("Capture failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Capture failed." }, { status: 500 });
  }
}
