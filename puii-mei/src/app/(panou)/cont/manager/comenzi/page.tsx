import type { Metadata } from "next";
import { requireUser } from "@/server/session";
import { farmsInScope } from "@/server/territory";
import { lotRepository } from "@/server/repositories/catalog";
import { preorderRepository } from "@/server/repositories/preorders";
import { maskPhone } from "@/server/order-access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comenzi în teritoriu", robots: { index: false, follow: false } };

const statusRo: Record<string, string> = { noua: "Nouă", confirmata: "Confirmată", "alocata-lot": "Alocată pe lot", "in-livrare": "În livrare", livrata: "Livrată", anulata: "Anulată" };
const advanceRo: Record<string, string> = { "de-platit": "de plătit", declarata: "declarat", primita: "primit" };

/** Comenzile de pe loturile gospodăriilor din teritoriu (doar vizualizare; telefonul clientului e mascat). */
export default async function ManagerOrdersPage() {
  const user = await requireUser(["manager-local", "manager-zonal"], "/cont/manager/comenzi");
  const farms = await farmsInScope(user);
  const name = new Map(farms.map((f) => [f.slug, f.name]));
  const lots = (await Promise.all(farms.map((f) => lotRepository.byFarm(f.slug, { all: true })))).flat();
  const farmOf = new Map(lots.map((l) => [l.code, l.farmSlug]));
  const orders = (await preorderRepository.byLots(lots.map((l) => l.code))).filter((p) => p.status !== "anulata");
  const birds = orders.reduce((s, p) => s + p.birds, 0);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Comenzi în teritoriu</h1>
      <p className="mt-1 text-sm text-slate-500">{orders.length} comenzi · {birds} pui · {farms.length} gospodării</p>
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>{["Comanda", "Client", "Pui", "Gospodăria", "Lot", "Stare", "Avans"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2.5 font-mono font-semibold">{p.number}</td>
                <td className="px-4 py-2.5">{p.customer.name} <span className="text-slate-500">· {maskPhone(p.customer.phone)}</span></td>
                <td className="px-4 py-2.5 tabular-nums">{p.birds}</td>
                <td className="px-4 py-2.5">{name.get(farmOf.get(p.lotCode ?? "") ?? "") ?? "–"}</td>
                <td className="px-4 py-2.5 font-mono">{p.lotCode ?? "–"}</td>
                <td className="px-4 py-2.5">{statusRo[p.status] ?? p.status}</td>
                <td className="px-4 py-2.5">{advanceRo[p.feedPayment?.status ?? "de-platit"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
