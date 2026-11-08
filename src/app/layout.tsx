import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { site } from "@/lib/site";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

/**
 * The fonts are kept in the repository rather than fetched from Google at
 * build time. next/font/google downloads them during the build, which fails
 * on any builder that cannot reach fonts.googleapis.com — the error is an
 * unhelpful "Cannot read properties of null". Self-hosting also means one less
 * third party serving our visitors.
 *
 * Both files are the latin subset of the variable font, under the SIL Open
 * Font License. To refresh them, see src/app/fonts/README.md.
 */
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

const sora = localFont({
  src: "./fonts/sora-latin.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--font-display",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.shortDescription,
  keywords: [
    "FMCG distributor Bengaluru",
    "OTC healthcare products",
    "ayurvedic products wholesale",
    "personal care distributor",
    "bulk enquiry",
    site.name,
  ],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.shortDescription,
    url: site.url,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0f7c6b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script may set data-theme on <html>
    // before React hydrates.
    <html lang="en" className={`${inter.variable} ${sora.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
