import sharp from "sharp";

const target = process.argv[2];
if (!target) throw new Error("Provide an output path.");

await sharp({
  create: {
    width: 640,
    height: 960,
    channels: 3,
    background: { r: 241, g: 245, b: 249 },
  },
})
  .png()
  .toFile(target);
