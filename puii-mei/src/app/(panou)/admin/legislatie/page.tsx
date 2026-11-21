import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { LegalList } from "@/components/legal/LegalList";
import { legalKindLabels, type LegalEntry } from "@/lib/legal";
import { legalRepository } from "@/server/repositories/legal";
import { createLegalAction, updateLegalAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Legislație și surse", robots: { index: false, follow: false } };

const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal";

function Fields({ e }: { e?: LegalEntry }) {
  return (
    <>
      <label className="text-sm font-semibold">Tip
        <select name="kind" defaultValue={e?.kind ?? "lege"} className={input}>
          {Object.entries(legalKindLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold sm:col-span-2">Titlu<input name="title" required defaultValue={e?.title} className={input} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Link<input name="url" type="url" required defaultValue={e?.url} placeholder="https://…" className={input} /></label>
      <label className="text-sm font-semibold">Data (opțional)<input name="date" type="date" defaultValue={e?.date} className={input} /></label>
      <label className="text-sm font-semibold sm:col-span-3">Rezumat (ce înseamnă pentru gospodari)<textarea name="summary" rows={2} defaultValue={e?.summary} className={input} /></label>
      <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-3">
        <input type="checkbox" name="verified" defaultChecked={e?.verified} className="h-4 w-4" /> Verificat (în vigoare, confirmat de jurist / DSVSA)
      </label>
    </>
  );
}

export default async function AdminLegalPage({ searchParams }: PageProps<"/admin/legislatie">) {
  const sp = await searchParams;
  const entries = await legalRepository.list({ includeArchived: true });

  return (
    <Container className="max-w-4xl py-8">
      <h1>Legislație și surse</h1>
      <p className="mt-1 text-sm text-slate-600">
        Legile, ghidurile și știrile relevante pentru creștere, sacrificare în gospodărie și vânzare directă. Gospodarii le
        văd în panoul lor (fără cele arhivate). Marchează „Verificat” doar după confirmarea juristului sau a DSVSA.
      </p>
      {typeof sp.eroare === "string" && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{sp.eroare}</p>}
      {sp.salvat && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Salvat.</p>}

      <details className="mt-6 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <summary className="cursor-pointer text-sm font-semibold">+ Adaugă o lege, un ghid sau o știre</summary>
        <form action={createLegalAction} className="mt-4 grid gap-4 sm:grid-cols-3">
          <Fields />
          <div className="sm:col-span-3"><button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Adaugă</button></div>
        </form>
      </details>

      <div className="mt-8">
        <LegalList
          entries={entries}
          actions={(e) => (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-slate-500 underline">modifică / arhivează</summary>
              <form action={updateLegalAction} className="mt-3 grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="id" value={e.id} />
                <Fields e={e} />
                <div className="flex flex-wrap gap-2 sm:col-span-3">
                  <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white">Salvează</button>
                  <button name="archive" value={e.archived ? "0" : "1"} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">
                    {e.archived ? "Scoate din arhivă" : "Arhivează"}
                  </button>
                </div>
              </form>
            </details>
          )}
        />
      </div>
    </Container>
  );
}
