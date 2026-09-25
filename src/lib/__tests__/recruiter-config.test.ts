import path from "node:path";
import jsQR from "jsqr";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  getLandingPageUrl,
  getSendingMode,
  getTrackedReferralPath,
  RECRUITER_CONFIG,
} from "@/config/recruiter";
import { qualificationFromEvidence } from "@/lib/qualification";

describe("recruiter configuration", () => {
  it("loads Patrick's canonical identity and safe default", () => {
    expect(RECRUITER_CONFIG).toMatchObject({
      recruiterName: "Patrick Conlon",
      recruiterRole: "Postr Recruiter",
      referralCode: "PostrPatCon",
      referralUrl: "https://u.postr.com/postrpatcon",
      minimumFollowerCount: 1000,
      defaultSendingMode: "draft_only",
    });
    expect(getSendingMode("unexpected")).toBe("draft_only");
  });

  it("decodes the official cropped QR to the canonical URL", async () => {
    const file = path.join(
      process.cwd(),
      "public/assets/postr/postrpatcon-qr.png",
    );
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const decoded = jsQR(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      { inversionAttempts: "attemptBoth" },
    );
    expect(decoded?.data).toBe(RECRUITER_CONFIG.referralUrl);
  });

  it("builds audience landing and tracked referral links", () => {
    expect(
      getLandingPageUrl("creator", "https://recruit.example.com"),
    ).toBe("https://recruit.example.com/creators");
    expect(getLandingPageUrl("brand", "https://recruit.example.com")).toBe(
      "https://recruit.example.com/brands",
    );
    expect(getTrackedReferralPath("brand", "brand landing")).toBe(
      "/go/brand?source=brand+landing",
    );
  });

  it("classifies verified follower evidence at the 1,000 threshold", () => {
    expect(qualificationFromEvidence({ followerCount: 1000, followerCountVerified: true, requestedStatus: "NEEDS_REVIEW" })).toBe("QUALIFIED");
    expect(qualificationFromEvidence({ followerCount: 999, followerCountVerified: true, requestedStatus: "LIKELY_QUALIFIED" })).toBe("NOT_YET_QUALIFIED");
    expect(qualificationFromEvidence({ followerCount: 1500, followerCountVerified: false, requestedStatus: "QUALIFIED" })).toBe("NEEDS_REVIEW");
  });

  it("allows human-reviewed brand qualification without follower evidence", () => {
    expect(
      qualificationFromEvidence({
        leadType: "BRAND",
        followerCount: null,
        followerCountVerified: false,
        requestedStatus: "QUALIFIED",
      }),
    ).toBe("QUALIFIED");
  });
});
