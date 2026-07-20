export const RECRUITER_CONFIG = {
  recruiterName: "Patrick Conlon",
  recruiterRole: "Postr Recruiter",
  referralCode: "PostrPatCon",
  referralUrl: "https://u.postr.com/postrpatcon",
  referralCompensation:
    "2% referral bonus when recruited creators successfully complete qualifying Postr campaigns or jobs.",
  minimumFollowerCount: 1000,
  defaultSendingMode: "draft_only",
  qrAssetPath: "/assets/postr/postrpatcon-qr.png",
  qrAltText:
    "Scan to join Postr through Patrick Conlon's creator invitation",
} as const;

export type ReferralAudience = "creator" | "brand";

export function getLandingPageUrl(
  audience: ReferralAudience,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
): string {
  return new URL(
    audience === "creator" ? "/creators" : "/brands",
    appUrl,
  ).toString();
}

export function getTrackedReferralPath(
  audience: ReferralAudience,
  source: string,
): string {
  const search = new URLSearchParams({ source });
  return `/go/${audience}?${search.toString()}`;
}

export type SendingMode =
  | "draft_only"
  | "review_and_approve"
  | "approved_batch_send"
  | "manual_send"
  | "paused";

export function getSendingMode(
  value = process.env.OUTREACH_SENDING_MODE,
): SendingMode {
  const allowed = new Set<SendingMode>([
    "draft_only",
    "review_and_approve",
    "approved_batch_send",
    "manual_send",
    "paused",
  ]);
  return allowed.has(value as SendingMode)
    ? (value as SendingMode)
    : RECRUITER_CONFIG.defaultSendingMode;
}

export function getHostedQrUrl(
  appUrl = process.env.NEXT_PUBLIC_APP_URL,
): string {
  if (!appUrl) return RECRUITER_CONFIG.qrAssetPath;
  return new URL(RECRUITER_CONFIG.qrAssetPath, appUrl).toString();
}
