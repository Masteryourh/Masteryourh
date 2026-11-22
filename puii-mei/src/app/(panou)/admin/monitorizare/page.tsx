import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { GROWTH } from "@/lib/growth";
import { growthAlerts, penAgeDays } from "@/lib/growth-log";
import { formatDate } from "@/lib/format";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { growthLogRepository } from "@/server/repositories/growth-log";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Monitorizare creștere", robots: { index: false, follow: false } };

/** Toate loturile în creștere: ziua, ultimele mutări și poze, alertele. */
export default async function MonitoringPage() {
  const [lots, entries, farms] = await Promise.all([lotRepository.list({ all: true }), growthLogRepository.list(), farmRepository.listAll()]);
  const farmName = new Map(farms.map((f) => [f.slug, f.name]));
  const active = lots.filter((l) => l.penStarts?.length && penAgeDays(l.penStarts[0].date) < l.growthDays + GROWTH.turnaroundDays);
  const alerts = growthAlerts(lots, entries);

  return (
    <Container className="py-8">
      <h1>Monitorizare creștere</h1>
      <p className="mt-1 text-sm text-slate-600">
        Mutarea zilnică a țarcurilor (de la ziua 21), poza la 7 zile, intervențiile și verificările veterinare notate de gospodari.
      </p>
      <h2 className="mt-6 text-lg">Alerte ({alerts.length})</h2>
      {!alerts.length ? (
        <p className="mt-2 text-sm text-green-800">Totul e la zi.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {alerts.map((a) => (
            <li key={a.id} className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
              <strong>{farmName.get(a.farmSlug)}</strong> · lotul {a.lotCode}: {a.text}{" "}
              <Link href={`/cont/gospodar/jurnal?gospodarie=${a.farmSlug}`} className="font-semibold underline">Jurnal</Link>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-8 text-lg">Loturi în creștere ({active.length})</h2>
      <div className="mt-2 overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>{["Lot", "Gospodăria", "Ziua", "Țarcuri pornite", "Ultima mutare", "Ultima poză", "Vizite vet.", ""].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!active.length && <tr><td colSpan={8} className="px-3 py-4 text-center text-slate-500">Niciun lot în creștere.</td></tr>}
            {active.map((l) => {
              const mine = entries.filter((e) => e.lotCode === l.code);
              const move = mine.find((e) => e.type === "mutare");
              const photo = mine.find((e) => e.type === "poza");
              return (
                <tr key={l.code}>
                  <td className="px-3 py-2 font-mono text-xs">{l.code}</td>
                  <td className="px-3 py-2">{farmName.get(l.farmSlug)}</td>
                  <td className="px-3 py-2">{penAgeDays(l.penStarts![0].date)} / {l.growthDays}</td>
                  <td className="px-3 py-2">{l.penStarts!.length}</td>
                  <td className="px-3 py-2">{move ? formatDate(move.date) : "—"}</td>
                  <td className="px-3 py-2">{photo ? formatDate(photo.date) : "—"}</td>
                  <td className="px-3 py-2">{mine.filter((e) => e.type === "veterinar").length}</td>
                  <td className="px-3 py-2"><Link href={`/cont/gospodar/jurnal?gospodarie=${l.farmSlug}`} className="font-semibold underline">Jurnal</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Container>
  );
}
