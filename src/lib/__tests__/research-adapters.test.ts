import { describe, expect, it, vi } from "vitest";
import { ApifyDatasetReader } from "@/lib/research/apify";
import { BraveDiscoveryAdapter } from "@/lib/research/brave";
import { configuredResearchCapabilities } from "@/lib/research";

describe("read-only research adapters", () => {
  it("keeps every capability off without an explicit provider flag and credential", () => {
    expect(configuredResearchCapabilities({})).toEqual({ brave: false, publicPage: false, apify: false });
    expect(configuredResearchCapabilities({ RESEARCH_PROVIDER: "brave" }).brave).toBe(false);
    expect(configuredResearchCapabilities({ PUBLIC_PAGE_RESEARCH_ENABLED: "TRUE" }).publicPage).toBe(false);
  });

  it("uses the official Brave endpoint with bounded strict-safe results", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ web: { results: [
      { title: "Creator", url: "https://example.com/creator", description: "Public profile" },
      { title: "Unsafe protocol", url: "file:///etc/passwd" },
    ] } }), { status: 200, headers: { "content-type": "application/json" } }));
    const adapter = new BraveDiscoveryAdapter("secret", fetcher as unknown as typeof fetch);
    const results = await adapter.search("fitness creator", 99);
    const [requestUrl, options] = fetcher.mock.calls[0];
    expect(String(requestUrl)).toContain("count=10");
    expect(String(requestUrl)).toContain("safesearch=strict");
    expect((options?.headers as Record<string, string>)["x-subscription-token"]).toBe("secret");
    expect(results).toEqual([{ title: "Creator", url: "https://example.com/creator", description: "Public profile", source: "brave" }]);
  });

  it("reads only the configured Apify dataset and normalizes allowlisted fields", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify([
      { name: "Creator", profileUrl: "https://example.com/c", bio: "Public bio", privateField: "not returned" },
    ]), { status: 200, headers: { "content-type": "application/json" } }));
    const reader = new ApifyDatasetReader("token", "dataset_123", fetcher as unknown as typeof fetch);
    const results = await reader.latest(5);
    const [requestUrl, options] = fetcher.mock.calls[0];
    expect(String(requestUrl)).toContain("datasets/dataset_123/items");
    expect((options?.headers as Record<string, string>).authorization).toBe("Bearer token");
    expect(results).toEqual([{ title: "Creator", url: "https://example.com/c", description: "Public bio", source: "apify" }]);
  });
});
