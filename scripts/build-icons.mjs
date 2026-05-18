import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(
  ROOT,
  "design/welchfest-handoff/welchfest/project/assets/welch-mark.png"
);
const PUBLIC = join(ROOT, "public");

const PAPER = { r: 0xef, g: 0xe8, b: 0xd4, alpha: 1 };

async function build(size, filename, padding = 0.18) {
  const inner = Math.round(size * (1 - padding * 2));
  const mark = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { ...PAPER, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: PAPER,
    },
  })
    .composite([
      {
        input: mark,
        top: Math.round((size - inner) / 2),
        left: Math.round((size - inner) / 2),
      },
    ])
    .png()
    .toFile(join(PUBLIC, filename));
  console.log(`wrote ${filename} (${size}px)`);
}

await build(192, "icon-192.png");
await build(512, "icon-512.png");
await build(180, "apple-touch-icon.png", 0.16);
