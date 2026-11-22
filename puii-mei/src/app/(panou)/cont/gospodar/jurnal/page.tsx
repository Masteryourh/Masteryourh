import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { GrowthEntryForm } from "@/components/growth/GrowthEntryForm";
import { GrowthTimeline } from "@/components/growth/GrowthTimeline";
import { PenTrackMap } from "@/components/maps/PenTrackMap";
import { GROWTH, lotPens } from "@/lib/growth";
import { growthAlerts, penAgeDays } from "@/lib/growth-log";
import { formatDate } from "@/lib/format";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { growthLogRepository } from "@/server/repositories/growth-log";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Jurnal de creștere", robots: { index: false, follow: false } };

export default async function GrowthJournalPage({ searchParams }: PageProps<"/cont/gospodar/jurnal">) {
  const user = await requireUser(["gospodar"], "/cont/gospodar/jurnal");
  const sp = await searchParams;
  const farms = await farmRepository.listAll();
  const slug = user.role === "admin" ? (typeof sp.gospodarie === "string" ? sp.gospodarie : farms[0]?.slug) : user.farmSlug;
  const farm = farms.find((f) => f.slug === slug);
  if (!farm) return <Container className="py-8"><p>Contul nu e legat de o gospodărie.</p></Container>;
  const [lots, entries] = await Promise.all([lotRepository.byFarm(farm.slug, { all: true }), growthLogRepository.byFarm(farm.slug)]);
  const active = lots.filter((l) => l.penStarts?.length && penAgeDays(l.penStarts[0].date) < l.growthDays + GROWTH.turnaroundDays);
  const alerts = growthAlerts(lots, entries);

  return (
    <Container className="py-8">
      {user.role === "admin" && (
        <form className="mb-6 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm">
          <label htmlFor="gospodarie" className="font-semibold">Previzualizare ca administrator:</label>
          <select id="gospodarie" name="gospodarie" defaultValue={farm.slug} className="rounded border border-slate-300 bg-white px-2 py-1">
            {farms.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
          <button className="rounded bg-slate-800 px-3 py-1 font-semibold text-white">Afișează</button>
        </form>
      )}
      <h1>Jurnal de creștere · {farm.name}</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        Notează fiecare mutare a țarcului (zilnic, de la 21 de zile; telefonul trimite automat poziția) și fiecare intervenție.
        La fiecare 7 zile, o poză cu puii. Ce lipsește apare ca alertă la Puii mei. Clienții văd jurnalul lotului lor.
      </p>
      {alerts.length > 0 && (
        <ul role="alert" className="mt-4 space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-900">
          {alerts.map((a) => <li key={a.id}>⚠ Lotul {a.lotCode}: {a.text}</li>)}
        </ul>
      )}
      {!active.length && (
        <p className="mt-6 rounded-xl bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">
          Niciun lot în creștere. Jurnalul pornește când pornești primul țarc al unui lot (din „Gospodăria mea” → loturi).
        </p>
      )}

      {active.map((lot) => {
        const mine = entries.filter((e) => e.lotCode === lot.code);
        const tracks = Array.from({ length: lotPens(lot) }, (_, i) => ({
          pen: i + 1,
          points: mine
            .filter((e) => e.type === "mutare" && e.pen === i + 1 && e.lat && e.lng)
            .sort((a, b) => a.at.localeCompare(b.at))
            .map((e) => ({ lat: e.lat!, lng: e.lng!, date: e.date })),
        }));
        const lastPhoto = mine.find((e) => e.type === "poza");
        return (
          <section key={lot.code} className="mt-8 space-y-4">
            <h2 className="text-xl">
              Lotul <span className="font-mono">{lot.code}</span> · ziua {Math.max(0, penAgeDays(lot.penStarts![0].date))} din {lot.growthDays}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(lot.penStarts ?? []).map((s) => {
                const age = penAgeDays(s.date);
                const last = mine.find((e) => e.type === "mutare" && e.pen === s.n);
                const outside = age >= GROWTH.indoorDays;
                return (
                  <div key={s.n} className="rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Țarcul {s.n}</span>
                      <span className="text-xs text-slate-500">ziua {age}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {age >= lot.growthDays ? "Gata de sacrificare" : outside ? "Pe pășune: mutare zilnică" : `La interior până la ziua ${GROWTH.indoorDays}`}
                      {last ? ` · ultima mutare ${formatDate(last.date)}` : ""}
                    </p>
                    {outside && age < lot.growthDays && (
                      <div className="mt-3"><GrowthEntryForm lotCode={lot.code} pens={lotPens(lot)} type="mutare" pen={s.n} compact /></div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-base">Traseul țarcurilor pe pășune</h3>
                <PenTrackMap tracks={tracks} />
              </div>
              <div className="space-y-4">
                <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                  <h3 className="text-base">Poza săptămânii</h3>
                  <p className="text-xs text-slate-500">{lastPhoto ? `Ultima: ${formatDate(lastPhoto.date)}` : "Încă nicio poză."} O dată la 7 zile.</p>
                  <div className="mt-2"><GrowthEntryForm lotCode={lot.code} pens={lotPens(lot)} type="poza" /></div>
                </div>
                <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                  <h3 className="text-base">Altă intervenție / verificare veterinară</h3>
                  <div className="mt-2"><GrowthEntryForm lotCode={lot.code} pens={lotPens(lot)} /></div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-base">Jurnal</h3>
              <GrowthTimeline entries={mine} />
            </div>
          </section>
        );
      })}
    </Container>
  );
}
