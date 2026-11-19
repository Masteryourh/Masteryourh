import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ratingTargets, tempOk } from "@/lib/delivery";
import type { Parcel } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { farmRepository } from "@/server/repositories/catalog";
import { parcelRepository, tourRepository } from "@/server/repositories/delivery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calitate", robots: { index: false, follow: false } };

type Key = (typeof ratingTargets)[number]["key"];
const avg = (items: Parcel[], k: Key) => {
  const v = items.flatMap((p) => (p.ratings ? [p.ratings[k]] : []));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const fmt = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5`);

/** Calitatea pe verigi: gospodărie, curier, platformă – din confirmări și evaluări. */
export default async function QualityPage() {
  const [parcels, tours, farms] = await Promise.all([parcelRepository.list(), tourRepository.list(), farmRepository.listAll()]);
  const farmName = new Map(farms.map((f) => [f.slug, `${f.name}, ${f.village}`]));
  const delivered = parcels.filter((p) => p.delivered);
  const confirmed = parcels.filter((p) => p.submittedAt);
  const problems = parcels.filter((p) => p.answers && !p.answers.conditionOk);
  const tempAlerts = parcels.filter((p) => (p.loaded && !tempOk(p.loaded.temp)) || (p.delivered && !tempOk(p.delivered.temp))).length;
  const finished = tours.filter((t) => t.status === "incheiata");
  const ext = tours.flatMap((t) => t.extensions);

  const byFarm = [...new Set(parcels.map((p) => p.farmSlug))];
  const couriers = [...new Set(tours.filter((t) => t.courier).map((t) => t.courier!.name))];

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-semibold">Calitate</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">Unde apar abateri: la gospodărie, la curier sau la platformă.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Colete predate" value={String(delivered.length)} />
        <Stat label="Confirmate de clienți" value={`${confirmed.length} (${problems.length} probleme)`} />
        <Stat label="Alerte de temperatură" value={String(tempAlerts)} />
        <Stat label="Prelungiri cerute / aprobate" value={`${ext.length} / ${ext.filter((e) => e.status === "aprobata").length}`} />
      </div>

      <h2 className="mt-10 text-2xl font-semibold">Note medii pe gospodărie</h2>
      <Table
        head={["Gospodărie", "Evaluări", ...ratingTargets.map((t) => t.label)]}
        rows={byFarm.map((slug) => {
          const items = parcels.filter((p) => p.farmSlug === slug);
          return [farmName.get(slug) ?? slug, String(items.filter((p) => p.ratings).length), ...ratingTargets.map((t) => fmt(avg(items, t.key)))];
        })}
      />

      <h2 className="mt-10 text-2xl font-semibold">Curieri</h2>
      <Table
        head={["Curier", "Ture încheiate", "Km", "Prelungiri", "Nota curierului"]}
        rows={couriers.map((name) => {
          const ts = tours.filter((t) => t.courier?.name === name);
          const ids = new Set(ts.flatMap((t) => t.parcelIds));
          const km = ts.reduce((s, t) => s + (t.finish && t.start ? t.finish.odometer - t.start.odometer : 0), 0);
          return [name, String(ts.filter((t) => t.status === "incheiata").length), String(km), String(ts.flatMap((t) => t.extensions).length), fmt(avg(parcels.filter((p) => ids.has(p.id)), "courier"))];
        })}
      />
      <p className="mt-2 text-xs text-muted">{finished.length} ture încheiate în total.</p>

      <h2 className="mt-10 text-2xl font-semibold">Probleme semnalate de clienți</h2>
      <ul className="mt-4 space-y-3">
        {problems.length === 0 && <li className="text-muted">Nicio problemă semnalată.</li>}
        {problems.map((p) => (
          <li key={p.id} className="rounded-2xl bg-white p-5 text-sm ring-1 ring-red-200">
            <div className="flex flex-wrap justify-between gap-2">
              {p.tourId ? (
                <Link href={`/admin/livrari/${p.tourId}`} className="font-mono font-semibold underline">{p.preorderNumber}</Link>
              ) : (
                <span className="font-mono font-semibold">{p.preorderNumber}</span>
              )}
              <span className="text-muted">{formatDate(p.submittedAt!)}</span>
            </div>
            <p className="mt-1 text-muted">
              {farmName.get(p.farmSlug)} · {p.answers!.birdsReceived}/{p.birds} pui · ambalaj {p.answers!.packagingOk ? "ok" : "deteriorat"} · {p.answers!.coldOk ? "rece" : "nu era rece"} · aspect {p.answers!.appearanceOk ? "ok" : "neconform"}
            </p>
            <p className="mt-2 rounded-xl bg-red-50 p-3 text-red-900">{p.answers!.problem}</p>
          </li>
        ))}
      </ul>
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-forest-900/10">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-forest-900">{value}</p>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-forest-900/10 bg-white">
      <table className="w-full min-w-[560px] text-left text-sm tabular-nums">
        <thead className="bg-cream-100 text-xs uppercase tracking-wider text-muted">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-forest-900/5">
          {rows.length === 0 && <tr><td colSpan={head.length} className="px-4 py-6 text-center text-muted">Nicio dată încă.</td></tr>}
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className={`px-4 py-3 ${j === 0 ? "font-medium" : ""}`}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
