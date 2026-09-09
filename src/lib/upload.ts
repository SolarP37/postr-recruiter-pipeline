export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(value as AllowedMimeType);
}

export function detectedMimeType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function validateUpload(file: {
  size: number;
  type: string;
  bytes: Uint8Array;
}): { valid: true; mimeType: AllowedMimeType } | {
  valid: false;
  error: string;
} {
  if (file.size <= 0) return { valid: false, error: "The image is empty." };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { valid: false, error: "Images must be 4 MB or smaller." };
  }
  if (file.size !== file.bytes.byteLength) {
    return { valid: false, error: "The uploaded image is incomplete." };
  }
  if (!isAllowedMimeType(file.type)) {
    return { valid: false, error: "Only PNG, JPEG, and WebP images are accepted." };
  }
  const detected = detectedMimeType(file.bytes);
  if (!detected || detected !== file.type) {
    return { valid: false, error: "The file contents do not match its image type." };
  }
  return {
    valid: true,
    mimeType: detected as AllowedMimeType,
  };
}
