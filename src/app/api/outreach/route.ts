import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import {
  OutreachPreparationError,
  prepareOutreachDraft,
} from "@/lib/outreach-preparation";
import { requireSameOrigin } from "@/lib/request-security";

const schema = z.object({ prospectId: z.string().min(1) });

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Prospect is required." }, { status: 400 });
  try {
    const message = await prepareOutreachDraft(parsed.data.prospectId);
    return NextResponse.json({ id: message.id });
  } catch (error) {
    if (error instanceof OutreachPreparationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
