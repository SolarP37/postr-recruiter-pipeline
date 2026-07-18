import type { VisionProvider } from "@/lib/vision/provider";

export class GrokVisionProvider implements VisionProvider {
  async extractPublicContactInformation(): Promise<never> {
    throw new Error(
      "Grok vision is not enabled. Verify current xAI documentation and configure XAI_API_KEY first.",
    );
  }
}
