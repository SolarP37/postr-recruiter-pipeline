import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { inspectPublicPage } from "@/lib/public-page-inspection";
import { requireSameOrigin } from "@/lib/request-security";

const schema = z.object({ url: z.string().url().max(2048) });

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid public URL." }, { status: 400 });
  try {
    return NextResponse.json(await inspectPublicPage(parsed.data.url));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The page could not be inspected." }, { status: 422 });
  }
}
