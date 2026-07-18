import { describe, expect, it } from "vitest";
import { isDuplicateEmail, isSuppressedEmail } from "@/lib/review-flags";

describe("duplicate detection", () => {
  it("matches normalized addresses", () => {
    expect(isDuplicateEmail(" Creator@Example.com ", ["creator@example.com"])).toBe(true);
  });

  it("does not flag unrelated addresses", () => {
    expect(isDuplicateEmail("new@example.com", ["creator@example.com"])).toBe(false);
  });
});

describe("suppression checks", () => {
  it("blocks case-insensitive matches", () => {
    expect(isSuppressedEmail("NO@Example.com", ["no@example.com"])).toBe(true);
  });
});
