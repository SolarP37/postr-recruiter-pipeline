import { describe, expect, it } from "vitest";
import { extractPublicPageDetails } from "@/lib/public-page-inspection";

describe("public page inspection", () => {
  it("prefers a mailto business address and extracts page context", () => {
    const result = extractPublicPageDetails(`<!doctype html><html><head><title>Northstar Foods</title><meta name="description" content="Practical meals for busy families"></head><body>Other: wrong@example.net <a href="mailto:hello@northstar.example?subject=Hi">Contact</a></body></html>`, "https://northstar.example/about");
    expect(result.email).toBe("hello@northstar.example");
    expect(result.title).toBe("Northstar Foods");
    expect(result.description).toBe("Practical meals for busy families");
    expect(result.sourcePlatform).toBe("northstar.example");
  });

  it("falls back to a visibly published email and ignores scripts", () => {
    const result = extractPublicPageDetails(`<script>hidden@tracker.example</script><p>Email creator@example.com</p>`, "https://social.example/profile");
    expect(result.email).toBe("creator@example.com");
  });
});
