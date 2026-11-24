import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { investmentStatusLabels } from "@/lib/documents";
import { formatDate, formatLei } from "@/lib/format";
import { site } from "@/lib/site";
import { farmRepository } from "@/server/repositories/catalog";
import { documentRepository, investmentRepository } from "@/server/repositories/documents";
import { requireUser } from "@/server/session";
import { AerialMap, Bars, FARM_SPOTS, Gauge, Glass, GlassTitle, Metric, Pill } from "@/components/panel/Dash";
import { growthProgress, lotDay, lotStatus, statusLabels } from "@/lib/lots";
import { lotRepository } from "@/server/repositories/catalog";
import { expenseRepository, expenseTotals } from "@/server/repositories/documents";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contul investitorului", robots: { index: false, follow: false } };

export default async function InvestorDashboard() {
  const user = await requireUser(["investitor"], "/cont/investitor");
  const [investments, farms] = await Promise.all([
    user.role === "admin" ? investmentRepository.list() : investmentRepository.byInvestor(user.id),
    farmRepository.listAll(),
  ]);
  const docs = await documentRepository.byInvestment(investments.map((i) => i.id));
  const farmName = new Map(farms.map((f) => [f.slug, f.name]));
  const counted = investments.filter((i) => i.status === "semnata" || i.status === "activa" || i.status === "finalizata");
  const myDocs = docs.filter((d) => d.investmentId && investments.some((i) => i.id === d.investmentId));
  const lastEvents = investments
    .flatMap((i) => i.events.map((e) => ({ ...e, investment: i })))
    .sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at))
    .slice(0, 6);

  // Gospodăria principală susținută: loturi, progres, cheltuieli.
  const mainFarmSlug = investments.find((i) => i.farmSlug && i.status !== "anulata")?.farmSlug;
  const [farmLots, farmExpenses] = await Promise.all([
    mainFarmSlug ? lotRepository.byFarm(mainFarmSlug) : Promise.resolve([]),
    mainFarmSlug ? expenseRepository.byFarm(mainFarmSlug) : Promise.resolve([]),
  ]);
  const growing = farmLots.find((l) => lotStatus(l) === "in-crestere") ?? farmLots.find((l) => lotStatus(l) === "precomenzi-deschise") ?? farmLots[0];
  const exp = expenseTotals(farmExpenses);
  const costPerBird = growing && exp.byLot.get(growing.code) ? (exp.byLot.get(growing.code) ?? 0) / growing.totalBirds : 0;
  const supported = [...new Set(investments.filter((i) => i.farmSlug && i.status !== "anulata").map((i) => i.farmSlug!))];

  return (
    <Container className="py-8">
      <p className="text-xs tracking-[0.25em] text-[var(--pd-muted)] uppercase">Puii mei · investitor</p>
      <h1 className="mt-1 text-3xl font-light tracking-tight sm:text-4xl">Bun venit, {user.name.split(" ")[0]}!</h1>
      <p className="mt-1 text-sm text-slate-600">Investițiile tale în rețeaua Puii mei, cu actele și evoluția fiecăreia.</p>

      <section className="mt-6 space-y-4">
        <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <AerialMap
            src="/images/panou/gospodarie-aerian.webp"
            className="min-h-[280px] sm:min-h-[360px] xl:min-h-[440px]"
            pins={
              supported.length
                ? [
                    ...supported.slice(0, 2).map((slug, i) => ({ ...FARM_SPOTS[i === 0 ? 2 : 1], label: farmName.get(slug) ?? slug, note: "susținută", active: i === 0 })),
                    ...(growing ? [{ ...FARM_SPOTS[0], label: growing.code, note: statusLabels[lotStatus(growing)] }] : []),
                  ]
                : [{ ...FARM_SPOTS[2], label: "Gospodăriile Puii mei", note: "Bucovina" }]
            }
          />
          <div className="grid content-start gap-4">
            <Metric delay={100} label="Total investit (contracte semnate)" value={formatLei(counted.reduce((s, i) => s + i.amount, 0)).replace(",00", "")} pill={<Pill tone="green">{investments.filter((i) => i.status === "activa").length} active</Pill>} />
            <Glass delay={160}>
              <GlassTitle title="Lotul urmărit" hint={growing ? `${growing.code} · ${farmName.get(growing.farmSlug) ?? ""}` : "—"} right={growing ? <Pill>{statusLabels[lotStatus(growing)]}</Pill> : undefined} />
              <div className="mt-3">
                <Gauge percent={growing ? growthProgress(growing) : 0} label={`${growing ? growthProgress(growing) : 0}%`} sub={growing ? `ziua ${Math.max(0, Math.min(growing.growthDays, lotDay(growing)))} din ${growing.growthDays}` : "creștere"} />
              </div>
            </Glass>
            <div className="grid grid-cols-2 gap-4">
              <Metric delay={220} label="Cost / pasăre" value={costPerBird ? costPerBird.toFixed(2).replace(".", ",") : "—"} unit={costPerBird ? "lei" : undefined} />
              <Metric delay={260} label="Contracte și acte" value={String(myDocs.length)} />
            </div>
          </div>
        </div>
        {farmLots.length > 0 && (
          <Glass delay={320}>
            <GlassTitle title="Rezervări pe loturi" hint={`${farmName.get(mainFarmSlug!) ?? ""} · păsări rezervate`} />
            <div className="mt-4">
              <Bars data={[...farmLots].reverse().slice(-10).map((l) => ({ label: l.code.slice(3), value: l.reservedBirds, highlight: l.code === growing?.code, title: `${l.code}: ${l.reservedBirds} / ${l.totalBirds}` }))} />
            </div>
          </Glass>
        )}
      </section>

      <h2 className="mt-10 text-xl">Investițiile mele</h2>
      {!investments.length && (
        <p className="mt-3 rounded-xl bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">
          Nu ai încă investiții înregistrate. După semnarea contractului, investiția apare aici cu toate actele. Întrebări:{" "}
          <a href={`mailto:${site.company.email}`} className="font-semibold text-forest-700 underline">{site.company.email}</a>.
        </p>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {investments.map((i) => (
          <Link key={i.id} href={`/cont/investitor/${i.id}`} className="rounded-xl bg-white p-5 ring-1 ring-slate-200 hover:ring-slate-400">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">{i.title}</p>
              <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold">{investmentStatusLabels[i.status]}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{formatLei(i.amount)}</p>
            <p className="mt-1 text-sm text-slate-600">
              {formatDate(i.date)}
              {i.farmSlug ? ` · ${farmName.get(i.farmSlug) ?? ""}` : ""}
              {i.terms ? ` · ${i.terms}` : ""}
            </p>
          </Link>
        ))}
      </div>

      {lastEvents.length > 0 && (
        <>
          <h2 className="mt-10 text-xl">Noutăți</h2>
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
            {lastEvents.map((e, k) => (
              <li key={k} className="px-4 py-3 text-sm">
                <span className="text-slate-500">{formatDate(e.date)} · </span>
                <span className="font-semibold">{e.title}</span>
                {e.text && <span className="text-slate-600"> – {e.text}</span>}
                <span className="text-slate-400"> ({e.investment.title})</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-10 rounded-xl bg-white p-5 text-sm ring-1 ring-slate-200">
        <p className="font-semibold">Datele contului</p>
        <p className="mt-1 text-slate-600">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
      </div>
    </Container>
  );
}

