import { describe, expect, it } from "vitest";
import { reviewOutreachPermission } from "@/lib/outreach-compliance";

const reviewed = {
  countryCode: "US",
  permissionBasis: "PUBLICLY_LISTED_BUSINESS_CONTACT" as const,
  evidence: "https://example.com/contact",
  checkedAt: new Date("2026-07-21T00:00:00Z"),
};

describe("outreach permission review", () => {
  it("allows a documented US public business contact", () => {
    expect(reviewOutreachPermission(reviewed).allowed).toBe(true);
  });

  it("blocks missing country, basis, or evidence", () => {
    expect(reviewOutreachPermission({ ...reviewed, countryCode: null }).allowed).toBe(false);
    expect(reviewOutreachPermission({ ...reviewed, permissionBasis: "UNKNOWN" }).allowed).toBe(false);
    expect(reviewOutreachPermission({ ...reviewed, evidence: null }).allowed).toBe(false);
  });

  it("uses conservative jurisdiction defaults", () => {
    expect(reviewOutreachPermission({ ...reviewed, countryCode: "CA" }).allowed).toBe(false);
    expect(reviewOutreachPermission({ ...reviewed, countryCode: "GB", permissionBasis: "CORPORATE_BUSINESS_CONTACT" }).allowed).toBe(true);
    expect(reviewOutreachPermission({ ...reviewed, countryCode: "DE" }).allowed).toBe(false);
    expect(reviewOutreachPermission({ ...reviewed, countryCode: "DE", permissionBasis: "EXPRESS_CONSENT" }).allowed).toBe(true);
  });
});
