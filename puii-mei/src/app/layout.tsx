import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd, organizationJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"], display: "swap" });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Puii mei – Pui de carne crescuți la comandă în gospodării locale",
    template: "%s | Puii mei",
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "pui de țară",
    "carne de pui",
    "pui crescuți la comandă",
    "precomandă pui",
    "pui din gospodărie",
    "carne de pui proaspătă",
    "producători locali",
    "trasabilitate",
  ],
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    title: "Puii mei – Crescuți pentru tine",
    description: site.description,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fdfbf6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ro" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#continut"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-forest-800 focus:px-4 focus:py-2 focus:text-white"
        >
          Sari la conținut
        </a>
        <Header />
        <main id="continut" className="flex-1">
          {children}
        </main>
        <Footer />
        <JsonLd data={organizationJsonLd} />
      </body>
    </html>
  );
}
