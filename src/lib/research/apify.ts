import { ResearchAdapterError, type ResearchResult } from "@/lib/research/types";

type ApifyItem = Record<string, unknown>;

function firstString(item: ApifyItem, keys: string[]) {
  for (const key of keys) if (typeof item[key] === "string" && item[key]) return item[key] as string;
  return null;
}

export class ApifyDatasetReader {
  readonly provider = "apify";

  constructor(
    private readonly token: string,
    private readonly datasetId: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!token || !datasetId) throw new ResearchAdapterError("Apify dataset access is not configured.");
    if (!/^[A-Za-z0-9_-]{5,80}$/.test(datasetId)) throw new ResearchAdapterError("Apify dataset ID is invalid.");
  }

  async latest(limit: number): Promise<ResearchResult[]> {
    const count = Math.min(10, Math.max(1, limit));
    const url = new URL(`https://api.apify.com/v2/datasets/${this.datasetId}/items`);
    url.searchParams.set("clean", "true");
    url.searchParams.set("desc", "true");
    url.searchParams.set("limit", String(count));
    const response = await this.fetcher(url, {
      headers: { accept: "application/json", authorization: `Bearer ${this.token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new ResearchAdapterError(
        `Apify returned HTTP ${response.status}.`,
        response.status === 429 || response.status >= 500,
      );
    }
    const body = await response.json();
    if (!Array.isArray(body)) throw new ResearchAdapterError("Apify returned an unexpected dataset response.");
    return (body as ApifyItem[]).flatMap((item) => {
      const rawUrl = firstString(item, ["url", "profileUrl", "website", "link"]);
      if (!rawUrl) return [];
      try {
        const parsed = new URL(rawUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) return [];
        return [{
          title: (firstString(item, ["title", "name", "username", "handle"]) || parsed.hostname).slice(0, 240),
          url: parsed.toString(),
          description: firstString(item, ["description", "bio", "snippet"])?.slice(0, 500) || null,
          source: this.provider,
        }];
      } catch {
        return [];
      }
    }).slice(0, count);
  }
}
