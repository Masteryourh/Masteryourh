import type { Viewport } from "next";

/**
 * Panourile se comportă ca o aplicație pe telefon: pagina nu se micșorează niciodată sub lățimea ecranului (un tabel lat
 * se derulează în containerul lui), deci bara de navigare de jos rămâne mereu pe ecran. Mărirea cu degetele rămâne
 * permisă (fără maximum-scale / user-scalable=no, pentru accesibilitate).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

/** Layout-ul panourilor de control (admin, gospodar, investitor): fără meniul și footer-ul site-ului. */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
