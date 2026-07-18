import { GrokVisionProvider } from "@/lib/vision/grok";
import { MockVisionProvider } from "@/lib/vision/mock";
import { OpenAIVisionProvider } from "@/lib/vision/openai";
import type { VisionProvider } from "@/lib/vision/provider";

export function getVisionProvider(): VisionProvider {
  switch (process.env.VISION_PROVIDER || "mock") {
    case "openai":
      return new OpenAIVisionProvider();
    case "grok":
      return new GrokVisionProvider();
    case "mock":
      return new MockVisionProvider();
    default:
      throw new Error("Unsupported VISION_PROVIDER.");
  }
}
