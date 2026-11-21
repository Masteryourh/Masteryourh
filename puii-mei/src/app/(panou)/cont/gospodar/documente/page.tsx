import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { documentCategoryLabels, expenseCategoryLabels, FILE_LIMITS, INCOME_CATEGORIES } from "@/lib/documents";
import { formatDate, formatLei } from "@/lib/format";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { documentRepository, expenseRepository, expenseTotals } from "@/server/repositories/documents";
import { requireUser } from "@/server/session";
import { addExpenseAction, updateDraftExpenseAction, uploadDocumentAction, voidExpenseAction } from "../documente-actions";
import type { Expense, Lot } from "@/lib/domain";
import { Fragment } from "react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documente și cheltuieli", robots: { index: false, follow: false } };

const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal";

export default async function FarmDocumentsPage({ searchParams }: PageProps<"/cont/gospodar/documente">) {
  const user = await requireUser(["gospodar"], "/cont/gospodar/documente");
  const sp = await searchParams;
  const farms = await farmRepository.listAll();
  const slug = user.role === "admin" ? (typeof sp.gospodarie === "string" ? sp.gospodarie : farms[0]?.slug) : user.farmSlug;
  const farm = farms.find((f) => f.slug === slug);
  if (!farm) {
    return (
      <Container className="py-8">
        <p className="rounded-xl bg-white p-6 text-slate-600 ring-1 ring-slate-200">Contul nu e legat de o gospodărie.</p>
      </Container>
    );
  }
  const [lots, docs, expenses] = await Promise.all([lotRepository.byFarm(farm.slug, { all: true }), documentRepository.byFarm(farm.slug), expenseRepository.byFarm(farm.slug)]);
  const visibleDocs = docs.filter((d) => !d.investmentId);
  const totals = expenseTotals(expenses);
  const docById = new Map(docs.map((d) => [d.id, d]));
  const today = new Date().toISOString().slice(0, 10);
  const lotFilter = typeof sp.lot === "string" ? sp.lot : "";
  const shownExpenses = lotFilter ? expenses.filter((e) => (e.lotCode ?? "") === lotFilter) : expenses;
  const qs = user.role === "admin" ? `gospodarie=${farm.slug}&` : "";

  return (
    <Container className="py-8">
      {user.role === "admin" && (
        <form className="mb-6 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm">
          <label htmlFor="gospodarie" className="font-semibold">Previzualizare ca administrator:</label>
          <select id="gospodarie" name="gospodarie" defaultValue={farm.slug} className="rounded border border-slate-300 bg-white px-2 py-1">
            {farms.map((f) => (
              <option key={f.slug} value={f.slug}>{f.name}</option>
            ))}
          </select>
          <button className="rounded bg-slate-800 px-3 py-1 font-semibold text-white">Afișează</button>
        </form>
      )}
      <h1>Documente și cheltuieli · {farm.name}</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        Registrul fiscal al gospodăriei: cheltuieli și venituri pe lot, fiecare cu documentul fiscal atașat (factură, bon, chitanță). Nimic nu se șterge: fiecare fișier are o amprentă
        (SHA-256) și apare cu cine și când l-a încărcat; o cheltuială greșită se anulează cu motiv și rămâne vizibilă.
      </p>
      {typeof sp.eroare === "string" && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{sp.eroare}</p>}
      {sp.salvat && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Salvat.</p>}

      {/* Totaluri */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cheltuieli" value={formatLei(totals.total)} />
        <Stat label="Venituri" value={formatLei(totals.income)} />
        <Stat label="Rezultat (venituri − cheltuieli)" value={formatLei(totals.result)} />
        {totals.drafts > 0 && <Stat label="Ciorne de confirmat" value={String(totals.drafts)} />}
        <Stat label="Verificate de Puii mei" value={`${visibleDocs.filter((d) => d.verifiedAt).length} / ${visibleDocs.length}`} />
      </div>
      {lots.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>{["Lot", "Păsări", "Cheltuieli", "Venituri", "Rezultat", "Cost / pasăre", ""].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lots.map((l) => {
                const sum = totals.byLot.get(l.code) ?? 0;
                return (
                  <tr key={l.code}>
                    <td className="px-3 py-2 font-mono text-xs">{l.code}</td>
                    <td className="px-3 py-2">{l.totalBirds}</td>
                    <td className="px-3 py-2">{formatLei(sum)}</td>
                    <td className="px-3 py-2">{formatLei(totals.incomeByLot.get(l.code) ?? 0)}</td>
                    <td className="px-3 py-2 font-semibold">{formatLei((totals.incomeByLot.get(l.code) ?? 0) - sum)}</td>
                    <td className="px-3 py-2">{sum ? formatLei(sum / l.totalBirds) : "—"}</td>
                    <td className="px-3 py-2 text-right"><a href={`?${qs}lot=${l.code}#cheltuieli`} className="text-forest-700 underline">vezi</a></td>
                  </tr>
                );
              })}
              {((totals.byLot.get("") ?? 0) > 0 || (totals.incomeByLot.get("") ?? 0) > 0) && (
                <tr>
                  <td className="px-3 py-2 text-slate-500">Generale (fără lot)</td>
                  <td />
                  <td className="px-3 py-2">{formatLei(totals.byLot.get("") ?? 0)}</td>
                  <td className="px-3 py-2">{formatLei(totals.incomeByLot.get("") ?? 0)}</td>
                  <td />
                  <td />
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Cheltuieli */}
      <h2 id="cheltuieli" className="mt-10 scroll-mt-6 text-xl">Registrul fiscal: cheltuieli și venituri {lotFilter && <span className="font-mono text-base">· {lotFilter}</span>}</h2>
      {lotFilter && <a href={`?${qs}#cheltuieli`} className="text-sm text-forest-700 underline">toate loturile</a>}
      <details className="mt-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200" open={!expenses.length}>
        <summary className="cursor-pointer text-sm font-semibold">+ Adaugă o cheltuială sau un venit</summary>
        <p className="mt-2 text-xs text-slate-500">
          Poți salva ca ciornă și adăuga documentul fiscal ulterior. La confirmare sunt obligatorii numărul documentului
          și documentul atașat; după confirmare înregistrarea nu se mai modifică (o greșeală se anulează cu motiv și se
          adaugă una nouă). Doar înregistrările confirmate intră în totaluri.
        </p>
        <form action={addExpenseAction} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="farmSlug" value={farm.slug} />
          <EntryFields lots={lots} today={today} defaultLot={lotFilter} />
          <EntryButtons />
        </form>
      </details>
      <div className="mt-3 overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>{["Data", "Tip", "Lot", "Furnizor / client", "Suma", "Document", "Stare", ""].map((h, i) => <th key={i} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!shownExpenses.length && <tr><td colSpan={8} className="px-3 py-4 text-center text-slate-500">Nicio înregistrare încă.</td></tr>}
            {shownExpenses.map((e) => {
              const doc = e.documentId ? docById.get(e.documentId) : undefined;
              const draft = !e.voided && !e.confirmedAt;
              return (
                <Fragment key={e.id}>
                <tr className={e.voided ? "align-top text-slate-400" : "align-top"}>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(e.date)}</td>
                  <td className="px-3 py-2">
                    <span className={e.kind === "venit" ? "font-semibold text-green-700" : ""}>{e.kind === "venit" ? "Venit" : "Cheltuială"}</span>
                    <div className="text-xs text-slate-500">{expenseCategoryLabels[e.category]}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{e.lotCode ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className={e.voided ? "line-through" : "font-medium"}>{e.supplier}</div>
                    {e.description && <div className="text-xs text-slate-500">{e.description}</div>}
                    <div className="text-[11px] text-slate-400">adăugat de {e.createdBy}, {formatDate(e.createdAt)}</div>
                    {e.voided && <div className="text-xs text-red-700">Anulată de {e.voided.by}: {e.voided.reason}</div>}
                  </td>
                  <td className={e.voided ? "px-3 py-2 whitespace-nowrap line-through" : "px-3 py-2 font-semibold whitespace-nowrap"}>{e.kind === "venit" ? "+" : "−"}{formatLei(e.amount)}</td>
                  <td className="px-3 py-2">{doc ? <a href={`/fisiere/${doc.id}?vezi=1`} target="_blank" rel="noopener noreferrer" className="text-forest-700 underline">{e.invoiceNumber ? `nr. ${e.invoiceNumber}` : "document"}</a> : <span className="text-xs text-amber-700">fără document</span>}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {e.voided ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 font-semibold text-red-900">Anulată</span>
                    ) : e.confirmedAt ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 font-semibold text-green-900" title={`Confirmat de ${e.confirmedBy}, ${formatDate(e.confirmedAt)}`}>
                        🔒 Confirmată
                      </span>
                    ) : (
                      <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Ciornă</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {!e.voided && (
                      <details>
                        <summary className="cursor-pointer text-xs text-slate-500 underline">anulează</summary>
                        <form action={voidExpenseAction} className="mt-1 flex gap-1">
                          <input type="hidden" name="id" value={e.id} />
                          <input name="reason" required placeholder="Motivul" className="w-28 rounded border border-slate-300 px-1 py-0.5 text-xs" />
                          <button className="rounded bg-red-700 px-2 text-xs font-semibold text-white">OK</button>
                        </form>
                      </details>
                    )}
                  </td>
                </tr>
                {draft && (
                  <tr>
                    <td colSpan={8} className="px-3 pb-3">
                      <details className="rounded-lg bg-amber-50 p-3">
                        <summary className="cursor-pointer text-sm font-semibold">
                          Completează ciorna{!e.documentId || !e.invoiceNumber ? " (lipsește " + [!e.invoiceNumber && "nr. documentului", !e.documentId && "documentul"].filter(Boolean).join(" și ") + ")" : ""} și confirmă
                        </summary>
                        <form action={updateDraftExpenseAction} className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <input type="hidden" name="id" value={e.id} />
                          <EntryFields lots={lots} today={today} entry={e} />
                          <EntryButtons hasDocument={Boolean(e.documentId)} />
                        </form>
                      </details>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Documente */}
      <h2 id="documente" className="mt-10 scroll-mt-6 text-xl">Documente</h2>
      <p className="text-sm text-slate-600">Facturi, avize, documente contabile, înregistrări DSV, contracte. PDF, imagine, Word sau Excel, maximum 3,5 MB.</p>
      <details className="mt-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <summary className="cursor-pointer text-sm font-semibold">+ Încarcă un document</summary>
        <form action={uploadDocumentAction} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="farmSlug" value={farm.slug} />
          <label className="text-sm font-semibold">Tipul
            <select name="category" required className={input}>
              {Object.entries(documentCategoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold sm:col-span-2">Titlu<input name="title" required placeholder="Ex. Înregistrare sanitar-veterinară exploatație" className={input} /></label>
          <label className="text-sm font-semibold">Număr (opțional)<input name="number" className={input} /></label>
          <label className="text-sm font-semibold">Data documentului<input name="date" type="date" required defaultValue={today} className={input} /></label>
          <label className="text-sm font-semibold">Lotul
            <select name="lotCode" className={input}>
              <option value="">General (fără lot)</option>
              {lots.map((l) => <option key={l.code} value={l.code}>{l.code}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold sm:col-span-2">Fișierul<input name="file" type="file" required accept={FILE_LIMITS.accept} className={input} /></label>
          <div className="sm:col-span-2 lg:col-span-3"><button className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white">Încarcă</button></div>
        </form>
      </details>
      <div className="mt-3">
        <DocumentTable docs={visibleDocs} canVerify={user.role === "admin"} returnTo={`/cont/gospodar/documente?${qs}#documente`} />
      </div>
      <p className="mt-4 text-xs text-slate-500">Ultima actualizare: {formatDate(new Date().toISOString())}.</p>
    </Container>
  );
}

function EntryFields({ lots, today, defaultLot = "", entry }: { lots: Lot[]; today: string; defaultLot?: string; entry?: Expense }) {
  return (
    <>
      <label className="text-sm font-semibold">Data documentului<input name="date" type="date" required defaultValue={entry?.date ?? today} className={input} /></label>
      <label className="text-sm font-semibold">Tip și categorie
        <select name="category" required defaultValue={entry?.category} className={input}>
          <optgroup label="Cheltuieli">
            {Object.entries(expenseCategoryLabels).filter(([k]) => !INCOME_CATEGORIES.includes(k as never)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </optgroup>
          <optgroup label="Venituri">
            {INCOME_CATEGORIES.map((k) => <option key={k} value={k}>{expenseCategoryLabels[k]}</option>)}
          </optgroup>
        </select>
      </label>
      <label className="text-sm font-semibold">Lotul
        <select name="lotCode" defaultValue={entry ? (entry.lotCode ?? "") : defaultLot} className={input}>
          <option value="">General (fără lot)</option>
          {lots.map((l) => <option key={l.code} value={l.code}>{l.code}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">Furnizor / client<input name="supplier" required defaultValue={entry?.supplier} placeholder="Ex. Agro Bucovina SRL" className={input} /></label>
      <label className="text-sm font-semibold">Suma (lei, cu TVA)<input name="amount" required inputMode="decimal" defaultValue={entry ? String(entry.amount).replace(".", ",") : undefined} placeholder="0,00" className={input} /></label>
      <label className="text-sm font-semibold">Nr. document fiscal<input name="number" defaultValue={entry?.invoiceNumber} placeholder="Factură / bon / chitanță" className={input} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Descriere<input name="description" defaultValue={entry?.description} placeholder="Ex. 500 kg furaj de creștere" className={input} /></label>
      <label className="text-sm font-semibold">
        Documentul fiscal (PDF / poză){entry?.documentId ? " – atașat; alege altul doar pentru înlocuire" : ""}
        <input name="file" type="file" accept={FILE_LIMITS.accept} className={input} />
      </label>
    </>
  );
}

function EntryButtons({ hasDocument }: { hasDocument?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
      <button name="confirm" value="0" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Salvează ca ciornă</button>
      <button name="confirm" value="1" className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white">
        Confirm corectitudinea datelor și trimit
      </button>
      <span className="text-xs text-slate-500">
        {hasDocument ? "Documentul e atașat." : "Pentru confirmare: nr. documentului + documentul atașat."} După confirmare nu se mai modifică.
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
