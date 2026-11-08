/**
 * Pulls the decorative artwork out of the printed PDF catalogue so the
 * generated catalogue uses the original ornaments rather than approximations.
 *
 *   node catalogue-print/extract-theme.mjs "/path/to/Maruthi Enterprises Catalogue.pdf"
 *
 * Only needs to be re-run if the source artwork changes. The PNGs it writes are
 * committed, so building a catalogue does not need the PDF.
 */
import * as mupdf from "mupdf";
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(here, "templates/gold-classic/assets");
const src = process.argv[2];
if (!src) {
  console.error('Usage: node catalogue-print/extract-theme.mjs "<catalogue.pdf>"');
  process.exit(1);
}

mkdirSync(assets, { recursive: true });
const doc = mupdf.Document.openDocument(readFileSync(src), "application/pdf");

/** Renders a region of a page (in PDF points) to a PNG buffer. */
function crop(pageNumber, [x0, y0, x1, y1], scale) {
  const page = doc.loadPage(pageNumber - 1);
  const rect = [x0 * scale, y0 * scale, x1 * scale, y1 * scale].map(Math.round);
  const pixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, rect, false);
  pixmap.clear(255);
  const device = new mupdf.DrawDevice(mupdf.Matrix.scale(scale, scale), pixmap);
  page.run(device, mupdf.Matrix.identity);
  device.close();
  return pixmap.asPNG();
}

/** White → transparent, so ornaments sit on any background. */
async function toTransparent(buffer, file) {
  await sharp(buffer).ensureAlpha().unflatten({ threshold: 232 }).png().toFile(path.join(assets, file));
  console.log(`✓ ${file}`);
}

/** Paints a white rectangle over a region before making the art transparent. */
async function mask(buffer, { left, top, width, height }) {
  const patch = await sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } },
  }).png().toBuffer();
  return sharp(buffer).composite([{ input: patch, left, top }]).png().toBuffer();
}

// Card frame corner: the filled dot plus three petals along each edge.
await toTransparent(crop(2, [63.3, 40.3, 95.3, 72.3], 12), "card-corner.png");

// The four-petal clover that sits in the rule under each product title.
await toTransparent(crop(2, [172.5, 73.5, 187.5, 88.5], 24), "title-clover.png");

// Page corner ivy. Page 23 has the frames but no product photographs, and the
// card frame is painted out so only the ivy survives.
const vineScale = 6;
const vine = await mask(crop(23, [0, 0, 130, 190], vineScale), {
  left: Math.round(58 * vineScale),
  top: Math.round(34 * vineScale),
  width: Math.round((130 - 58) * vineScale),
  height: Math.round((190 - 34) * vineScale),
});
await toTransparent(vine, "flourish.png");

// The Kannada blessing from the cover, kept as artwork so the original
// typography survives exactly.
await toTransparent(crop(1, [40, 704, 556, 780], 5), "cover-blessing.png");

console.log(`\nAssets written to ${path.relative(process.cwd(), assets)}`);
