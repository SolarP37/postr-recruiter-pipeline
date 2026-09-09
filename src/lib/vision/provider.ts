import type { ContactExtractionResult } from "@/lib/vision/schema";
import type { AllowedMimeType } from "@/lib/upload";

export interface VisionProvider {
  extractPublicContactInformation(
    image: { bytes: Uint8Array; mimeType: AllowedMimeType },
  ): Promise<ContactExtractionResult>;
}
