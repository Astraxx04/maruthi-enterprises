/**
 * Renders a thumbnail of each template so the admin picker can show what it
 * looks like rather than just naming it.
 *
 *   node catalogue-print/make-previews.mjs
 *
 * Writes public/template-previews/<template>.png. Re-run after adding or
 * restyling a template.
 */
import * as mupdf from "mupdf";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const templatesDir = path.join(here, "templates");
const outDir = path.join(root, "public/template-previews");
const scratch = path.join(here, "out");

mkdirSync(outDir, { recursive: true });

const templates = readdirSync(templatesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(path.join(templatesDir, entry.name, "template.json")))
  .map((entry) => entry.name);

for (const template of templates) {
  const name = `preview-${template}`;
  // A single small category keeps each build to a couple of seconds.
  execFileSync(
    process.execPath,
    [path.join(here, "build.mjs"), `--template=${template}`, "--only=Baby Care", `--out=${name}`],
    { stdio: "ignore" },
  );

  const pdf = path.join(scratch, `${name}.pdf`);
  const doc = mupdf.Document.openDocument(readFileSync(pdf), "application/pdf");
  // Page 2 is the first page of products; page 1 is the cover.
  const page = doc.loadPage(Math.min(1, doc.countPages() - 1));
  const pixmap = page.toPixmap(mupdf.Matrix.scale(0.62, 0.62), mupdf.ColorSpace.DeviceRGB, false, true);
  writeFileSync(path.join(outDir, `${template}.png`), pixmap.asPNG());

  rmSync(pdf, { force: true });
  rmSync(path.join(scratch, `${name}.html`), { force: true });
  console.log(`✓ ${template}.png`);
}

console.log(`\nPreviews written to ${path.relative(process.cwd(), outDir)}`);
