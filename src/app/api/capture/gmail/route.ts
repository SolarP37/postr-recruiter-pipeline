import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { importGmailCaptureImages } from "@/lib/gmail-capture";
import { requireSameOrigin } from "@/lib/request-security";
import { reportOperationalError } from "@/lib/operations";

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  try {
    return NextResponse.json(await importGmailCaptureImages());
  } catch (error) {
    await reportOperationalError("gmail_capture_import", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to import Gmail captures.",
      },
      { status: 503 },
    );
  }
}
