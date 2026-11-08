/** Finds a Chrome/Chromium binary for printing, or explains how to point at one. */
import { existsSync } from "node:fs";

const CANDIDATES = [
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
].filter(Boolean);

export function findChrome() {
  for (const candidate of CANDIDATES) if (existsSync(candidate)) return candidate;
  throw new Error(
    "Could not find Chrome. Install Google Chrome, or set CHROME_PATH to the browser binary.",
  );
}
