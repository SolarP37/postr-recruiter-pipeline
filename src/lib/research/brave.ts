import { ResearchAdapterError, type DiscoveryAdapter, type ResearchResult } from "@/lib/research/types";

const ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

type BraveResponse = {
  web?: { results?: Array<{ title?: unknown; url?: unknown; description?: unknown }> };
};

export class BraveDiscoveryAdapter implements DiscoveryAdapter {
  readonly provider = "brave";

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!apiKey) throw new ResearchAdapterError("Brave Search is not configured.");
  }

  async search(query: string, limit: number): Promise<ResearchResult[]> {
    const count = Math.min(10, Math.max(1, limit));
    const url = new URL(ENDPOINT);
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(count));
    url.searchParams.set("search_lang", "en");
    url.searchParams.set("safesearch", "strict");
    const response = await this.fetcher(url, {
      headers: { accept: "application/json", "x-subscription-token": this.apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new ResearchAdapterError(
        `Brave Search returned HTTP ${response.status}.`,
        response.status === 429 || response.status >= 500,
      );
    }
    const body = await response.json() as BraveResponse;
    return (body.web?.results || []).slice(0, count).flatMap((item) => {
      if (typeof item.title !== "string" || typeof item.url !== "string") return [];
      try {
        const parsed = new URL(item.url);
        if (!['http:', 'https:'].includes(parsed.protocol)) return [];
        return [{
          title: item.title.slice(0, 240),
          url: parsed.toString(),
          description: typeof item.description === "string" ? item.description.slice(0, 500) : null,
          source: this.provider,
        }];
      } catch {
        return [];
      }
    });
  }
}
