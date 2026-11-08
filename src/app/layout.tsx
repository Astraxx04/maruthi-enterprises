import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { Providers } from "@/components/providers";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const sora = Sora({ subsets: ["latin"], display: "swap", variable: "--font-display", weight: ["600", "700"] });

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
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
