import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { DEFAULT_LIMITS, birdsInYear, effectiveLimits, standingEffects, standingLabels, type FarmStanding } from "@/lib/governance";
import { formatDate } from "@/lib/format";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { governanceRepository } from "@/server/repositories/governance";
import { saveLimitsAction, setStandingAction, verifyLandAction } from "../../regim-actions";
import { landRepository } from "@/server/repositories/land";
import { GROWTH, pensForArea } from "@/lib/growth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Regimul gospodăriei", robots: { index: false, follow: false } };

const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal";
const tone: Record<FarmStanding, string> = {
  activa: "bg-green-100 text-green-900",
  avertizata: "bg-amber-100 text-amber-900",
  suspendata: "bg-orange-200 text-orange-950",
  exclusa: "bg-red-100 text-red-900",
};

export default async function FarmRegimePage({ params, searchParams }: PageProps<"/admin/gospodarii/[slug]/regim">) {
  const { slug } = await params;
  const sp = await searchParams;
  const farm = await farmRepository.bySlug(slug, { includeInactive: true });
  if (!farm) notFound();
  const [gov, lots, land] = await Promise.all([governanceRepository.bySlug(slug), lotRepository.byFarm(slug, { all: true }), landRepository.bySlug(slug)]);
  const lim = effectiveLimits(gov, land);
  const standing = gov?.standing ?? "activa";
  const year = new Date().getFullYear();
  const years = [year, year + 1];

  return (
    <Container className="max-w-4xl py-8">
      <h1 className="mt-2">Regimul gospodăriei · {farm.name}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Limitele de creștere și starea în platformă. Totul se păstrează în istoric, cu motivul și cine a decis.
      </p>
      {typeof sp.eroare === "string" && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{sp.eroare}</p>}
      {sp.salvat && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Salvat.</p>}

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">Stare</p>
          <p className="mt-1"><span className={`rounded px-2 py-0.5 text-sm font-semibold ${tone[standing]}`}>{standingLabels[standing]}</span></p>
          <p className="mt-2 text-xs text-slate-500">{standingEffects[standing]}</p>
        </div>
        {years.map((y) => (
          <div key={y} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs text-slate-500">Păsări în loturile din {y}</p>
            <p className="mt-1 text-2xl font-semibold">
              {birdsInYear(lots, y).toLocaleString("ro-RO")} <span className="text-base font-normal text-slate-500">/ {lim.birdsPerYear.toLocaleString("ro-RO")}</span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
              <div className="h-full bg-slate-700" style={{ width: `${Math.min(100, (birdsInYear(lots, y) / Math.max(1, lim.birdsPerYear)) * 100)}%` }} />
            </div>
          </div>
        ))}
      </section>

      <section id="teren" className="mt-8 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg">Suprafața pentru creștere</h2>
        <p className="mt-1 text-sm text-slate-600">
          Un țarc mobil (4 × 3 m, {GROWTH.birdsPerPen} de pui, mutat zilnic, refacere în 14 zile) are nevoie de ~{GROWTH.pastureM2PerPen} m² de
          pășune. Fără suprafață confirmată, gospodăria nu poate crea loturi.
        </p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div><dt className="text-slate-500">Declarată de gospodar</dt><dd className="font-semibold">{land?.declaredM2 ? `${land.declaredM2.toLocaleString("ro-RO")} m²` : "—"}</dd></div>
          <div><dt className="text-slate-500">Actul de proprietate</dt><dd>{land?.proofDocumentId ? <a href={`/fisiere/${land.proofDocumentId}?vezi=1`} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Deschide ↗</a> : "—"}</dd></div>
          <div><dt className="text-slate-500">Confirmată (măsurată)</dt><dd className="font-semibold">{land?.verifiedM2 ? `${land.verifiedM2.toLocaleString("ro-RO")} m² ⇒ ${pensForArea(land.verifiedM2)} țarcuri × ${GROWTH.birdsPerPen} = ${pensForArea(land.verifiedM2) * GROWTH.birdsPerPen} pui / lot` : "neconfirmată"}</dd></div>
        </dl>
        <form action={verifyLandAction} className="mt-4 grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="slug" value={slug} />
          <label className="text-sm font-semibold">Suprafața măsurată (m²)<input name="verifiedM2" type="number" min={0} defaultValue={land?.verifiedM2 ?? land?.declaredM2} className={input} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Observații (măsurătoare, data vizitei)<input name="note" defaultValue={land?.note} className={input} /></label>
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-3">
            <input type="checkbox" name="allowConcurrentLots" defaultChecked={gov?.allowConcurrentLots} className="h-4 w-4" /> Permite loturi simultane (doar dacă legea permite)
          </label>
          <div className="sm:col-span-3"><button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Confirmă suprafața</button></div>
        </form>
      </section>

      <section className="mt-6 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg">Limite de creștere</h2>
        <p className="mt-1 text-sm text-slate-600">
          Implicit: {DEFAULT_LIMITS.birdsPerYear.toLocaleString("ro-RO")} păsări / an (Ordinul ANSVSA 6/2024, vânzare directă); pe lot,
          capacitatea dată de suprafață (acum {lim.birdsPerLot}), plafonată la {DEFAULT_LIMITS.birdsPerLot} (vezi <Link href="/admin/legislatie" className="underline">Legislație și surse</Link>). Pune o limită mai mică pentru situații punctuale (suprafață insuficientă,
          adăpost mic, recomandarea DSV etc.). Lasă gol pentru limita implicită.
        </p>
        <form action={saveLimitsAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="slug" value={slug} />
          <label className="text-sm font-semibold">Păsări pe an<input name="birdsPerYear" type="number" min={0} max={DEFAULT_LIMITS.birdsPerYear} defaultValue={gov?.birdsPerYear} placeholder={String(DEFAULT_LIMITS.birdsPerYear)} className={input} /></label>
          <label className="text-sm font-semibold">Păsări pe lot<input name="birdsPerLot" type="number" min={0} max={5000} defaultValue={gov?.birdsPerLot} placeholder={String(DEFAULT_LIMITS.birdsPerLot)} className={input} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Motivul limitei<input name="limitReason" defaultValue={gov?.limitReason} placeholder="Ex. suprafață de pășune insuficientă pentru mai mult de 150 de păsări" className={input} /></label>
          <div className="sm:col-span-2"><button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Salvează limitele</button></div>
        </form>
      </section>

      <section className="mt-6 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg">Starea în platformă</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {(Object.keys(standingLabels) as FarmStanding[]).map((k) => (
            <li key={k}><strong>{standingLabels[k]}:</strong> {standingEffects[k]}</li>
          ))}
        </ul>
        <form action={setStandingAction} className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr]">
          <input type="hidden" name="slug" value={slug} />
          <label className="text-sm font-semibold">Stare nouă
            <select name="standing" defaultValue={standing === "activa" ? "avertizata" : "activa"} className={input}>
              {(Object.keys(standingLabels) as FarmStanding[]).map((k) => (
                <option key={k} value={k}>{k === "activa" ? "Activă (reactivează)" : standingLabels[k]}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">Motiv (îl vede gospodarul)<input name="reason" required minLength={5} placeholder="Ex. nerespectarea densității în adăpost, constatată la vizita din 12.12" className={input} /></label>
          <div className="sm:col-span-2"><button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">Aplică</button></div>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="text-lg">Istoric</h2>
        <ul className="mt-2 divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
          {!gov?.events.length && <li className="px-4 py-3 text-sm text-slate-500">Nicio decizie încă.</li>}
          {[...(gov?.events ?? [])].reverse().map((e, i) => (
            <li key={i} className="px-4 py-3 text-sm">
              <span className="text-slate-500">{formatDate(e.at)} · {e.by}</span>
              <div className="font-semibold">{e.action}</div>
              <div className="text-slate-600">{e.reason}</div>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
