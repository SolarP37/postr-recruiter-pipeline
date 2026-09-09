import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { assetStorageForReference } from "@/lib/asset-storage";
import { db } from "@/lib/db";
import { isAllowedMimeType } from "@/lib/upload";

export async function GET(_request: Request, context: { params: Promise<{ prospectId: string }> }) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
  const { prospectId } = await context.params;
  const asset = await db.sourceAsset.findFirst({ where: { prospectId }, orderBy: { createdAt: "desc" } });
  if (!asset) return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  try {
    const stored = await assetStorageForReference(asset.filePath).read(asset.filePath);
    if (!stored) {
      return NextResponse.json({ error: "Asset is unavailable." }, { status: 404 });
    }
    const contentType = isAllowedMimeType(stored.contentType)
      ? stored.contentType
      : isAllowedMimeType(asset.mimeType)
        ? asset.mimeType
        : null;
    if (!contentType) {
      return NextResponse.json({ error: "Asset is unavailable." }, { status: 404 });
    }
    return new Response(stored.body, {
      headers: {
        "content-type": contentType,
        "cache-control": "private, no-store",
        "content-security-policy": "sandbox",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset is unavailable." }, { status: 404 });
  }
}
