"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Denumirile secțiunilor din panouri, pentru traseu și „Înapoi la …”. */
const LABELS: Record<string, string> = {
  "/admin": "Panou admin",
  "/admin/loturi": "Loturi",
  "/admin/livrari": "Livrări live",
  "/admin/monitorizare": "Monitorizare creștere",
  "/admin/calitate": "Calitate",
  "/admin/documente": "Documente",
  "/admin/investitii": "Investiții",
  "/admin/parteneri": "Solicitări parteneri",
  "/admin/gospodarii": "Gospodării",
  "/admin/preturi": "Prețuri",
  "/admin/zone": "Zone de livrare",
  "/admin/interes": "Interes produse",
  "/admin/utilizatori": "Utilizatori",
  "/admin/legislatie": "Legislație și surse",
  "/cont/gospodar": "Gospodăria mea",
  "/cont/gospodar/jurnal": "Jurnal de creștere",
  "/cont/gospodar/documente": "Documente și cheltuieli",
  "/cont/gospodar/etichete": "Etichete",
  "/cont/gospodar/legislatie": "Legislație",
  "/cont/investitor": "Investițiile mele",
};
const LAST: Record<string, string> = { regim: "Regim și suprafață" };
/** Pagina de detaliu, după secțiunea din care face parte. */
const DETAIL: Record<string, string> = { ture: "Tura de livrare", livrari: "Tura de livrare", investitii: "Investiția", investitor: "Investiția", gospodarii: "Fișa gospodăriei" };

/** Traseul în panou (ex. Panou admin › Gospodării › Regim) + „← Înapoi la …” pe telefon. Ascuns pe pagina principală. */
export function PanelCrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const rootLen = parts[0] === "admin" ? 1 : 2;
  if (parts.length <= rootLen) return null;
  const crumbs = parts
    .slice(rootLen - 1)
    .map((seg, i) => {
      const href = "/" + parts.slice(0, rootLen + i).join("/");
      const prev = parts[rootLen + i - 2];
      return { href, label: LABELS[href] ?? LAST[seg] ?? DETAIL[prev] ?? "Detalii", known: Boolean(LABELS[href] || (DETAIL[prev] && !LAST[seg])) };
    })
    // Segmentele intermediare fără pagină proprie (ex. /cont/gospodar/ture) nu apar.
    .filter((c, i, all) => c.known || i === all.length - 1 || DETAIL[c.href.split("/").pop()!] === undefined);
  // Paginile de tip „Detalii” fără pagină de listă proprie (ex. /cont/gospodar/ture) trimit la secțiunea de sus.
  const parent = [...crumbs.slice(0, -1)].reverse().find((c) => c.known);
  return (
    <nav aria-label="Unde ești" className="px-4 pt-4 text-sm sm:px-6 lg:px-8 print:hidden">
      {parent && (
        <Link href={parent.href} className="inline-flex items-center gap-1 font-semibold text-[var(--pd-text)] sm:hidden">
          <span aria-hidden>←</span> Înapoi la {parent.label}
        </Link>
      )}
      <ol className="hidden flex-wrap items-center gap-1.5 text-[var(--pd-muted)] sm:flex">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          const linkable = !last && c.known;
          return (
            <li key={c.href} className="flex items-center gap-1.5">
              {linkable ? <Link href={c.href} className="hover:text-slate-900 hover:underline">{c.label}</Link> : <span aria-current={last ? "page" : undefined} className={last ? "font-semibold text-[var(--pd-text)]" : undefined}>{c.label}</span>}
              {!last && <span aria-hidden>›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
