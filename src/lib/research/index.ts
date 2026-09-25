import { ApifyDatasetReader } from "@/lib/research/apify";
import { BraveDiscoveryAdapter } from "@/lib/research/brave";
import { ResearchAdapterError } from "@/lib/research/types";

export type ResearchEnvironment = Record<string, string | undefined>;

export function configuredResearchCapabilities(env: ResearchEnvironment = process.env) {
  return {
    brave: env.RESEARCH_PROVIDER === "brave" && Boolean(env.BRAVE_SEARCH_API_KEY),
    publicPage: env.PUBLIC_PAGE_RESEARCH_ENABLED === "true",
    apify: env.APIFY_DATASET_RESEARCH_ENABLED === "true" && Boolean(env.APIFY_API_TOKEN && env.APIFY_DATASET_ID),
  };
}

export function createBraveDiscoveryAdapter(env: ResearchEnvironment = process.env) {
  if (!configuredResearchCapabilities(env).brave) throw new ResearchAdapterError("Brave research is disabled or not configured.");
  return new BraveDiscoveryAdapter(env.BRAVE_SEARCH_API_KEY || "");
}

export function createApifyDatasetReader(env: ResearchEnvironment = process.env) {
  if (!configuredResearchCapabilities(env).apify) throw new ResearchAdapterError("Apify dataset research is disabled or not configured.");
  return new ApifyDatasetReader(env.APIFY_API_TOKEN || "", env.APIFY_DATASET_ID || "");
}

export * from "@/lib/research/types";
