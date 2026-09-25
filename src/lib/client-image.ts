import { MAX_UPLOAD_BYTES, isAllowedMimeType } from "@/lib/upload";

export const MAX_PHONE_IMAGE_BYTES = 20 * 1024 * 1024;

const PHONE_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const PHONE_IMAGE_EXTENSION = /\.(png|jpe?g|webp|heic|heif)$/i;

type ImageCandidate = Pick<File, "name" | "size" | "type">;

export function phoneImageCandidateError(file: ImageCandidate): string | null {
  if (file.size <= 0) return "The selected image is empty.";
  if (file.size > MAX_PHONE_IMAGE_BYTES) {
    return "Choose a screenshot smaller than 20 MB.";
  }
  if (
    !PHONE_IMAGE_MIME_TYPES.has(file.type.toLowerCase()) &&
    !PHONE_IMAGE_EXTENSION.test(file.name)
  ) {
    return "Choose a PNG, JPEG, WebP, HEIC, or HEIF screenshot.";
  }
  return null;
}

function jpegFilename(name: string) {
  const base = name.replace(/\.[^.]+$/, "") || "screenshot";
  return `${base}.jpg`;
}

async function decodedImage(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Safari may decode a Photos selection through an image element even
      // when createImageBitmap does not support the original container.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Image decoding failed."));
      element.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("The browser could not convert this image.")),
      "image/jpeg",
      quality,
    );
  });
}

export async function normalizePhoneImage(file: File): Promise<{
  file: File;
  optimized: boolean;
}> {
  const candidateError = phoneImageCandidateError(file);
  if (candidateError) throw new Error(candidateError);

  if (isAllowedMimeType(file.type) && file.size <= MAX_UPLOAD_BYTES) {
    return { file, optimized: false };
  }

  let decoded: Awaited<ReturnType<typeof decodedImage>>;
  try {
    decoded = await decodedImage(file);
  } catch {
    throw new Error(
      "This device could not convert the selected image. Export it as JPEG or PNG and try again.",
    );
  }

  try {
    if (!decoded.width || !decoded.height) {
      throw new Error("The selected image has invalid dimensions.");
    }

    const attempts = [
      { dimension: 2600, quality: 0.9 },
      { dimension: 2300, quality: 0.84 },
      { dimension: 2000, quality: 0.78 },
      { dimension: 1700, quality: 0.72 },
    ];

    for (const attempt of attempts) {
      const scale = Math.min(
        1,
        attempt.dimension / Math.max(decoded.width, decoded.height),
      );
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Image conversion is unavailable.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(decoded.source, 0, 0, width, height);
      const blob = await canvasBlob(canvas, attempt.quality);
      if (blob.size <= MAX_UPLOAD_BYTES) {
        return {
          file: new File([blob], jpegFilename(file.name), {
            type: "image/jpeg",
            lastModified: Date.now(),
          }),
          optimized: true,
        };
      }
    }
  } finally {
    decoded.dispose();
  }

  throw new Error(
    "The screenshot is still too large after safe conversion. Crop it closer to the visible profile and email, then try again.",
  );
}
