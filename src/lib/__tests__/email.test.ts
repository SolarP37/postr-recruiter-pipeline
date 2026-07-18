import { describe, expect, it } from "vitest";
import { extractVisibleEmails, isValidEmail, normalizeEmail } from "@/lib/email";

describe("email normalization", () => {
  it("trims whitespace and lowercases addresses", () => {
    expect(normalizeEmail("  Creator@Example.COM ")).toBe("creator@example.com");
  });
});

describe("email validation", () => {
  it.each(["creator@example.com", "hello+brands@creator.co.uk"])("accepts %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(["creator", "creator@", "@example.com", "creator@example"])("rejects %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("extracts only syntactically valid visible candidates", () => {
    expect(extractVisibleEmails("Business: Hello@Example.com and invalid@local")).toEqual(["hello@example.com"]);
  });
});
