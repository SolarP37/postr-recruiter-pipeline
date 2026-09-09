import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_PHONE_IMAGE_BYTES,
  normalizePhoneImage,
  phoneImageCandidateError,
} from "@/lib/client-image";

afterEach(() => vi.unstubAllGlobals());

function installCanvas(blobSize = 1024) {
  const context = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: (blob: Blob) => void) => callback(new Blob([new Uint8Array(blobSize)], { type: "image/jpeg" }))),
  };
  vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
  return { canvas, context };
}

function conversionCandidate(name = "capture.heic") {
  return new File([new Uint8Array(5 * 1024 * 1024)], name, { type: "image/heic" });
}

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

describe("cross-browser phone image preparation", () => {
  it("prepares an image through Chromium's createImageBitmap path", async () => {
    const close = vi.fn();
    const createBitmap = vi.fn(async () => ({ width: 3200, height: 1800, close }));
    vi.stubGlobal("createImageBitmap", createBitmap);
    const { canvas } = installCanvas();

    const result = await normalizePhoneImage(conversionCandidate());

    expect(result.optimized).toBe(true);
    expect(result.file).toMatchObject({ name: "capture.jpg", type: "image/jpeg" });
    expect(createBitmap).toHaveBeenCalledWith(expect.any(File), { imageOrientation: "from-image" });
    expect(canvas.width).toBe(2600);
    expect(close).toHaveBeenCalledOnce();
  });

  it("prepares an image through Safari's image-element fallback", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new Error("HEIC unsupported"); }));
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:safari-photo"), revokeObjectURL });
    class SafariImage {
      naturalWidth = 1200;
      naturalHeight = 800;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    }
    vi.stubGlobal("Image", SafariImage);
    installCanvas();

    const result = await normalizePhoneImage(conversionCandidate("iphone.heif"));

    expect(result.file.name).toBe("iphone.jpg");
    expect(result.optimized).toBe(true);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:safari-photo");
  });

  it("returns actionable guidance when Firefox cannot decode the container", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new Error("unsupported"); }));
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:firefox-photo"), revokeObjectURL });
    class FirefoxImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      set src(_value: string) { queueMicrotask(() => this.onerror?.()); }
    }
    vi.stubGlobal("Image", FirefoxImage);

    await expect(normalizePhoneImage(conversionCandidate())).rejects.toThrow(/Export it as JPEG or PNG/);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:firefox-photo");
  });
});
