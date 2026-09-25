import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) {
  throw new Error("Pass the official Postr QR screenshot path.");
}

const output = path.resolve("public/assets/postr/postrpatcon-qr.png");
await mkdir(path.dirname(output), { recursive: true });

const image = sharp(source);
const metadata = await image.metadata();
if (metadata.width !== 1284 || metadata.height !== 2778) {
  throw new Error(
    `Unexpected screenshot dimensions ${metadata.width}x${metadata.height}; review crop before continuing.`,
  );
}

// Exact white QR panel from the supplied Postr screenshot. The extraction keeps
// the full panel, including its built-in quiet zone, and does not resample.
await image
  .extract({ left: 264, top: 768, width: 756, height: 756 })
  .png({ compressionLevel: 6 })
  .toFile(output);

console.log(output);
