import type { Metadata, Viewport } from "next";
import { Fredoka, Inter } from "next/font/google";
import { JsonLd, organizationJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";
import "./globals.css";
import { themeScript } from "@/components/layout/ThemeToggle";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"], display: "swap" });
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin", "latin-ext"], display: "swap" });

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
  themeColor: "#fffbf3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ro" className={`${inter.variable} ${fredoka.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        {children}
        <JsonLd data={organizationJsonLd} />
      </body>
    </html>
  );
}
