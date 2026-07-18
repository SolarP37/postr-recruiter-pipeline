import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  detectedMimeType,
  isAllowedMimeType,
  validateUpload,
} from "@/lib/upload";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);

describe("upload validation", () => {
  it.each([
    [png, "image/png"], [jpeg, "image/jpeg"], [webp, "image/webp"],
  ])("detects supported image signatures", (bytes, mime) => {
    expect(detectedMimeType(bytes as Uint8Array)).toBe(mime);
  });

  it("rejects MIME spoofing", () => {
    expect(validateUpload({ size: png.length, type: "image/jpeg", bytes: png })).toEqual({
      valid: false, error: "The file contents do not match its image type.",
    });
  });

  it("rejects oversized files before storage", () => {
    expect(validateUpload({ size: MAX_UPLOAD_BYTES + 1, type: "image/png", bytes: png }).valid).toBe(false);
  });

  it("rejects executable content", () => {
    const exe = new Uint8Array([0x4d, 0x5a, 0x90]);
    expect(validateUpload({ size: exe.length, type: "image/png", bytes: exe }).valid).toBe(false);
  });

  it("rejects truncated upload bodies", () => {
    expect(validateUpload({
      size: png.length + 1,
      type: "image/png",
      bytes: png,
    })).toEqual({
      valid: false,
      error: "The uploaded image is incomplete.",
    });
  });

  it("allows only image response content types", () => {
    expect(isAllowedMimeType("image/png")).toBe(true);
    expect(isAllowedMimeType("text/html")).toBe(false);
    expect(isAllowedMimeType("image/svg+xml")).toBe(false);
  });
});
