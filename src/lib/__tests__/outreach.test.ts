import { afterEach, describe, expect, it, vi } from "vitest";
import { RECRUITER_CONFIG } from "@/config/recruiter";
import {
  createBrandOutreach,
  createCreatorOutreach,
  createPersonalizedOpening,
  createSubjectOptions,
  createTailoredFollowUp,
  createTailoredOutreach,
} from "@/lib/outreach";

afterEach(() => vi.unstubAllEnvs());

describe("Patrick Conlon creator outreach", () => {
  it("creates concise evidence-based plain-text and HTML versions", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://recruit.example.com");
    const message = createCreatorOutreach({
      creatorFirstName: "Avery",
      creatorCategory: "food",
      personalizationHook: "you share practical weekday recipes.",
    });

    expect(message.subject).toBe("A creator opportunity for Avery");
    expect(message.body).toContain("noticed you share practical weekday recipes.");
    expect(message.body).toContain("https://recruit.example.com/creators");
    expect(message.htmlBody).toContain(
      'href="https://recruit.example.com/creators"',
    );
    expect(message.htmlBody).toContain(
      RECRUITER_CONFIG.qrAltText.replace("'", "&#039;"),
    );
    expect(message.htmlBody).toContain(
      "https://recruit.example.com/assets/postr/postrpatcon-qr.png",
    );
    expect(message.body.split(/\s+/).length).toBeLessThan(250);
  });

  it("uses transparent category and generic fallbacks", () => {
    expect(
      createPersonalizedOpening({ creatorCategory: "outdoor photography" }),
    ).toContain("creators making outdoor photography content");
    expect(createPersonalizedOpening({})).toContain(
      "public creator profile",
    );
  });

  it("flattens line breaks and offers non-deceptive subject options", () => {
    const message = createCreatorOutreach({
      displayName: "Avery\r\nBcc: other@example.com",
      personalizationHook: "you share tutorials\nBcc: other@example.com",
    });
    expect(message.body).not.toContain("\nBcc:");
    for (const option of createSubjectOptions({ creatorFirstName: "Avery" })) {
      expect(option.subject).not.toMatch(/^(Re:|Fwd:)/i);
      expect(option.subject).not.toMatch(/[!]{2,}/);
    }
  });
});

describe("Patrick Conlon brand outreach", () => {
  it("creates a distinct, concise brand invitation without creator eligibility copy", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://recruit.example.com");
    const message = createBrandOutreach({
      contactFirstName: "Morgan",
      organizationName: "Northstar Foods",
      brandCategory: "consumer food",
      personalizationHook:
        "your website highlights practical products for busy households",
    });

    expect(message.subject).toContain("Northstar Foods");
    expect(message.body).toContain("Hi Morgan,");
    expect(message.body).toContain(
      "your website highlights practical products for busy households",
    );
    expect(message.body).toContain("launch campaigns and connect with creators");
    expect(message.body).not.toContain("1,000 followers");
    expect(message.body).toContain("https://recruit.example.com/brands");
    expect(message.htmlBody).toContain(
      'href="https://recruit.example.com/brands"',
    );
    expect(message.body.split(/\s+/).length).toBeLessThan(250);
  });

  it("uses a transparent organization-level fallback", () => {
    const message = createBrandOutreach({
      organizationName: "Northstar Foods",
    });
    expect(message.body).toContain(
      "I came across Northstar Foods while researching brands",
    );
  });
});

describe("tailored outreach routing", () => {
  it("uses creator evidence for creators and brand evidence for brands", () => {
    const creator = createTailoredOutreach({
      leadType: "CREATOR",
      creatorFirstName: "Avery",
      creatorCategory: "travel",
      personalizationHook:
        "your profile focuses on accessible city guides",
    });
    const brand = createTailoredOutreach({
      leadType: "BRAND",
      creatorFirstName: "Morgan",
      organizationName: "Northstar Foods",
      creatorCategory: "consumer food",
      personalizationHook:
        "your website highlights convenient family meals",
    });

    expect(creator.body).toContain("Hi Avery,");
    expect(creator.body).toContain("accessible city guides");
    expect(creator.body).toContain("at least 1,000 followers");
    expect(brand.body).toContain("Hi Morgan,");
    expect(brand.body).toContain("Northstar Foods");
    expect(brand.body).toContain("convenient family meals");
    expect(brand.body).not.toContain("1,000 followers");
  });

  it("creates two concise, transparent follow-ups and stops claiming future contact", () => {
    const first = createTailoredFollowUp(
      {
        leadType: "CREATOR",
        creatorFirstName: "Avery",
      },
      1,
    );
    const final = createTailoredFollowUp(
      {
        leadType: "BRAND",
        creatorFirstName: "Morgan",
        organizationName: "Northstar Foods",
      },
      2,
    );
    expect(first.subject).toContain("Following up");
    expect(first.body).toContain("no obligation");
    expect(final.subject).toContain("Final note");
    expect(final.body).toContain("I will not send another reminder");
    expect(final.body).toContain('Reply "No thanks"');
  });
});
