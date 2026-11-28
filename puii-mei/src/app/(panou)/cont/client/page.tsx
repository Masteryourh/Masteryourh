import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/session";
import { preorderRepository } from "@/server/repositories/preorders";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { availabilityDate, lotStatus, statusLabels } from "@/lib/lots";
import { formatDate, formatLei } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comenzile mele", robots: { index: false, follow: false } };

const statusRo: Record<string, string> = { noua: "Nouă", confirmata: "Confirmată", "alocata-lot": "Alocată pe lot", "in-livrare": "În livrare", livrata: "Livrată", anulata: "Anulată" };
const advanceRo: Record<string, string> = { "de-platit": "Avans de plătit", declarata: "Avans declarat", primita: "Avans primit" };

/** Contul (opțional) de client: comenzile proprii, cu lotul, gospodăria și urmărirea. Accesul cu număr + cod rămâne. */
export default async function ClientOrdersPage() {
  const user = await requireUser(["client"], "/cont/client");
  const orders = user.role === "client" ? await preorderRepository.byCustomerUser(user.id) : [];
  const [farms, lots] = await Promise.all([farmRepository.listAll(), Promise.all(orders.map((o) => (o.lotCode ? lotRepository.byCode(o.lotCode, { all: true }) : null)))]);
  const farmName = new Map(farms.map((f) => [f.slug, f.name]));
  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6 sm:pt-6">
      <h1 className="text-3xl font-semibold tracking-tight">Comenzile mele</h1>
      <p className="mt-1 text-sm text-slate-500">{orders.length === 0 ? "Nicio comandă încă." : `${orders.length} ${orders.length === 1 ? "comandă" : "comenzi"} · ${orders.reduce((s, o) => s + o.birds, 0)} pui`}</p>
      <ul className="mt-5 space-y-3">
        {orders.map((o, i) => {
          const lot = lots[i];
          return (
            <li key={o.id} data-comanda={o.number} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono font-semibold">{o.number}</p>
                  <p className="text-sm text-slate-500">{o.birds} pui · {formatLei(o.estimate.total)}</p>
                </div>
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">{statusRo[o.status] ?? o.status}</span>
              </div>
              {lot && (
                <p className="mt-2 text-sm">
                  {farmName.get(lot.farmSlug)} · lotul <span className="font-mono">{lot.code}</span> · {statusLabels[lotStatus(lot)]} · disponibil estimat {formatDate(availabilityDate(lot))}
                </p>
              )}
              <p className="mt-1 text-sm text-slate-500">{advanceRo[o.feedPayment?.status ?? "de-platit"]}</p>
              {o.trackingToken && (
                <Link href={`/comanda/${o.trackingToken}`} className="mt-3 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  Detalii și urmărire
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <Link href="/precomanda" className="mt-6 inline-block text-sm font-semibold underline">Fă o precomandă nouă</Link>
    </div>
  );
}
