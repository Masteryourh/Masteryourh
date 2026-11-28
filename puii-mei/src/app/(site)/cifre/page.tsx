import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageMetadata } from "@/lib/seo";
import { formatDate, formatLei, formatNumber } from "@/lib/format";
import { pricing } from "@/lib/pricing";
import { farmRepository } from "@/server/repositories/catalog";
import { publicMetrics } from "@/server/metrics-read-model";

// Pagina: cel mult 5 minute în cache; cifrele: instantaneu de cel mult 5 minute (read-model) ⇒ cel mult 10 minute.
export const revalidate = 300;
export const metadata: Metadata = pageMetadata({
  title: "Cifrele noastre",
  description: "Câți bani au intrat în gospodării, venituri, cheltuieli, profit, taxe, pui crescuți și furaj – actualizat automat.",
  path: "/cifre",
});

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-forest-900/10">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-forest-900 tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

export default async function MetricsPage() {
  const [farms, { metrics: m, computedAt }] = await Promise.all([farmRepository.list(), publicMetrics()]);
  const farmName = new Map(farms.map((f) => [f.slug, f.name]));
  const maxCat = Math.max(1, ...m.expensesByCategory.map((c) => c.value));
  const maxYear = Math.max(1, ...m.byYear.flatMap((y) => [y.revenue, y.expenses]));

  return (
    <>
      <PageHeader
        eyebrow="Transparență totală"
        title="Cifrele noastre"
        intro="Tot ce trece prin platformă, la vedere: banii care ajung în gospodării, veniturile și cheltuielile lor, taxele plătite, puii crescuți și furajul folosit. Calculat automat din registrele confirmate."
      />
      <Container className="space-y-12 py-12">
        <section>
          <h2 className="text-2xl font-semibold">Banii</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Bani intrați în gospodării" value={formatLei(m.moneyIntoFarms)} note="Venituri din vânzări și avansuri + investiții direcționate" />
            <Stat label="Veniturile gospodăriilor" value={formatLei(m.revenue)} note="Din registrul fiscal, înregistrări confirmate" />
            <Stat label="Cheltuielile gospodăriilor" value={formatLei(m.expenses)} note="Pui, furaj, veterinar, energie etc." />
            <Stat label="Profitul gospodăriilor" value={formatLei(m.profit)} note="Venituri − cheltuieli" />
            <Stat label="Taxe și impozite plătite" value={formatLei(m.taxes)} note="Categoria „Taxe și impozite” din registru" />
            <Stat label="Investiții în gospodării" value={formatLei(m.investments)} note="Echipamente de creștere și sacrificare" />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Puii și furajul</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Gospodării partenere" value={formatNumber(m.farms)} />
            <Stat label="Pui comandați" value={formatNumber(m.birdsOrdered)} note="Precomenzi active și livrate" />
            <Stat label="Pui crescuți (porniți în țarcuri)" value={formatNumber(m.birdsStarted)} note={`Acum în creștere: ${formatNumber(m.birdsGrowing)}`} />
            <Stat label="Pui livrați" value={formatNumber(m.birdsDelivered)} note={`≈ ${formatNumber(m.kgDelivered)} kg pui curățat, gata de gătit`} />
            <Stat label="Furaj (cereale)" value={`${formatNumber(m.feedKg)} kg`} note={`≈ ${formatNumber(pricing.feedKgPerBird)} kg / pui crescut`} />
            <Stat label="Cheltuit pe furaj" value={formatLei(m.feedLei)} note="Din registrul fiscal" />
            <Stat label="Avansuri confirmate" value={formatLei(m.advancesConfirmed)} note="Plătite de clienți direct gospodăriilor" />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 ring-1 ring-forest-900/10">
            <h2 className="text-xl font-semibold">Pe ce se duc banii</h2>
            {!m.expensesByCategory.length && <p className="mt-3 text-sm text-muted">Încă nicio cheltuială confirmată.</p>}
            <ul className="mt-4 space-y-3">
              {m.expensesByCategory.map((c) => (
                <li key={c.label}>
                  <div className="flex justify-between text-sm"><span>{c.label}</span><span className="tabular-nums">{formatLei(c.value)}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-forest-50"><div className="h-full rounded-full bg-forest-500" style={{ width: `${(c.value / maxCat) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-6 ring-1 ring-forest-900/10">
            <h2 className="text-xl font-semibold">Pe ani</h2>
            {!m.byYear.length && <p className="mt-3 text-sm text-muted">Încă nimic înregistrat.</p>}
            <ul className="mt-4 space-y-4">
              {m.byYear.map((y) => (
                <li key={y.year} className="text-sm">
                  <p className="font-semibold">{y.year}</p>
                  <div className="mt-1 flex items-center gap-2"><span className="w-20 text-muted">Venituri</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-forest-50"><div className="h-full rounded-full bg-forest-500" style={{ width: `${(y.revenue / maxYear) * 100}%` }} /></div><span className="w-28 text-right tabular-nums">{formatLei(y.revenue)}</span></div>
                  <div className="mt-1 flex items-center gap-2"><span className="w-20 text-muted">Cheltuieli</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-forest-50"><div className="h-full rounded-full bg-grain-500" style={{ width: `${(y.expenses / maxYear) * 100}%` }} /></div><span className="w-28 text-right tabular-nums">{formatLei(y.expenses)}</span></div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Pe gospodării</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-forest-900/10">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-muted uppercase">
                <tr>{["Gospodăria", "Pui crescuți", "Venituri", "Cheltuieli", "Profit"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-forest-900/5">
                {m.byFarm.map((f) => (
                  <tr key={f.slug}>
                    <td className="px-4 py-3"><Link href={`/gospodarii/${f.slug}`} className="font-semibold underline-offset-2 hover:underline">{farmName.get(f.slug)}</Link></td>
                    <td className="px-4 py-3 tabular-nums">{formatNumber(f.birds)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatLei(f.revenue)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatLei(f.expenses)}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{formatLei(f.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-sm text-muted">
          Cifrele se actualizează automat (cel mult la 10 minute) și includ doar înregistrările confirmate cu documentul fiscal atașat;
          ciornele și înregistrările anulate nu intră. Greutatea și furajul sunt estimate după modelul de creștere ({formatNumber(pricing.avgWeightKg)} kg / pui
          curățat, ≈ {formatNumber(pricing.feedKgPerBird)} kg furaj / pui). În perioada pilot, o parte din date sunt demonstrative. Calculat: {formatDate(computedAt)}.
        </p>
      </Container>
    </>
  );
}
