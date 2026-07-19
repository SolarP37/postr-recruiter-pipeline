import { describe, expect, it } from "vitest";
import { contactExtractionSchema, validateExtraction } from "@/lib/vision/schema";

describe("vision output schema", () => {
  it("accepts a visible email result and normalizes it", () => {
    const result = validateExtraction({
      emailFound: true,
      emails: [{ email: "Creator@Example.com", visibleContext: "Business: Creator@Example.com", confidence: 0.98 }],
      displayName: null,
      profileBio: "Food tutorials and weekday recipes.",
      creatorCategory: "food",
      personalizationHook: "you share weekday recipes",
      notes: [],
    });
    expect(result.emails[0].email).toBe("creator@example.com");
  });

  it("accepts the no-email result", () => {
    expect(contactExtractionSchema.parse({
      emailFound: false,
      emails: [],
      displayName: null,
      profileBio: null,
      creatorCategory: null,
      personalizationHook: null,
      notes: ["No publicly displayed email address was visible."],
    }).emailFound).toBe(false);
  });

  it("rejects an inconsistent emailFound flag", () => {
    expect(() => contactExtractionSchema.parse({
      emailFound: true, emails: [], displayName: null, profileBio: null,
      creatorCategory: null, personalizationHook: null, notes: [],
    })).toThrow();
  });

  it("rejects out-of-range confidence", () => {
    expect(() => contactExtractionSchema.parse({
      emailFound: true,
      emails: [{ email: "creator@example.com", visibleContext: "visible", confidence: 1.1 }],
      displayName: null, profileBio: null, creatorCategory: null,
      personalizationHook: null, notes: [],
    })).toThrow();
  });

  it("rejects an empty or overlong personalization hook", () => {
    const base = {
      emailFound: false,
      emails: [],
      displayName: null,
      profileBio: null,
      creatorCategory: null,
      notes: [],
    };
    expect(() => contactExtractionSchema.parse({
      ...base,
      personalizationHook: "",
    })).toThrow();
    expect(() => contactExtractionSchema.parse({
      ...base,
      personalizationHook: "x".repeat(281),
    })).toThrow();
  });
});
