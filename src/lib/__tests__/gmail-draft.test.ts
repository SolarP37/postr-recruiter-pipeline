import { describe, expect, it } from "vitest";
import { gmailRawMessage } from "@/lib/gmail";

describe("Gmail draft MIME", () => {
  it("contains both plain-text and HTML alternatives without sending", () => {
    const raw = gmailRawMessage(
      "creator@example.com",
      "A creator opportunity",
      "Plain invitation https://u.postr.com/postrpatcon",
      '<p><a href="https://u.postr.com/postrpatcon">Invitation</a></p>',
    );
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    expect(decoded).toContain("multipart/alternative");
    expect(decoded).toContain("Content-Type: text/plain");
    expect(decoded).toContain("Content-Type: text/html");
    expect(decoded).toContain("https://u.postr.com/postrpatcon");
    expect(decoded).not.toContain("users.drafts.send");
  });
});
