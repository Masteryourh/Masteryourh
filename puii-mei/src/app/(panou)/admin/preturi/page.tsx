import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { clientPricePerKg, estimatePrice, feedAdvance, paymentSplit, pricing } from "@/lib/pricing";
import { formatDate, formatLei, formatNumber } from "@/lib/format";
import { priceSettingsRepository } from "@/server/repositories/settings";
import { savePriceAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prețuri", robots: { index: false, follow: false } };

const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";

export default async function PricesPage({ searchParams }: PageProps<"/admin/preturi">) {
  const sp = await searchParams;
  const s = await priceSettingsRepository.get();
  const ex = estimatePrice(10, null, s.pricePerKg);
  const adv = feedAdvance(10);
  const split = paymentSplit(ex.total, adv.amount);

  return (
    <Container className="max-w-3xl py-8">
      <h1>Prețuri</h1>
      <p className="mt-1 text-sm text-slate-600">
        Prețul la client = prețul pieței × (1 + adaos). Se aplică imediat precomenzilor noi; comenzile deja plasate își păstrează
        prețul de atunci.
      </p>
      {sp.salvat && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-900">Prețul a fost salvat.</p>}
      {typeof sp.eroare === "string" && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">{sp.eroare}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200"><p className="text-xs text-slate-500">Prețul pieței</p><p className="text-2xl font-semibold">{formatLei(s.marketPricePerKg)}<span className="text-sm font-normal text-slate-500"> / kg</span></p></div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200"><p className="text-xs text-slate-500">Adaos</p><p className="text-2xl font-semibold">{formatNumber(s.markupPct)}%</p></div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200"><p className="text-xs text-slate-500">Preț la client</p><p className="text-2xl font-semibold">{formatLei(s.pricePerKg)}<span className="text-sm font-normal text-slate-500"> / kg</span></p></div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {s.updatedAt ? `Ultima modificare: ${formatDate(s.updatedAt)} · ${s.updatedBy}` : "Valori implicite (din cod), nemodificate încă."}
      </p>

      <form action={savePriceAction} className="mt-6 grid gap-4 rounded-xl bg-white p-5 ring-1 ring-slate-200 sm:grid-cols-2">
        <label className="text-sm font-semibold">Prețul pieței (lei / kg pui curățat)
          <input name="marketPricePerKg" type="number" step="0.01" min="5" max="300" defaultValue={s.marketPricePerKg} required className={input} />
        </label>
        <label className="text-sm font-semibold">Adaos (%)
          <input name="markupPct" type="number" step="0.1" min="0" max="100" defaultValue={s.markupPct} required className={input} />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">Sursa / motivul (opțional)
          <input name="note" maxLength={300} placeholder="Ex. prețuri în piețele din Suceava, noiembrie 2026" className={input} />
        </label>
        <div className="sm:col-span-2">
          <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Salvează prețul</button>
        </div>
      </form>

      <div className="mt-6 rounded-xl bg-slate-50 p-5 text-sm ring-1 ring-slate-200">
        <p className="font-semibold">Exemplu: 10 pui (prețul curent)</p>
        <ul className="mt-2 space-y-1 text-slate-700">
          <li>~{formatNumber(ex.estimatedKg)} kg pui curățat × {formatLei(s.pricePerKg)} = <strong>{formatLei(ex.productValue)}</strong></li>
          <li>Avans (pui de o zi + furaj, prețuri orientative): {formatLei(adv.amount)}</li>
          <li>Rest la livrare: {formatLei(split.atDelivery)} (fără taxa de livrare)</li>
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Greutatea estimată: {formatNumber(pricing.avgWeightKg)} kg / pui curățat. Exemple de adaos: 20% → {formatLei(clientPricePerKg(s.marketPricePerKg, 20))} / kg,
          30% → {formatLei(clientPricePerKg(s.marketPricePerKg, 30))} / kg.
        </p>
      </div>

      <h2 className="mt-8 text-lg">Istoric</h2>
      {!s.history.length ? (
        <p className="mt-2 text-sm text-slate-500">Nicio modificare încă.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 rounded-xl bg-white text-sm ring-1 ring-slate-200">
          {s.history.map((h) => (
            <li key={h.at} className="p-3">
              <span className="font-semibold">{formatLei(h.marketPricePerKg)} / kg + {formatNumber(h.markupPct)}% = {formatLei(clientPricePerKg(h.marketPricePerKg, h.markupPct))} / kg</span>
              <span className="block text-xs text-slate-500">{formatDate(h.at)} · {h.by}{h.note ? ` · ${h.note}` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
