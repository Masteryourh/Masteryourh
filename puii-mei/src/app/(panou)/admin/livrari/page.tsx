import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { tourDeadline, tourStatusLabels } from "@/lib/delivery";
import type { Parcel, Tour } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { farmRepository } from "@/server/repositories/catalog";
import { eventRepository, parcelRepository, tourRepository } from "@/server/repositories/delivery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Livrări live", robots: { index: false, follow: false } };

const time = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });
const order: Record<Tour["status"], number> = { "in-curs": 0, planificata: 1, incheiata: 2, anulata: 3 };

function late(t: Tour) {
  const d = tourDeadline(t);
  return Boolean(d && t.status === "in-curs" && Date.now() > d.getTime());
}

/** Toate turele, semi-live: progresul se actualizează la fiecare livrare încheiată. */
export default async function LiveDeliveriesPage() {
  const [tours, parcels, events, farms] = await Promise.all([
    tourRepository.list(),
    parcelRepository.list(),
    eventRepository.all(),
    farmRepository.listAll(),
  ]);
  const farmName = new Map(farms.map((f) => [f.slug, `${f.name}, ${f.village}`]));
  const parcelById = new Map(parcels.map((p) => [p.id, p]));
  const sorted = [...tours].sort((a, b) => order[a.status] - order[b.status] || b.date.localeCompare(a.date));
  const labels = [...parcels].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-semibold">Livrări live</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Toate turele, cu progresul actualizat la fiecare livrare încheiată. Alertele: temperatură în afara 0–4 °C,
        termen depășit, PIN-uri greșite, cereri de prelungire, probleme semnalate de clienți.
      </p>

      <ul className="mt-6 grid gap-4 lg:grid-cols-2">
        {sorted.length === 0 && <li className="rounded-2xl bg-white p-5 text-muted ring-1 ring-forest-900/10">Nicio tură încă.</li>}
        {sorted.map((t) => {
          const ps = t.parcelIds.map((id) => parcelById.get(id)).filter(Boolean) as Parcel[];
          const done = ps.filter((p) => p.delivered).length;
          const alerts = events.filter((e) => e.tourId === t.id && e.alert).length;
          const pendingExt = t.extensions.filter((e) => e.status === "asteapta").length;
          const d = tourDeadline(t);
          return (
            <li key={t.id}>
              <Link href={`/admin/livrari/${t.id}`} className="block rounded-3xl bg-white p-5 ring-1 ring-forest-900/10 hover:ring-forest-700/40">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-lg font-semibold">{t.code}</p>
                    <p className="text-sm text-muted">{farmName.get(t.farmSlug)} · {formatDate(t.date)}</p>
                    {t.courier && <p className="text-sm text-muted">{t.courier.name} · {t.courier.plate}</p>}
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <span className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-semibold">{tourStatusLabels[t.status]}</span>
                    {late(t) && <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">Termen depășit</span>}
                    {pendingExt > 0 && <span className="rounded-full bg-grain-400 px-2.5 py-1 text-xs font-semibold">Prelungire cerută</span>}
                    {alerts > 0 && <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">{alerts} alerte</span>}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1" aria-label={`${done} din ${ps.length} livrate`}>
                  {ps.map((p) => (
                    <span key={p.id} className={`h-2.5 flex-1 rounded-full ${p.delivered ? "bg-forest-500" : p.loaded ? "bg-grain-400" : "bg-forest-900/10"}`} />
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted">
                  {done} din {ps.length} predate
                  {d && t.status === "in-curs" ? ` · termen ${time.format(d)}` : ""}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-12 text-2xl font-semibold">Etichete generate</h2>
      <p className="mt-1 text-sm text-muted">Primite automat când gospodarul le generează.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-forest-900/10 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-cream-100 text-xs uppercase tracking-wider text-muted">
            <tr>
              {["Comandă", "Gospodărie", "Lot", "Consum până la", "Versiune", "Generată", ""].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-900/5">
            {labels.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted">Nicio etichetă generată încă.</td></tr>
            )}
            {labels.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-mono text-xs">{p.preorderNumber}</td>
                <td className="px-4 py-3">{farmName.get(p.farmSlug)}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.lotCode}</td>
                <td className="px-4 py-3">{formatDate(p.expiresOn)}</td>
                <td className="px-4 py-3">v{p.version}{p.replacedTokens.length ? ` (${p.replacedTokens.length} înlocuite)` : ""}</td>
                <td className="px-4 py-3">{time.format(new Date(p.createdAt))} · {p.createdBy}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/livrari/etichete?ids=${p.id}`} className="font-semibold text-forest-700 underline">Vezi</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Container>
  );
}
