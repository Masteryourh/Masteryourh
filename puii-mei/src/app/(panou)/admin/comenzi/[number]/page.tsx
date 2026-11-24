import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import type { PreorderStatus } from "@/lib/domain";
import { formatDate, formatLei } from "@/lib/format";
import { orderPens } from "@/lib/order-pens";
import { feedAdvance } from "@/lib/pricing";
import { store } from "@/server/db/store";
import { orderFarm } from "@/server/orders";
import { parcelRepository, tourRepository } from "@/server/repositories/delivery";
import { preorderRepository } from "@/server/repositories/preorders";
import { zoneRepository } from "@/server/repositories/catalog";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comanda (admin)", robots: { index: false, follow: false } };

const status: Record<PreorderStatus, string> = {
  noua: "Nouă", confirmata: "Confirmată", "alocata-lot": "Alocată pe lot", "in-livrare": "În livrare", livrata: "Livrată", anulata: "Anulată",
};

/**
 * Comanda văzută din Admin (decizia fondatorului, 24.11.2026 — Admin Central Command Center): toate legăturile
 * (client, gospodărie, lot, țarc, plăți, livrare, etichetă, contract, audit) rămân în spațiul Admin. Adresa folosește
 * numărul comenzii, nu codul secret al clientului. „Înapoi” (traseul de sus) revine la pagina de origine, ex. țarcul.
 */
