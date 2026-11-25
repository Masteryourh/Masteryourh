import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { requireUser } from "@/server/session";
import { measureLatency } from "@/server/diagnostic";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Diagnostic", robots: { index: false, follow: false } };

const ms = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)} ms`);

/**
 * Diagnostic tehnic (doar citiri): latența reală aplicație ↔ bază de date, măsurată la fiecare deschidere a paginii.
 * Rezultatul alege rândul relevant din benchmark-ul de scriere (docs/architecture/CLAUDE-BENCH-C3-SCRIERE.md).
 */
export default async function DiagnosticPage() {
  await requireUser(["admin"], "/admin/diagnostic");
  const m = await measureLatency();
  const p50 = m.rtt.p50;
  const row = p50 === null ? null : p50 < 1 ? "0 ms" : p50 < 6 ? "2 ms" : "10 ms";
  return (
    <Container className="max-w-3xl py-8">
      <h1>Diagnostic tehnic</h1>
      <p className="mt-1 text-sm text-slate-600">
        Măsurători făcute acum, din serverul aplicației{m.region ? ` (regiunea ${m.region})` : ""}, către baza de date. Doar
        citiri; reîncarcă pagina pentru o măsurătoare nouă.
      </p>
      {m.storage !== "postgres" ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200">Aplicația nu folosește o bază PostgreSQL în acest mediu: nimic de măsurat.</p>
      ) : (
        <>
          <section className="mt-6 rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200" data-diagnostic="rtt">
            <h2 className="text-lg">Drum dus-întors la baza de date ({m.rtt.samples} măsurători)</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
              <div><dt className="text-slate-500">minim</dt><dd className="font-semibold">{ms(m.rtt.min)}</dd></div>
              <div><dt className="text-slate-500">median (p50)</dt><dd className="font-semibold" data-rtt-p50={m.rtt.p50 ?? ""}>{ms(m.rtt.p50)}</dd></div>
              <div><dt className="text-slate-500">p95</dt><dd className="font-semibold">{ms(m.rtt.p95)}</dd></div>
              <div><dt className="text-slate-500">maxim</dt><dd className="font-semibold">{ms(m.rtt.max)}</dd></div>
            </dl>
            {row && (
              <p className="mt-3 text-slate-600">
                Rândul relevant din benchmark-ul de scriere (C3): <strong>RTT {row}</strong>. Cu lacătul global al auditului,
                plafonul măsurat acolo e de circa {row === "10 ms" ? "30" : row === "2 ms" ? "120" : "800"} de scrieri pe secundă.
              </p>
            )}
          </section>
          <section className="mt-4 rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200">
            <h2 className="text-lg">Operații tipice</h2>
            <ul className="mt-2 space-y-1">
              {Object.entries(m.ops).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-4"><span>{k}</span><span className="font-semibold tabular-nums">{ms(v)}</span></li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">Măsurat la {new Date(m.at).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}; total {ms(m.totalMs)}. Prima deschidere după o pauză include pornirea serverului și a conexiunii.</p>
          </section>
        </>
      )}
    </Container>
  );
}
