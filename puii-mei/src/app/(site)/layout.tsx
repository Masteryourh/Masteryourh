import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ConstructionFrame } from "@/components/layout/ConstructionFrame";

/** Layout-ul paginilor publice: meniu, conținut, footer. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
      <ConstructionFrame />
    </>
  );
}
