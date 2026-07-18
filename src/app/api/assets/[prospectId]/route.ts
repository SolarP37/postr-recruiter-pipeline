import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ prospectId: string }> }) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
  const { prospectId } = await context.params;
  const asset = await db.sourceAsset.findFirst({ where: { prospectId }, orderBy: { createdAt: "desc" } });
  if (!asset) return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  const filename = path.basename(asset.filePath);
  if (asset.filePath !== path.join("storage", "uploads", filename)) {
    return NextResponse.json({ error: "Invalid asset path." }, { status: 400 });
  }
  const filePath = path.join(process.cwd(), "storage", "uploads", filename);
  try {
    const bytes = await readFile(filePath);
    return new Response(bytes, { headers: { "content-type": asset.mimeType, "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Asset is unavailable." }, { status: 404 });
  }
}
