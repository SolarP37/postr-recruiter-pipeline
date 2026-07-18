import type { ContactExtractionResult } from "@/lib/vision/schema";

export interface VisionProvider {
  extractPublicContactInformation(
    imagePath: string,
  ): Promise<ContactExtractionResult>;
}
