import type { VisionProvider } from "@/lib/vision/provider";
import { validateExtraction } from "@/lib/vision/schema";

export class MockVisionProvider implements VisionProvider {
  async extractPublicContactInformation() {
    return validateExtraction({
      emailFound: true,
      emails: [
        {
          email: "mock.creator@example.com",
          visibleContext: "MOCK FIXTURE: Business: mock.creator@example.com",
          confidence: 0.99,
        },
      ],
      displayName: "Mock Creator",
      notes: [
        "Development fixture only. Verify screenshot evidence before approval.",
      ],
    });
  }
}
