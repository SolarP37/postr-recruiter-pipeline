import { describe, expect, it } from "vitest";
import {
  CREATOR_OUTREACH_SUBJECT,
  createCreatorOutreach,
} from "@/lib/outreach";

describe("personalized outreach drafting", () => {
  it("uses a reviewed screenshot-supported hook", () => {
    const message = createCreatorOutreach({
      displayName: "Avery",
      creatorCategory: "food",
      personalizationHook: "you share practical weekday recipes.",
    });

    expect(message.subject).toBe(CREATOR_OUTREACH_SUBJECT);
    expect(message.body).toContain("Hi Avery,");
    expect(message.body).toContain(
      "noticed you share practical weekday recipes.",
    );
    expect(message.body).toContain("reply “no thanks,”");
  });

  it("falls back to category and then to a generic factual opening", () => {
    expect(
      createCreatorOutreach({
        displayName: null,
        creatorCategory: "outdoor photography",
      }).body,
    ).toContain("creators working in outdoor photography.");

    expect(createCreatorOutreach({}).body).toContain(
      "creators who may be a fit for brand collaborations.",
    );
  });

  it("flattens line breaks from reviewed fields", () => {
    const body = createCreatorOutreach({
      displayName: "Avery\r\nBcc: other@example.com",
      personalizationHook: "you share tutorials\nBcc: other@example.com",
    }).body;

    expect(body).not.toContain("\nBcc:");
    expect(body).toContain("Hi Avery Bcc: other@example.com,");
  });
});
