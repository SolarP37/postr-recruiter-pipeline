import { describe, expect, it } from "vitest";
import {
  MAX_PHONE_IMAGE_BYTES,
  phoneImageCandidateError,
} from "@/lib/client-image";

describe("phone image candidate validation", () => {
  it.each([
    ["capture.png", "image/png"],
    ["capture.jpeg", "image/jpeg"],
    ["capture.webp", "image/webp"],
    ["capture.heic", "image/heic"],
    ["capture.HEIF", ""],
  ])("accepts supported phone image %s", (name, type) => {
    expect(phoneImageCandidateError({ name, type, size: 1024 })).toBeNull();
  });

  it("rejects unsupported file containers", () => {
    expect(
      phoneImageCandidateError({
        name: "capture.svg",
        type: "image/svg+xml",
        size: 1024,
      }),
    ).toBe("Choose a PNG, JPEG, WebP, HEIC, or HEIF screenshot.");
  });

  it("rejects phone images above the local preparation limit", () => {
    expect(
      phoneImageCandidateError({
        name: "capture.heic",
        type: "image/heic",
        size: MAX_PHONE_IMAGE_BYTES + 1,
      }),
    ).toBe("Choose a screenshot smaller than 20 MB.");
  });
});
