import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import { accessSync, constants as fsConstants, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getCategories, getProducts } from "./store";

/**
 * Runs the printable-catalogue builder (catalogue-print/build.mjs) from the
 * admin area.
 *
 * The builder is a plain Node script that renders HTML and prints it with
 * headless Chrome, so this only works where the app runs on a machine that has
 * Chrome and the project files — a local machine, a VPS or a container. It
 * will not work on a serverless host; there the catalogue is built from a
 * terminal instead.
 */

const run = promisify(execFile);

export const CATALOGUE_DIR = path.join(process.cwd(), "catalogue-print");
export const OUTPUT_DIR = path.join(CATALOGUE_DIR, "out");
const BUILD_SCRIPT = path.join(CATALOGUE_DIR, "build.mjs");
const TEMPLATES_DIR = path.join(CATALOGUE_DIR, "templates");
const BUILD_TIMEOUT_MS = 5 * 60 * 1000;

export type Template = {
  id: string;
  name: string;
  description: string;
  perPage: number;
  columns: number;
  rows: number;
  sortOrder: number;
  preview: string | null;
};

export type BuildOptions = {
  template: string;
  category: string | null;
  onlyFeatured: boolean;
  fileName: string | null;
};

export type BuildResult = {
  template: string;
  templateLabel: string;
  products: number;
  pages: number;
  bytes: number;
  pdf: string;
};

/** Same places catalogue-print/chrome.mjs looks. */
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter((candidate): candidate is string => Boolean(candidate));

/**
 * Why the builder cannot run here, or null when it can.
 *
 * Checking that the script exists is not enough: Netlify bundles the
 * catalogue-print folder into the function, so the files are there, but the
 * function has no Chrome and its code directory (/var/task) is read-only.
 */
export function catalogueBuilderUnavailableReason(): string | null {
  if (!existsSync(BUILD_SCRIPT) || !existsSync(TEMPLATES_DIR)) {
    return "The catalogue-print folder is not part of this deployment.";
  }
  try {
    accessSync(CATALOGUE_DIR, fsConstants.W_OK);
  } catch {
    return "This server's files are read-only (a serverless host such as Netlify), so the PDF has nowhere to be saved.";
  }
  if (!CHROME_CANDIDATES.some((candidate) => existsSync(candidate))) {
    return "Google Chrome is not installed on this server, so the PDF cannot be printed. Install it or set CHROME_PATH.";
  }
  return null;
}

export function catalogueBuilderAvailable(): boolean {
  return catalogueBuilderUnavailableReason() === null;
}

/** Every template folder, read straight from its template.json. */
export async function listTemplates(): Promise<Template[]> {
  if (!catalogueBuilderAvailable()) return [];

  const entries = await fs.readdir(TEMPLATES_DIR, { withFileTypes: true });
  const templates: Template[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(TEMPLATES_DIR, entry.name, "template.json");
    if (!existsSync(file)) continue;

    try {
      const config = JSON.parse(await fs.readFile(file, "utf8")) as {
        name?: string;
        description?: string;
        sortOrder?: number;
        grid?: { columns?: number; rows?: number };
      };
      const columns = config.grid?.columns ?? 1;
      const rows = config.grid?.rows ?? 1;
      const preview = `/template-previews/${entry.name}.png`;
      templates.push({
        id: entry.name,
        name: config.name ?? entry.name,
        description: config.description ?? "",
        columns,
        rows,
        perPage: columns * rows,
        sortOrder: config.sortOrder ?? 50,
        preview: existsSync(path.join(process.cwd(), "public", preview.slice(1))) ? preview : null,
      });
    } catch {
      /* a malformed template.json should not break the picker */
    }
  }

  return templates.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/** Only one build at a time — each one starts a Chrome process. */
let building = false;

export async function buildCatalogue(options: BuildOptions): Promise<BuildResult> {
  const unavailable = catalogueBuilderUnavailableReason();
  if (unavailable) throw new Error(unavailable);
  if (building) {
    throw new Error("A catalogue is already being generated. Please wait for it to finish.");
  }

  const templates = await listTemplates();
  if (!templates.some((template) => template.id === options.template)) {
    throw new Error(`Unknown template "${options.template}"`);
  }

  building = true;
  let snapshot: string | null = null;

  try {
    // Build from the catalogue as it stands right now, which may live in
    // Supabase rather than in data/catalogue.json.
    const [products, categories] = await Promise.all([getProducts(), getCategories()]);
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "catalogue-"));
    snapshot = path.join(directory, "catalogue.json");
    await fs.writeFile(snapshot, JSON.stringify({ categories, products, enquiries: [] }), "utf8");

    const args = [
      BUILD_SCRIPT,
      `--template=${options.template}`,
      `--source=${snapshot}`,
      "--json",
    ];
    if (options.category) args.push(`--only=${options.category}`);
    if (options.onlyFeatured) args.push("--featured");
    if (options.fileName) args.push(`--out=${options.fileName}`);

    const { stdout } = await run(process.execPath, args, {
      cwd: process.cwd(),
      timeout: BUILD_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 16,
    });

    const marker = stdout.split("\n").find((line) => line.startsWith("__RESULT__"));
    if (!marker) throw new Error("The builder did not report a result.");
    return JSON.parse(marker.slice("__RESULT__".length)) as BuildResult;
  } catch (error) {
    // execFile's own message is just "Command failed: <command line>"; what
    // went wrong is in the builder's stderr.
    const stderr =
      error && typeof error === "object" && "stderr" in error ? String((error as { stderr: unknown }).stderr) : "";
    const message = [stderr, error instanceof Error ? error.message : String(error)].join("\n");
    if (/Could not find Chrome/i.test(message)) {
      throw new Error(
        "Chrome was not found on the server, so the PDF could not be printed. Install Google Chrome or set CHROME_PATH.",
      );
    }
    if (/timed out|ETIMEDOUT/i.test(message)) {
      throw new Error("The catalogue took too long to build. Try a single category or a denser template.");
    }
    if (/EROFS|read-only file system/i.test(message)) {
      throw new Error("This server's files are read-only, so the PDF could not be saved. Generate it locally instead.");
    }
    const firstLine = message
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("at "));
    throw new Error(firstLine || "The catalogue could not be generated.");
  } finally {
    building = false;
    if (snapshot) await fs.rm(path.dirname(snapshot), { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Resolves a generated file name to a path inside the output directory. */
export function resolveOutputFile(name: string): string | null {
  const safe = path.basename(name);
  if (!/^[A-Za-z0-9._-]+\.pdf$/.test(safe)) return null;
  const file = path.join(OUTPUT_DIR, safe);
  if (!file.startsWith(OUTPUT_DIR + path.sep) || !existsSync(file)) return null;
  return file;
}

/** The catalogues generated so far, newest first. */
export async function listGenerated(): Promise<{ name: string; bytes: number; builtAt: string }[]> {
  if (!existsSync(OUTPUT_DIR)) return [];
  const files = await fs.readdir(OUTPUT_DIR);
  const pdfs = await Promise.all(
    files
      .filter((file) => file.endsWith(".pdf"))
      .map(async (file) => {
        const stat = await fs.stat(path.join(OUTPUT_DIR, file));
        return { name: file, bytes: stat.size, builtAt: stat.mtime.toISOString() };
      }),
  );
  return pdfs.sort((a, b) => b.builtAt.localeCompare(a.builtAt));
}
