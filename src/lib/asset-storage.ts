import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import type { AllowedMimeType } from "@/lib/upload";

const LOCAL_PREFIX = "local:";
const BLOB_PREFIX = "vercel-blob:";
const LEGACY_LOCAL_DIRECTORY = path.join("storage", "uploads");

const EXTENSIONS: Record<AllowedMimeType, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

type StoreInput = {
  bytes: Uint8Array;
  mimeType: AllowedMimeType;
};

export type StoredAsset = {
  reference: string;
};

export type StoredAssetRead = {
  body: ArrayBuffer | ReadableStream<Uint8Array>;
  contentType: string;
};

export interface AssetStorage {
  store(input: StoreInput): Promise<StoredAsset>;
  read(reference: string): Promise<StoredAssetRead | null>;
  remove(reference: string): Promise<void>;
}

export type VercelBlobClient = {
  put: typeof put;
  get: typeof get;
  del: typeof del;
};

function safeFilename(reference: string): string | null {
  let filename: string;

  if (reference.startsWith(LOCAL_PREFIX)) {
    filename = reference.slice(LOCAL_PREFIX.length);
  } else {
    const legacyPrefix = `${LEGACY_LOCAL_DIRECTORY}${path.sep}`;
    if (!reference.startsWith(legacyPrefix)) return null;
    filename = reference.slice(legacyPrefix.length);
  }

  return filename === path.basename(filename) &&
    /^[0-9a-f-]+\.(png|jpg|webp)$/i.test(filename)
    ? filename
    : null;
}

function safeBlobPathname(reference: string): string | null {
  if (!reference.startsWith(BLOB_PREFIX)) return null;
  const pathname = reference.slice(BLOB_PREFIX.length);
  return /^screenshots\/[0-9a-f-]+\.(png|jpg|webp)$/i.test(pathname)
    ? pathname
    : null;
}

export function createLocalAssetStorage(
  rootDirectory = process.cwd(),
): AssetStorage {
  const uploadDirectory = path.join(
    rootDirectory,
    "storage",
    "uploads",
  );

  return {
    async store({ bytes, mimeType }) {
      const filename = `${randomUUID()}${EXTENSIONS[mimeType]}`;
      await mkdir(uploadDirectory, { recursive: true });
      await writeFile(path.join(uploadDirectory, filename), bytes, {
        flag: "wx",
      });
      return { reference: `${LOCAL_PREFIX}${filename}` };
    },

    async read(reference) {
      const filename = safeFilename(reference);
      if (!filename) return null;

      try {
        const bytes = await readFile(path.join(uploadDirectory, filename));
        return {
          body: Uint8Array.from(bytes).buffer,
          contentType:
            path.extname(filename).toLowerCase() === ".png"
              ? "image/png"
              : path.extname(filename).toLowerCase() === ".webp"
                ? "image/webp"
                : "image/jpeg",
        };
      } catch {
        return null;
      }
    },

    async remove(reference) {
      const filename = safeFilename(reference);
      if (!filename) return;
      await unlink(path.join(uploadDirectory, filename)).catch(() => undefined);
    },
  };
}

export function createVercelBlobAssetStorage(
  client: VercelBlobClient = { put, get, del },
): AssetStorage {
  return {
    async store({ bytes, mimeType }) {
      const pathname = `screenshots/${randomUUID()}${EXTENSIONS[mimeType]}`;
      const blob = await client.put(pathname, Buffer.from(bytes), {
        access: "private",
        addRandomSuffix: false,
        contentType: mimeType,
      });
      return { reference: `${BLOB_PREFIX}${blob.pathname}` };
    },

    async read(reference) {
      const pathname = safeBlobPathname(reference);
      if (!pathname) return null;
      const result = await client.get(pathname, {
        access: "private",
        useCache: false,
      });
      if (!result || result.statusCode !== 200) return null;
      return {
        body: result.stream,
        contentType: result.blob.contentType,
      };
    },

    async remove(reference) {
      const pathname = safeBlobPathname(reference);
      if (!pathname) return;
      await client.del(pathname);
    },
  };
}

export function configuredAssetStorage(): AssetStorage {
  const provider = process.env.ASSET_STORAGE_PROVIDER;

  if (provider === "vercel-blob") {
    return createVercelBlobAssetStorage();
  }

  if (
    process.env.NODE_ENV !== "production" &&
    (provider === "local" || !provider)
  ) {
    return createLocalAssetStorage();
  }

  throw new Error(
    "ASSET_STORAGE_PROVIDER must be set to vercel-blob in production.",
  );
}

export function assetStorageForReference(reference: string): AssetStorage {
  if (reference.startsWith(BLOB_PREFIX)) {
    return createVercelBlobAssetStorage();
  }
  return createLocalAssetStorage();
}
