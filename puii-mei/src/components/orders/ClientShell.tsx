import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/**
 * Cadrul panoului clientului („Comanda mea”): bară de sus cu comanda, secțiunile paginii,
 * temă și ieșire. Fără meniul site-ului; se intră din „Comanda mea” cu numărul precomenzii + PIN.
 */
export function ClientShell({ number, token, children }: { number: string; token: string; children: React.ReactNode }) {
  const sections = [
    { href: `/comanda/${token}#panou`, label: "Panou" },
    { href: `/comanda/${token}#plata`, label: "Plăți" },
    { href: `/comanda/${token}#cifre`, label: "Cifre" },
    { href: `/comanda/${token}#jurnal`, label: "Jurnal și poze" },
    { href: `/comanda/${token}#livrare`, label: "Livrare" },
    { href: `/comanda/${token}/contract`, label: "Contract" },
  ];
  return (
    <div className="panou client-dash flex min-h-dvh flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-[var(--pd-line)] bg-[var(--pd-glass)] backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <Link href={`/comanda/${token}`} className="min-w-0">
            <span className="block text-sm font-bold text-[var(--pd-text)]">Puii mei · Comanda mea</span>
            <span className="block font-mono text-xs text-[var(--pd-muted)]">{number}</span>
          </Link>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer" className="hidden text-xs text-[var(--pd-muted)] underline sm:inline">Site-ul Puii mei ↗</a>
            <ThemeToggle className="h-8 w-8 rounded-md border border-[var(--pd-line)]" />
            <form action="/comanda/iesire" method="post">
              <button className="rounded-md border border-[var(--pd-line)] px-3 py-1.5 text-xs font-semibold text-[var(--pd-text)]">Ieșire</button>
            </form>
          </div>
          <nav aria-label="Secțiunile comenzii" className="-mx-1 flex w-full gap-1 overflow-x-auto pb-0.5">
            {sections.map((s) => (
              <a key={s.href} href={s.href} className="shrink-0 rounded-full px-3 py-1 text-sm text-[var(--pd-muted)] hover:bg-[var(--pd-glass-2)] hover:text-[var(--pd-text)]">
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main id="continut" className="flex-1 pb-12">{children}</main>
    </div>
  );
}
