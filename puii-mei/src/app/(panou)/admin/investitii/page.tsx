import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { investmentStatusLabels } from "@/lib/documents";
import { formatDate, formatLei } from "@/lib/format";
import { farmRepository } from "@/server/repositories/catalog";
import { investmentRepository } from "@/server/repositories/documents";
import { userRepository } from "@/server/repositories/users";
import { createInvestmentAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Investiții", robots: { index: false, follow: false } };

const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal";

export default async function AdminInvestmentsPage({ searchParams }: PageProps<"/admin/investitii">) {
  const sp = await searchParams;
  const [investments, users, farms] = await Promise.all([investmentRepository.list(), userRepository.list(), farmRepository.listAll()]);
  const investors = users.filter((u) => u.role === "investitor");
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const farmName = new Map(farms.map((f) => [f.slug, f.name]));
  const active = investments.filter((i) => i.status !== "anulata");

  return (
    <Container className="py-8">
      <h1>Investiții</h1>
      <p className="mt-1 text-sm text-slate-600">
        Total: <strong>{formatLei(active.reduce((s, i) => s + i.amount, 0))}</strong> în {active.length} investiții, de la{" "}
        {new Set(active.map((i) => i.investorId)).size} investitori.
      </p>
      {typeof sp.eroare === "string" && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{sp.eroare}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>{["Investiția", "Investitor", "Gospodăria", "Suma", "Data", "Status"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!investments.length && <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-500">Nicio investiție încă.</td></tr>}
            {investments.map((i) => (
              <tr key={i.id}>
                <td className="px-3 py-2"><Link href={`/admin/investitii/${i.id}`} className="font-semibold text-forest-700 underline">{i.title}</Link></td>
                <td className="px-3 py-2">{userName.get(i.investorId) ?? "—"}</td>
                <td className="px-3 py-2">{(i.farmSlug && farmName.get(i.farmSlug)) || "—"}</td>
                <td className="px-3 py-2">{formatLei(i.amount)}</td>
                <td className="px-3 py-2">{formatDate(i.date)}</td>
                <td className="px-3 py-2">{investmentStatusLabels[i.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl">Investiție nouă</h2>
      {!investors.length ? (
        <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Nu există conturi de investitor. Creează unul din <Link href="/admin/utilizatori" className="underline">Utilizatori</Link>.
        </p>
      ) : (
        <form action={createInvestmentAction} className="mt-3 grid max-w-4xl gap-4 rounded-xl bg-white p-5 ring-1 ring-slate-200 sm:grid-cols-2">
          <label className="text-sm font-semibold">Investitorul
            <select name="investorId" required className={input}>
              {investors.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Gospodăria susținută (opțional)
            <select name="farmSlug" className={input}>
              <option value="">—</option>
              {farms.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold sm:col-span-2">Obiectul investiției<input name="title" required placeholder="Ex. Adăpost nou pentru 300 de pui – Ferma de la Deal" className={input} /></label>
          <label className="text-sm font-semibold">Suma (lei)<input name="amount" required inputMode="decimal" className={input} /></label>
          <label className="text-sm font-semibold">Data<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={input} /></label>
          <label className="text-sm font-semibold">Status
            <select name="status" defaultValue="propusa" className={input}>
              {Object.entries(investmentStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Condiții / randament<input name="terms" placeholder="Ex. 8% pe an, plătit trimestrial" className={input} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Descriere<textarea name="description" rows={3} className={input} /></label>
          <div className="sm:col-span-2"><button className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white">Înregistrează investiția</button></div>
        </form>
      )}
    </Container>
  );
}
