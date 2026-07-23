import { describe, expect, it } from "vitest";
import {
  collectImageParts,
  gmailAttachmentExternalId,
  gmailCaptureQuery,
  gmailImportMetadataMatches,
} from "@/lib/gmail-capture";

describe("Gmail capture discovery", () => {
  it("does not exclude inline images with Gmail's attachment search operator", () => {
    expect(gmailCaptureQuery("capture@example.com")).toBe(
      "to:capture@example.com newer_than:30d",
    );
    expect(gmailCaptureQuery("capture@example.com")).not.toContain(
      "has:attachment",
    );
  });

  it("collects both normal attachments and pasted inline images", () => {
    const parts = collectImageParts({
      mimeType: "multipart/mixed",
      parts: [
        {
          partId: "1",
          filename: "attached.png",
          mimeType: "image/png",
          body: { attachmentId: "attachment-1" },
        },
        {
          partId: "2",
          filename: "inline.jpg",
          mimeType: "image/jpeg",
          headers: [
            { name: "Content-Disposition", value: "inline" },
          ],
          body: { attachmentId: "inline-1" },
        },
      ],
    });

    expect(parts.map((part) => part.filename)).toEqual([
      "attached.png",
      "inline.jpg",
    ]);
  });

  it("walks nested multipart messages and ignores unsupported files", () => {
    const parts = collectImageParts({
      mimeType: "multipart/related",
      parts: [
        {
          partId: "1",
          mimeType: "multipart/alternative",
          parts: [
            {
              partId: "1.1",
              filename: "pasted.webp",
              mimeType: "image/webp",
              body: { data: "aW1hZ2U" },
            },
          ],
        },
        {
          partId: "2",
          filename: "notes.pdf",
          mimeType: "application/pdf",
          body: { attachmentId: "pdf-1" },
        },
      ],
    });

    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({
      filename: "pasted.webp",
      mimeType: "image/webp",
      partId: "1.1",
    });
  });
});

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
