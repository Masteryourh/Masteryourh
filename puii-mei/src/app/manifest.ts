import type { MetadataRoute } from "next";

/**
 * Instalarea ca aplicație (PWA): doar manifestul și iconițele, ca panoul să se deschidă din ecranul telefonului fără
 * bara browserului. Intenționat FĂRĂ service worker: nicio pagină sau dată din cont nu se păstrează pe telefon și nu
 * există scrieri offline (mandat #62, 28.11.2026). Fără conexiune, telefonul arată eroarea obișnuită a browserului.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/cont",
    name: "Puii mei",
    short_name: "Puii mei",
    description: "Panoul Puii mei: comenzi, loturi, livrări și gospodării.",
    lang: "ro",
    dir: "ltr",
    // „/cont” trimite fiecare utilizator în panoul lui (admin, gospodar, investitor) sau la autentificare.
    start_url: "/cont?sursa=aplicatie",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fffbf3",
    theme_color: "#fffbf3",
    categories: ["business", "food"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Astăzi (admin)", short_name: "Astăzi", url: "/admin/azi", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
      { name: "Gospodăria mea", short_name: "Gospodăria", url: "/cont/gospodar", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
