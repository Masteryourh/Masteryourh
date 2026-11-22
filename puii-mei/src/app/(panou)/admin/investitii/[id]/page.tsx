import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { InvestmentTimeline } from "@/components/documents/InvestmentTimeline";
import { documentCategoryLabels, FILE_LIMITS, investmentStatusLabels } from "@/lib/documents";
import { formatDate, formatLei } from "@/lib/format";
import { farmRepository } from "@/server/repositories/catalog";
import { documentRepository, investmentRepository } from "@/server/repositories/documents";
import { userRepository } from "@/server/repositories/users";
import { addInvestmentEventAction, addRepaymentAction, setRepaymentRateAction, updateInvestmentAction, uploadInvestmentDocumentAction } from "../actions";
import { RepaymentBox } from "@/components/documents/RepaymentBox";
import { lotRepository } from "@/server/repositories/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Investiție", robots: { index: false, follow: false } };

const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal";

export default async function AdminInvestmentPage({ params, searchParams }: PageProps<"/admin/investitii/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const inv = await investmentRepository.get(id);
  if (!inv) notFound();
  const [investor, farms, docs] = await Promise.all([userRepository.byId(inv.investorId), farmRepository.listAll(), documentRepository.byInvestment(inv.id)]);
  const today = new Date().toISOString().slice(0, 10);
  const farmLots = inv.farmSlug ? await lotRepository.byFarm(inv.farmSlug, { all: true }) : [];

  return (
    <Container className="py-8">
      <h1 className="mt-2">{inv.title}</h1>
      <p className="text-sm text-slate-600">
        {investor?.name} · {formatLei(inv.amount)} · {formatDate(inv.date)} · <strong>{investmentStatusLabels[inv.status]}</strong>
      </p>
      {typeof sp.eroare === "string" && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{sp.eroare}</p>}
      {sp.salvat && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Salvat. Investitorul vede modificarea în contul lui.</p>}

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <form action={updateInvestmentAction} className="grid gap-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <input type="hidden" name="id" value={inv.id} />
          <h2 className="text-lg">Detalii</h2>
          <label className="text-sm font-semibold">Obiectul<input name="title" defaultValue={inv.title} className={input} /></label>
          <label className="text-sm font-semibold">Status
            <select name="status" defaultValue={inv.status} className={input}>
              {Object.entries(investmentStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Gospodăria susținută
            <select name="farmSlug" defaultValue={inv.farmSlug ?? ""} className={input}>
              <option value="">—</option>
              {farms.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Condiții / randament<input name="terms" defaultValue={inv.terms} className={input} /></label>
          <label className="text-sm font-semibold">Descriere<textarea name="description" rows={3} defaultValue={inv.description} className={input} /></label>
          <p className="text-xs text-slate-500">Suma și data inițială nu se modifică; o corectură se face printr-o investiție nouă și anularea celei greșite.</p>
          <button className="justify-self-start rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white">Salvează</button>
        </form>

        <div id="cronologie" className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-lg">Cronologie</h2>
          <form action={addInvestmentEventAction} className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[150px_1fr]">
            <input type="hidden" name="id" value={inv.id} />
            <label className="text-xs font-semibold">Data<input name="date" type="date" required defaultValue={today} className={input} /></label>
            <label className="text-xs font-semibold">Eveniment<input name="title" required placeholder="Ex. Adăpost finalizat" className={input} /></label>
            <label className="text-xs font-semibold sm:col-span-2">Detalii<input name="text" className={input} /></label>
            <button className="justify-self-start rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white">Adaugă în cronologie</button>
          </form>
          <div className="mt-5"><InvestmentTimeline investment={inv} /></div>
        </div>
      </div>

      <h2 id="rambursare" className="mt-10 scroll-mt-6 text-lg">Rambursarea de către gospodar (la fiecare lot vândut)</h2>
      <div className="mt-3 max-w-4xl">
        <RepaymentBox investment={inv}>
          <form action={setRepaymentRateAction} className="mt-4 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
            <input type="hidden" name="id" value={inv.id} />
            <label className="text-xs font-semibold">Suma reținută pe pui livrat (lei; gol = de stabilit)
              <input name="perBird" type="number" step="0.5" min="0" max="500" defaultValue={inv.repayment?.perBird} className={`${input} max-w-40`} />
            </label>
            <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white">Salvează rata</button>
          </form>
          <form action={addRepaymentAction} className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
            <input type="hidden" name="id" value={inv.id} />
            <label className="text-xs font-semibold">Data<input name="date" type="date" required defaultValue={today} className={input} /></label>
            <label className="text-xs font-semibold">Lotul vândut
              <select name="lotCode" className={input} defaultValue="">
                <option value="">—</option>
                {farmLots.map((l) => <option key={l.code} value={l.code}>{l.code}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold">Pui livrați<input name="birds" type="number" min="1" className={input} /></label>
            <label className="text-xs font-semibold">Suma (lei){inv.repayment?.perBird ? " – gol = pui × rată" : ""}<input name="amount" type="number" step="0.01" min="0" className={input} /></label>
            <label className="text-xs font-semibold sm:col-span-2">Observații<input name="note" placeholder="Ex. ordin de plată nr. 15" className={input} /></label>
            <button className="justify-self-start rounded-lg bg-forest-700 px-3 py-2 text-sm font-semibold text-white">Înregistrează rata</button>
          </form>
        </RepaymentBox>
      </div>

      <h2 id="documente" className="mt-10 scroll-mt-6 text-lg">Contracte și acte</h2>
      <form action={uploadInvestmentDocumentAction} className="mt-3 grid max-w-4xl gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-3">
        <input type="hidden" name="id" value={inv.id} />
        <label className="text-sm font-semibold">Tipul
          <select name="category" defaultValue="contract" className={input}>
            {Object.entries(documentCategoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold sm:col-span-2">Titlu<input name="title" required placeholder="Ex. Contract de investiție nr. 12" className={input} /></label>
        <label className="text-sm font-semibold">Număr<input name="number" className={input} /></label>
        <label className="text-sm font-semibold">Data<input name="date" type="date" required defaultValue={today} className={input} /></label>
        <label className="text-sm font-semibold">Fișierul<input name="file" type="file" required accept={FILE_LIMITS.accept} className={input} /></label>
        <div className="sm:col-span-2 lg:col-span-3"><button className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white">Încarcă</button></div>
      </form>
      <div className="mt-3"><DocumentTable docs={docs} canVerify returnTo={`/admin/investitii/${inv.id}#documente`} /></div>
    </Container>
  );
}
