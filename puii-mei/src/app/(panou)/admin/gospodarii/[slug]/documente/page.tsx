import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { expenseCategoryLabels, isIncomeCategory } from "@/lib/documents";
import { formatDate, formatLei } from "@/lib/format";
import { farmRepository } from "@/server/repositories/catalog";
import { documentRepository, expenseRepository, expenseTotals } from "@/server/repositories/documents";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documentele gospodăriei (admin)", robots: { index: false, follow: false } };

/**
 * Documentele și registrul de cheltuieli ale unei gospodării, în spațiul Admin (NAV-001 / CORE): adminul le vede și
 * verifică documentele; înregistrările le face gospodarul din contul lui (fără impersonare).
 */
export default async function AdminFarmDocumentsPage({ params }: PageProps<"/admin/gospodarii/[slug]/documente">) {
  const { slug } = await params;
  await requireUser(["admin"], `/admin/gospodarii/${slug}/documente`);
  const farm = await farmRepository.bySlug(slug, { includeInactive: true });
  if (!farm) notFound();
  const [docs, expenses] = await Promise.all([documentRepository.byFarm(slug), expenseRepository.byFarm(slug)]);
  const visibleDocs = docs.filter((d) => !d.investmentId);
  const totals = expenseTotals(expenses);
  const here = `/admin/gospodarii/${slug}/documente`;

  return (
    <Container className="py-8">
      <h1>Documente și cheltuieli · {farm.name}</h1>
      <p className="mt-2 inline-block rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
        Vedere de administrator: verifici documentele; înregistrările le face gospodarul din contul lui.
      </p>
      <p className="mt-4 text-sm">
        Cheltuieli confirmate: <strong>{formatLei(totals.total)}</strong> · venituri: <strong>{formatLei(totals.income)}</strong>
        {totals.drafts ? ` · ciorne: ${totals.drafts}` : ""}
      </p>

      <h2 id="documente" className="mt-8 scroll-mt-6 text-xl">Documente ({visibleDocs.length})</h2>
      <div className="mt-2">
        <DocumentTable docs={visibleDocs} farmNames={new Map([[farm.slug, farm.name]])} canVerify returnTo={here} />
      </div>

      <h2 id="registru" className="mt-8 scroll-mt-6 text-xl">Registrul de cheltuieli și venituri ({expenses.length})</h2>
      <div className="mt-2 overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>{["Data", "Tip", "Lot", "Furnizor / client", "Suma", "Stare"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!expenses.length && <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-500">Nicio înregistrare.</td></tr>}
            {expenses.map((e) => (
              <tr key={e.id} className={e.voided ? "text-slate-400" : undefined}>
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(e.date)}</td>
                <td className="px-3 py-2">{isIncomeCategory(e.category) ? "Venit" : "Cheltuială"} · {expenseCategoryLabels[e.category]}</td>
                <td className="px-3 py-2 font-mono text-xs">{e.lotCode ?? "general"}</td>
                <td className="px-3 py-2">{e.supplier}</td>
                <td className="px-3 py-2 font-semibold">{formatLei(e.amount)}</td>
                <td className="px-3 py-2">{e.voided ? `Anulată: ${e.voided.reason}` : e.confirmedAt ? "Confirmată" : "Ciornă"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Container>
  );
}
