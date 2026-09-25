import jsQR from "jsqr";
import sharp from "sharp";

const expected = "https://u.postr.com/postrpatcon";
const file = process.argv[2] || "public/assets/postr/postrpatcon-qr.png";
const { data, info } = await sharp(file)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const decoded = jsQR(
  new Uint8ClampedArray(data),
  info.width,
  info.height,
  { inversionAttempts: "attemptBoth" },
);

if (!decoded) throw new Error(`Unable to decode QR asset: ${file}`);
if (decoded.data !== expected) {
  throw new Error(`QR resolved to ${decoded.data}; expected ${expected}`);
}

console.log(`Verified ${file} -> ${decoded.data}`);
