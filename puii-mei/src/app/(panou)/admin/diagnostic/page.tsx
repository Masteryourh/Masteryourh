import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { requireUser } from "@/server/session";
import { measureLatency } from "@/server/diagnostic";
import { writeCeiling } from "@/lib/db-region";

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
  const ceiling = p50 === null ? null : writeCeiling(p50);
  const mismatch = Boolean(m.db?.vercel && m.region && m.db.vercel !== m.region);
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
            {ceiling && (
              <p className="mt-3 text-slate-600" data-ceiling={ceiling.perSecond}>
                Benchmark-ul de scriere (C3): {ceiling.measured ? <>rândul <strong>RTT {ceiling.row}</strong>, plafon măsurat</> : <>RTT {ceiling.row} e <strong>peste ce s-a măsurat</strong> (0 / 2 / 10 ms), plafon <strong>estimat</strong></>} de circa{" "}
                <strong>{ceiling.perSecond} scrieri pe secundă</strong> cu lacătul global al auditului.
              </p>
            )}
          </section>
          <section className="mt-4 rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200" data-diagnostic="regiuni">
            <h2 className="text-lg">Unde rulează</h2>
            <ul className="mt-2 space-y-1">
              <li>Serverul aplicației (Vercel): <strong>{m.region ?? "necunoscut (local)"}</strong></li>
              <li>Baza de date: <strong>{m.db ? `${m.db.provider} ${m.db.region}${m.db.city ? ` (${m.db.city})` : ""}` : "necunoscută (nu e Neon)"}</strong></li>
            </ul>
            {mismatch && (
              <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 font-medium text-amber-950" data-region-mismatch>
                Aplicația și baza de date sunt în regiuni diferite, deci fiecare interogare face drumul între ele. Mută funcțiile
                Vercel în <strong>{m.db!.vercel}</strong> (Vercel → proiect → Settings → Functions → Function Region), apoi
                Redeploy și deschide din nou această pagină.
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
