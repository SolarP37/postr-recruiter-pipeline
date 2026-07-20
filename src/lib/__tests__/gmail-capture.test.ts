import { describe, expect, it } from "vitest";
import {
  gmailAttachmentExternalId,
  gmailImportMetadataMatches,
} from "@/lib/gmail-capture";

describe("Gmail capture attachment identity", () => {
  it("uses the stable MIME part id rather than Gmail's attachment token", () => {
    expect(
      gmailAttachmentExternalId("message-1", {
        partId: "1.2",
      }),
    ).toBe("message-1:1.2");
  });

  it("matches imports recorded with a stable part id", () => {
    expect(
      gmailImportMetadataMatches(
        JSON.stringify({
          filename: "capture.jpg",
          gmailMessageId: "message-1",
          partId: "1.2",
        }),
        "message-1",
        { filename: "capture.jpg", partId: "1.2" },
      ),
    ).toBe(true);
  });

  it("recognizes legacy imports by message id and filename", () => {
    expect(
      gmailImportMetadataMatches(
        JSON.stringify({
          filename: "capture.jpg",
          gmailMessageId: "message-1",
        }),
        "message-1",
        { filename: "capture.jpg", partId: "1.2" },
      ),
    ).toBe(true);
  });

  it("does not match another message or attachment", () => {
    const metadata = JSON.stringify({
      filename: "capture.jpg",
      gmailMessageId: "message-1",
      partId: "1.2",
    });

    expect(
      gmailImportMetadataMatches(metadata, "message-2", {
        filename: "capture.jpg",
        partId: "1.2",
      }),
    ).toBe(false);
    expect(
      gmailImportMetadataMatches(metadata, "message-1", {
        filename: "different.jpg",
        partId: "1.3",
      }),
    ).toBe(false);
  });
});
