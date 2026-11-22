import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/**
 * Cadrul simplu al paginilor clientului fără comandă deschisă (confirmarea livrării, evaluarea,
 * ieșirea): fără meniul site-ului; un singur buton duce înapoi la site.
 */
export function ClientFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="panou client-dash flex min-h-dvh flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-[var(--pd-line)] bg-[var(--pd-glass)] backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <span className="text-sm font-bold text-[var(--pd-text)]">Puii mei · Comanda mea</span>
          <div className="flex items-center gap-2">
            <ThemeToggle className="h-8 w-8 rounded-md border border-[var(--pd-line)]" />
            <Link href="/" className="rounded-md border border-[var(--pd-line)] px-3 py-1.5 text-xs font-semibold text-[var(--pd-text)]">← Înapoi la site</Link>
          </div>
        </div>
      </header>
      <main id="continut" className="flex-1 pb-12">{children}</main>
    </div>
  );
}
