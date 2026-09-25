import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { processScreenshotCapture } from "@/lib/capture-processing";
import { requireSameOrigin } from "@/lib/request-security";
import { validateUpload } from "@/lib/upload";

const metadataSchema = z.object({
  leadType: z.enum(["CREATOR", "BRAND"]),
  platform: z.enum(["instagram", "tiktok", "youtube", "other"]),
  sourceUrl: z.union([z.literal(""), z.string().url()]).optional(),
  organizationName: z.string().trim().max(120).optional(),
  businessWebsite: z.union([z.literal(""), z.string().url()]).optional(),
  campaign: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  try {
    const form = await request.formData();
    const metadata = metadataSchema.safeParse({
      leadType: form.get("leadType") || "CREATOR",
      platform: form.get("platform"),
      sourceUrl: form.get("sourceUrl") || "",
      organizationName: form.get("organizationName") || "",
      businessWebsite: form.get("businessWebsite") || "",
      campaign: form.get("campaign") || "",
    });
    if (!metadata.success) {
      return NextResponse.json(
        {
          error:
            "Check the lead type, platform, URLs, and campaign fields.",
        },
        { status: 400 },
      );
    }

    const file = form.get("screenshot");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A screenshot is required." },
        { status: 400 },
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validateUpload({
      size: file.size,
      type: file.type,
      bytes,
    });
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    const prospectIds = await processScreenshotCapture({
      bytes,
      mimeType: validation.mimeType,
      metadata: {
        ...metadata.data,
        sourceUrl: metadata.data.sourceUrl || null,
        organizationName: metadata.data.organizationName || null,
        businessWebsite: metadata.data.businessWebsite || null,
        campaign: metadata.data.campaign || null,
        captureSource: "web_upload",
      },
    });
    return NextResponse.json({
      created: prospectIds.length,
      prospectIds,
    });
  } catch (error) {
    console.error("Capture failed; exception detail was redacted.");
    const message =
      process.env.NODE_ENV === "production"
        ? "Capture processing failed. No prospect was created."
        : error instanceof Error
          ? error.message
          : "Capture failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