export default async function AdminOrderPage({ params }: PageProps<"/admin/comenzi/[number]">) {
  const { number } = await params;
  await requireUser(["admin"], `/admin/comenzi/${number}`);
  const order = await preorderRepository.byNumber(decodeURIComponent(number));
  if (!order) notFound();
  const [{ lot, farm, payment }, zone, parcel, all] = await Promise.all([
    orderFarm(order),
    zoneRepository.byId(order.zoneId, { includeInactive: true }),
    parcelRepository.byId(order.id),
    preorderRepository.list(),
  ]);
  const tour = parcel?.tourId ? await tourRepository.byId(parcel.tourId) : null;
  const pens = lot ? orderPens(order, lot, all) : [];
  const advance = order.feedPayment?.amount ?? feedAdvance(order.birds, payment?.feedPricePerKg, payment?.chickPricePerBird).amount;
  const parts = all.filter((p) => p.parentNumber === order.number || (order.parentNumber && (p.number === order.parentNumber || p.parentNumber === order.parentNumber)) ).filter((p) => p.id !== order.id);
  const audit = await store.auditList({ resourceId: order.id, limit: 50 });
  const self = `/admin/comenzi/${encodeURIComponent(order.number)}`;
  const back = (to: string) => `${to}${to.includes("?") ? "&" : "?"}inapoi=${encodeURIComponent(self)}`;
  const row = "flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-1.5";
  const box = "rounded-2xl bg-white p-5 text-sm ring-1 ring-forest-900/10";

  return (
    <Container className="py-8">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Comanda</p>
      <h1 className="font-mono text-3xl font-semibold">{order.number}</h1>
      <p className="mt-1 text-sm">
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold">{status[order.status]}</span>{" "}
        · {order.birds} pui · plasată {formatDate(order.createdAt)}
        {order.parentNumber && <> · parte din <Link className="font-mono underline" href={`/admin/comenzi/${encodeURIComponent(order.parentNumber)}`}>{order.parentNumber}</Link></>}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className={box}>
          <h2 className="text-base font-semibold">Clientul</h2>
          <dl className="mt-2 divide-y divide-slate-100">
            <div className={row}><dt className="text-slate-500">Nume</dt><dd className="font-medium">{order.customer.name}</dd></div>
            <div className={row}><dt className="text-slate-500">Telefon</dt><dd><a className="underline" href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></dd></div>
            <div className={row}><dt className="text-slate-500">Email</dt><dd>{order.customer.email || "—"}</dd></div>
            <div className={row}><dt className="text-slate-500">Livrare</dt><dd>{zone?.name ?? order.zoneId}{order.address ? ` · ${order.address}` : ""}</dd></div>
          </dl>
        </section>

        <section className={box}>
          <h2 className="text-base font-semibold">Gospodăria, lotul și țarcul</h2>
          {lot && farm ? (
            <dl className="mt-2 divide-y divide-slate-100">
              <div className={row}><dt className="text-slate-500">Gospodăria</dt><dd><Link className="underline" href={back(`/admin/gospodarii/${farm.slug}`)}>{farm.name}</Link></dd></div>
              <div className={row}><dt className="text-slate-500">Lotul</dt><dd><Link className="font-mono underline" href={`/admin/loturi?deschis=${lot.code}#lot-${lot.code}`}>{lot.code}</Link></dd></div>
              <div className={row}>
                <dt className="text-slate-500">{pens.length > 1 ? "Țarcurile" : "Țarcul"}</dt>
                <dd className="flex gap-2">
                  {pens.map((n) => <Link key={n} data-pen-link className="underline" href={`/admin/loturi?deschis=${lot.code}#tarc-${lot.code}-${n}`}>Țarcul {n}</Link>)}
                </dd>
              </div>
              <div className={row}><dt className="text-slate-500">Jurnalul de creștere</dt><dd><Link className="underline" href={back(`/admin/gospodarii/${farm.slug}/jurnal`)}>Deschide</Link></dd></div>
            </dl>
          ) : (
            <p className="mt-2 text-slate-600">Încă nealocată pe un lot{order.allocation?.status === "asteapta" ? " (în așteptare)" : order.allocation?.status === "alegere" ? " (clientul alege)" : ""}.</p>
          )}
        </section>

        <section className={box}>
          <h2 className="text-base font-semibold">Plăți</h2>
          <dl className="mt-2 divide-y divide-slate-100">
            <div className={row}><dt className="text-slate-500">Total estimat</dt><dd className="font-semibold">{formatLei(order.estimate.total)}</dd></div>
            <div className={row}><dt className="text-slate-500">Avans (pui de o zi + furaj)</dt><dd>{formatLei(advance)}</dd></div>
            <div className={row}>
              <dt className="text-slate-500">Starea avansului</dt>
              <dd>{order.feedPayment?.status === "primita" ? `primit${order.feedPayment.confirmedBy ? `, confirmat de ${order.feedPayment.confirmedBy}` : ""}` : order.feedPayment?.status === "declarata" ? "declarat de client, neconfirmat" : "de plătit"}</dd>
            </div>
            <div className={row}><dt className="text-slate-500">Cont gospodărie</dt><dd>{payment?.iban ? `${payment.iban.slice(0, 4)} •••• ${payment.iban.slice(-4)}` : "neconfigurat"}</dd></div>
          </dl>
        </section>

        <section className={box}>
          <h2 className="text-base font-semibold">Livrare și documente</h2>
          <dl className="mt-2 divide-y divide-slate-100">
            <div className={row}><dt className="text-slate-500">Eticheta coletului</dt><dd>{parcel ? <Link className="underline" href={back(`/admin/livrari/etichete?ids=${order.id}`)}>Vezi eticheta</Link> : "negenerată"}</dd></div>
            <div className={row}><dt className="text-slate-500">Tura de livrare</dt><dd>{tour ? <Link className="font-mono underline" href={back(`/admin/livrari/${tour.id}`)}>{tour.code}</Link> : "—"}</dd></div>
            <div className={row}><dt className="text-slate-500">Predat clientului</dt><dd>{parcel?.delivered ? formatDate(parcel.delivered.at) : "—"}</dd></div>
            <div className={row}><dt className="text-slate-500">Contractul de creștere</dt><dd><Link className="underline" href={back(`${self}/contract`)}>Vezi contractul</Link></dd></div>
          </dl>
        </section>
      </div>

      {parts.length > 0 && (
        <section className={`${box} mt-4`}>
          <h2 className="text-base font-semibold">Comanda împărțită</h2>
          <ul className="mt-2 flex flex-wrap gap-3">
            {parts.map((p) => <li key={p.id}><Link className="font-mono underline" href={`/admin/comenzi/${encodeURIComponent(p.number)}`}>{p.number}</Link> ({p.birds} pui)</li>)}
          </ul>
        </section>
      )}

      <section className={`${box} mt-4`} id="audit">
        <h2 className="text-base font-semibold">Istoric (jurnal de audit)</h2>
        {audit.length === 0 ? (
          <p className="mt-2 text-slate-600">Nicio acțiune înregistrată pe această comandă.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {audit.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-2">
                <span className="text-slate-500">{new Date(e.occurredAt).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</span>
                <span className="font-mono text-xs">{e.action}</span>
                <span>{e.actorRole ?? e.actorType} · {e.workspace}</span>
                <span className={e.result === "ok" ? "text-forest-800" : "text-red-700"}>{e.result}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
