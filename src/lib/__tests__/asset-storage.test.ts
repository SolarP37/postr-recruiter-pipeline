import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assetStorageForReference,
  configuredAssetStorage,
  createLocalAssetStorage,
  createVercelBlobAssetStorage,
  type VercelBlobClient,
} from "@/lib/asset-storage";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("asset storage", () => {
  it("stores, reads, and removes private local assets", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "postr-assets-"));
    temporaryDirectories.push(root);
    const storage = createLocalAssetStorage(root);
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

    const stored = await storage.store({
      bytes,
      mimeType: "image/png",
    });

    expect(stored.reference).toMatch(
      /^local:[0-9a-f-]+\.png$/i,
    );
    const read = await storage.read(stored.reference);
    expect(read?.contentType).toBe("image/png");
    expect(Array.from(new Uint8Array(read?.body as ArrayBuffer))).toEqual(
      Array.from(bytes),
    );

    await storage.remove(stored.reference);
    await expect(storage.read(stored.reference)).resolves.toBeNull();
  });

  it("rejects traversal and malformed storage references", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "postr-assets-"));
    temporaryDirectories.push(root);

    await expect(
      createLocalAssetStorage(root).read("local:../secret.png"),
    ).resolves.toBeNull();
    await expect(
      assetStorageForReference("vercel-blob:../secret.png").read(
        "vercel-blob:../secret.png",
      ),
    ).resolves.toBeNull();
  });

  it("keeps Vercel Blob assets private and addressable by pathname", async () => {
    const put = vi.fn(async (pathname: string) => ({ pathname }));
    const get = vi.fn(async () => ({
      statusCode: 200 as const,
      stream: new ReadableStream<Uint8Array>(),
      blob: { contentType: "image/png" },
    }));
    const del = vi.fn(async () => undefined);
    const storage = createVercelBlobAssetStorage({
      put,
      get,
      del,
    } as unknown as VercelBlobClient);

    const stored = await storage.store({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: "image/png",
    });
    await storage.read(stored.reference);
    await storage.remove(stored.reference);

    expect(stored.reference).toMatch(
      /^vercel-blob:screenshots\/[0-9a-f-]+\.png$/i,
    );
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^screenshots\/[0-9a-f-]+\.png$/i),
      expect.any(Buffer),
      expect.objectContaining({
        access: "private",
        addRandomSuffix: false,
        contentType: "image/png",
      }),
    );
    expect(get).toHaveBeenCalledWith(
      stored.reference.slice("vercel-blob:".length),
      { access: "private", useCache: false },
    );
    expect(del).toHaveBeenCalledWith(
      stored.reference.slice("vercel-blob:".length),
    );
  });

  it("refuses implicit ephemeral storage in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ASSET_STORAGE_PROVIDER", "local");

    expect(() => configuredAssetStorage()).toThrow(
      "ASSET_STORAGE_PROVIDER must be set to vercel-blob in production.",
    );
  });
});
