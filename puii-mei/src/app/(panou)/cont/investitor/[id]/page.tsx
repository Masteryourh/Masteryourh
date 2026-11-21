import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { LotStatusBadge } from "@/components/lots/LotStatusBadge";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { InvestmentTimeline } from "@/components/documents/InvestmentTimeline";
import { expenseCategoryLabels, investmentStatusLabels } from "@/lib/documents";
import { formatDate, formatLei } from "@/lib/format";
import { lotStatus } from "@/lib/lots";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { documentRepository, expenseRepository, expenseTotals, investmentRepository } from "@/server/repositories/documents";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Investiție", robots: { index: false, follow: false } };

/** Detaliul investiției + transparența gospodăriei susținute (loturi, cheltuieli, documente). */
export default async function InvestorInvestmentPage({ params }: PageProps<"/cont/investitor/[id]">) {
  const { id } = await params;
  const user = await requireUser(["investitor"], `/cont/investitor/${id}`);
  const inv = await investmentRepository.get(id);
  if (!inv || (user.role !== "admin" && inv.investorId !== user.id)) notFound();
  const [docs, farm, lots, expenses, farmDocs] = await Promise.all([
    documentRepository.byInvestment(inv.id),
    inv.farmSlug ? farmRepository.bySlug(inv.farmSlug, { includeInactive: true }) : null,
    inv.farmSlug ? lotRepository.byFarm(inv.farmSlug) : [],
    inv.farmSlug ? expenseRepository.byFarm(inv.farmSlug) : [],
    inv.farmSlug ? documentRepository.byFarm(inv.farmSlug) : [],
  ]);
  const totals = expenseTotals(expenses);

  return (
    <Container className="max-w-5xl py-8">
      <Link href="/cont/investitor" className="text-sm text-slate-500">← Investițiile mele</Link>
      <h1 className="mt-2">{inv.title}</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Suma" value={formatLei(inv.amount)} />
        <Stat label="Data" value={formatDate(inv.date)} />
        <Stat label="Status" value={investmentStatusLabels[inv.status]} />
        <Stat label="Condiții" value={inv.terms || "—"} />
      </div>
      {inv.description && <p className="mt-4 max-w-3xl text-slate-700">{inv.description}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <section>
          <h2 className="text-lg">Cronologie</h2>
          <div className="mt-3 rounded-xl bg-white p-5 ring-1 ring-slate-200"><InvestmentTimeline investment={inv} /></div>
        </section>
        <section>
          <h2 className="text-lg">Contracte și acte</h2>
          <div className="mt-3"><DocumentTable docs={docs} /></div>
        </section>
      </div>

      {farm && (
        <section className="mt-10">
          <h2 className="text-xl">Gospodăria susținută: {farm.name}</h2>
          <p className="text-sm text-slate-600">{farm.owner} · {farm.village}, jud. {farm.county}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Loturi" value={String(lots.length)} />
            <Stat label="Cheltuieli / venituri" value={`${formatLei(totals.total)} / ${formatLei(totals.income)}`} />
            <Stat label="Documente verificate" value={`${farmDocs.filter((d) => !d.investmentId && d.verifiedAt).length} / ${farmDocs.filter((d) => !d.investmentId).length}`} />
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>{["Lot", "Start", "Stadiu", "Rezervați / total", "Cheltuieli", "Venituri", "Cost / pasăre"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lots.map((l) => {
                  const sum = totals.byLot.get(l.code) ?? 0;
                  return (
                    <tr key={l.code}>
                      <td className="px-3 py-2 font-mono text-xs">{l.code}</td>
                      <td className="px-3 py-2">{formatDate(l.startDate)}</td>
                      <td className="px-3 py-2"><LotStatusBadge status={lotStatus(l)} /></td>
                      <td className="px-3 py-2">{l.reservedBirds} / {l.totalBirds}</td>
                      <td className="px-3 py-2">{formatLei(sum)}</td>
                      <td className="px-3 py-2">{formatLei(totals.incomeByLot.get(l.code) ?? 0)}</td>
                      <td className="px-3 py-2">{sum ? formatLei(sum / l.totalBirds) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totals.byCategory.size > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2 text-xs">
              {[...totals.byCategory].map(([k, v]) => (
                <li key={k} className="rounded bg-slate-100 px-2 py-1">{expenseCategoryLabels[k as keyof typeof expenseCategoryLabels]}: <strong>{formatLei(v)}</strong></li>
              ))}
            </ul>
          )}
          <h3 className="mt-6 font-sans text-base font-semibold">Documentele gospodăriei</h3>
          <div className="mt-2"><DocumentTable docs={farmDocs.filter((d) => !d.investmentId)} /></div>
        </section>
      )}
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
