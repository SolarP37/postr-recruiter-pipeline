import { describe, expect, it } from "vitest";
import { buildDashboardFunnel } from "@/lib/dashboard-funnel";

describe("dashboard funnel", () => {
  it("does not add downstream stages into authoritative status counts", () => {
    expect(buildDashboardFunnel({
      total: 12,
      review: 3,
      approved: 0,
      drafts: 6,
      sent: 0,
      replied: 0,
      referrals: 0,
      joined: 0,
    })).toEqual([
      ["Captured", 12],
      ["Reviewed", 9],
      ["Approved", 0],
      ["Drafted", 6],
      ["Sent", 0],
      ["Replied", 0],
      ["Referral sent", 0],
      ["Joined", 0],
    ]);
  });
});
