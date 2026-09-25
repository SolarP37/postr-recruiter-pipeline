export type ResearchResult = {
  title: string;
  url: string;
  description: string | null;
  source: string;
};

export interface DiscoveryAdapter {
  readonly provider: string;
  search(query: string, limit: number): Promise<ResearchResult[]>;
}

export class ResearchAdapterError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
    this.name = "ResearchAdapterError";
  }
}
