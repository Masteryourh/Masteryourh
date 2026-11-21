import type { LegalEntry } from "@/lib/legal";
import { legalKindLabels, type LegalKind } from "@/lib/legal";
import { formatDate } from "@/lib/format";

/** Lista surselor, grupată pe tipuri; `actions` adaugă butoane (doar în admin). */
export function LegalList({ entries, actions }: { entries: LegalEntry[]; actions?: (e: LegalEntry) => React.ReactNode }) {
  return (
    <div className="space-y-8">
      {(Object.keys(legalKindLabels) as LegalKind[]).map((kind) => {
        const list = entries.filter((e) => e.kind === kind);
        if (!list.length) return null;
        return (
          <section key={kind}>
            <h2 className="text-lg">{legalKindLabels[kind]}</h2>
            <ul className="mt-3 space-y-2">
              {list.map((e) => (
                <li key={e.id} className={`rounded-xl bg-white p-4 ring-1 ring-slate-200 ${e.archived ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-700 underline">
                      {e.title} ↗
                    </a>
                    <span className="flex flex-wrap gap-1.5 text-xs">
                      {e.date && <span className="rounded bg-slate-100 px-2 py-0.5">{formatDate(e.date)}</span>}
                      {e.verified ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 font-semibold text-green-900">Verificat</span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">De verificat</span>
                      )}
                      {e.archived && <span className="rounded bg-slate-200 px-2 py-0.5">Arhivat</span>}
                    </span>
                  </div>
                  {e.summary && <p className="mt-1.5 text-sm text-slate-600">{e.summary}</p>}
                  <p className="mt-1 text-[11px] text-slate-400">{new URL(e.url).hostname}</p>
                  {actions?.(e)}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
