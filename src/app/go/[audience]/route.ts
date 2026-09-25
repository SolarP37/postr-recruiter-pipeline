import { NextResponse } from "next/server";
import { RECRUITER_CONFIG } from "@/config/recruiter";
import { db } from "@/lib/db";

const audiences = new Set(["creator", "brand"]);

function cleanSource(value: string | null): string {
  const source = value?.trim().toLowerCase() || "unknown";
  return /^[a-z0-9-]{1,80}$/.test(source) ? source : "invalid";
}

function referrerHost(request: Request): string | null {
  const value = request.headers.get("referer");
  if (!value) return null;
  try {
    return new URL(value).host.slice(0, 255);
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ audience: string }> },
) {
  const { audience } = await context.params;
  if (!audiences.has(audience)) {
    return NextResponse.redirect(new URL("/", request.url), 307);
  }

  const url = new URL(request.url);
  const source = cleanSource(url.searchParams.get("source"));

  try {
    await db.auditEvent.create({
      data: {
        action:
          audience === "brand"
            ? "REFERRAL_CLICK_BRAND"
            : "REFERRAL_CLICK_CREATOR",
        entityType: "PublicLandingPage",
        metadata: JSON.stringify({
          audience,
          source,
          referrerHost: referrerHost(request),
          referralCode: RECRUITER_CONFIG.referralCode,
        }),
      },
    });
  } catch (error) {
    console.error("Unable to record referral click.", error);
  }

  const response = NextResponse.redirect(RECRUITER_CONFIG.referralUrl, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
