export interface DashboardFunnelCounts {
  total: number;
  review: number;
  approved: number;
  drafts: number;
  sent: number;
  replied: number;
  referrals: number;
  joined: number;
}

/** Keep each stage aligned with its authoritative dashboard card. */
export function buildDashboardFunnel(counts: DashboardFunnelCounts) {
  return [
    ["Captured", counts.total],
    ["Reviewed", Math.max(counts.total - counts.review, 0)],
    ["Approved", counts.approved],
    ["Drafted", counts.drafts],
    ["Sent", counts.sent],
    ["Replied", counts.replied],
    ["Referral sent", counts.referrals],
    ["Joined", counts.joined],
  ] as const;
}
