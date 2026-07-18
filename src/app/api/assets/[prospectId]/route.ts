import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { assetStorageForReference } from "@/lib/asset-storage";
import { db } from "@/lib/db";

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
    return new Response(stored.body, {
      headers: {
        "content-type": stored.contentType || asset.mimeType,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset is unavailable." }, { status: 404 });
  }
}
