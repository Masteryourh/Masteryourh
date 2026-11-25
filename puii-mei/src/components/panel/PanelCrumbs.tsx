"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { safeInternalPath } from "@/lib/safe-return";

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
  "/admin/mesaje": "Mesaje netrimise",
  "/cont/gospodar": "Gospodăria mea",
  "/cont/gospodar/jurnal": "Jurnal de creștere",
  "/cont/gospodar/documente": "Documente și cheltuieli",
  "/cont/gospodar/etichete": "Etichete",
  "/cont/gospodar/legislatie": "Legislație",
  "/cont/investitor": "Investițiile mele",
};
const LAST: Record<string, string> = { regim: "Regim și suprafață", jurnal: "Jurnal de creștere", contract: "Contract", etichete: "Etichete", documente: "Documente și cheltuieli" };
/** Pagina de detaliu, după secțiunea din care face parte. */
const DETAIL: Record<string, string> = { ture: "Tura de livrare", livrari: "Tura de livrare", investitii: "Investiția", investitor: "Investiția", gospodarii: "Fișa gospodăriei", comenzi: "Comanda" };

/** Traseul în panou (ex. Panou admin › Gospodării › Regim) + „← Înapoi la …” pe telefon. Ascuns pe pagina principală. */
export function PanelCrumbs() {
  const pathname = usePathname();
  const search = useSearchParams();
  const parts = pathname.split("/").filter(Boolean);
  // NAV-03 / NAV-09: „Înapoi” la pagina de origine (cu filtrele ei), doar dacă e o rută internă din ACELAȘI spațiu;
  // altfel, părintele din traseu (fallback determinist: refresh, link direct, tab nou).
  const space = parts[0] === "admin" ? "/admin" : `/${parts.slice(0, 2).join("/")}`;
  const origin = safeInternalPath(search.get("inapoi"), space);
  // Eticheta originii, după aceleași reguli ca traseul (ex. „Loturi”, „Comanda”, „Fișa gospodăriei”).
  const originPath = origin ? origin.split(/[?#]/)[0] : "";
  const oSegs = originPath.split("/").filter(Boolean);
  const originLabel = origin ? (LABELS[originPath] ?? LAST[oSegs.at(-1) ?? ""] ?? DETAIL[oSegs.at(-2) ?? ""] ?? "pagina anterioară") : null;
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
  const back = origin ? { href: origin, label: originLabel! } : parent;
  return (
    <nav aria-label="Unde ești" className="px-4 pt-4 text-sm sm:px-6 lg:px-8 print:hidden">
      {back && (
        <Link href={back.href} data-nav-back className={`inline-flex items-center gap-1 font-semibold text-[var(--pd-text)] ${origin ? "mb-2" : "sm:hidden"}`}>
          <span aria-hidden>←</span> Înapoi la {back.label}
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
