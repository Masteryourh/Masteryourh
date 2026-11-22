import type { FarmRecord, Lot, Preorder } from "@/lib/domain";
import type { GrowthEntry } from "@/lib/growth-log";
import { AerialMap, Gauge, Glass, GlassTitle, Metric, Pill } from "@/components/panel/Dash";
import { GROWTH } from "@/lib/growth";
import { penAgeDays } from "@/lib/growth-log";
import { penSpots } from "@/lib/order-pens";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";

interface Step { label: string; done: boolean; note?: string }

/** Dashboardul comenzii, în stilul panoului gospodarului: gospodăria de sus, țarcurile, creșterea, plățile. */
export function OrderDashboard({
  order, lot, farm, myPens, journal, steps, advance, advanceStatus, token, availableOn,
}: {
  order: Preorder;
  lot: Lot | null;
  farm: FarmRecord | null;
  myPens: number[];
  journal: GrowthEntry[];
  steps: Step[];
  advance: number;
  advanceStatus: "de-platit" | "declarata" | "primita";
  token: string;
  availableOn?: Date | string;
}) {
  const starts = lot?.penStarts ?? [];
  const myStart = starts.find((s) => s.n === myPens[0]);
  const day = myStart ? Math.max(0, penAgeDays(myStart.date)) : 0;
  const growthDays = lot?.growthDays ?? GROWTH.growthDays;
  const readyOn = myStart ? new Date(new Date(myStart.date).getTime() + growthDays * 86400000) : availableOn;
  const progress = myStart ? Math.min(100, Math.round((day / growthDays) * 100)) : 0;
  const phase = !lot
    ? "Se alocă gospodăria"
    : !myStart
      ? "Țarcul se umple cu precomenzi"
      : day >= growthDays
        ? "Gata de sacrificare"
        : day >= GROWTH.indoorDays
          ? "Pe pășune, țarc mutat zilnic"
          : `La căldură, în interior (până la ziua ${GROWTH.indoorDays})`;
  const pens = lot ? (lot.pens ?? Math.max(1, Math.ceil(lot.totalBirds / GROWTH.birdsPerPen))) : 0;
  const spots = penSpots(pens);
  const lastMove = journal.find((e) => e.type === "mutare" && myPens.includes(e.pen ?? 0));
  const lastPhoto = journal.find((e) => e.photoId && e.type === "poza");
  const vets = journal.filter((e) => e.type === "veterinar").length;
  const rest = Math.max(0, order.estimate.total - advance);
  const doneSteps = steps.filter((s) => s.done).length;

  return (
    <section className="panou client-dash border-b border-[var(--pd-line)]">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
        <Breadcrumbs items={[{ label: "Comanda mea", href: "/comanda" }, { label: order.number }]} className="[&_a]:text-[var(--pd-muted)] [&_span]:text-[var(--pd-muted)]" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.25em] text-[var(--pd-muted)] uppercase">Puii mei · comanda mea</p>
            <p className="mt-1 font-mono text-3xl font-light tracking-tight text-[var(--pd-text)] sm:text-4xl">{order.number}</p>
            <p className="text-sm text-[var(--pd-muted)]">
              {order.birds} pui · ~{formatNumber(order.estimate.estimatedKg)} kg pui curățat
              {farm ? ` · ${farm.name}, ${farm.village}` : ""}
            </p>
          </div>
          <Pill tone={doneSteps === steps.length ? "green" : "gold"}>
            Pasul {Math.min(doneSteps + 1, steps.length)} din {steps.length}
          </Pill>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <AerialMap
            src="/images/panou/gospodarie-aerian.webp"
            className="min-h-[280px] sm:min-h-[360px] lg:min-h-[440px]"
            pins={
              lot
                ? spots.map((p, i) => {
                    const n = i + 1;
                    const s = starts.find((x) => x.n === n);
                    const age = s ? Math.max(0, penAgeDays(s.date)) : 0;
                    const mine = myPens.includes(n);
                    return {
                      ...p,
                      label: mine ? `Puii tăi · țarcul ${n}` : `Țarcul ${n}`,
                      note: s ? (age >= GROWTH.indoorDays ? `ziua ${age}, pe pășune` : `ziua ${age}, interior`) : "nepornit",
                      active: mine,
                    };
                  })
                : [{ x: 50, y: 55, label: "Gospodăria se alocă", note: "în curând" }]
            }
          >
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 text-xs">
              {farm && <span className="rounded-full bg-black/45 px-3 py-1 text-white backdrop-blur-md">{farm.village}, {farm.county}</span>}
              {lot && <span className="rounded-full bg-black/45 px-3 py-1 font-mono text-white backdrop-blur-md">Lot {lot.code}</span>}
              {lastMove && <span className="rounded-full bg-black/45 px-3 py-1 text-white backdrop-blur-md">Ultima mutare: {formatDate(lastMove.date)}</span>}
            </div>
          </AerialMap>

          <div className="grid content-start gap-4">
            <Glass delay={100}>
              <GlassTitle title="Creșterea puilor tăi" hint={phase} right={myPens.length ? <Pill>{myPens.length > 1 ? `țarcurile ${myPens.join(", ")}` : `țarcul ${myPens[0]}`}</Pill> : undefined} />
              <div className="mt-3">
                <Gauge percent={progress} label={myStart ? `ziua ${day}` : "—"} sub={`din ${growthDays} de zile`} />
              </div>
              {readyOn && <p className="mt-2 text-center text-xs text-[var(--pd-muted)]">Gata estimat: {formatDate(readyOn)}</p>}
            </Glass>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Metric
                delay={180}
                label="Avans (pui + furaj)"
                value={formatNumber(Math.round(advance))}
                unit="lei"
                pill={<Pill tone={advanceStatus === "primita" ? "green" : "gold"}>{advanceStatus === "primita" ? "primit" : advanceStatus === "declarata" ? "în verificare" : "de plătit"}</Pill>}
              />
              <Metric delay={240} label="Rest la livrare" value={formatNumber(Math.round(rest))} unit="lei" pill={<Pill tone="muted">estimat</Pill>} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Glass delay={300} className="lg:col-span-2">
            <GlassTitle title="Drumul comenzii" hint={`${doneSteps} din ${steps.length} pași făcuți`} />
            <ol className="mt-4 grid gap-2 sm:grid-cols-7">
              {steps.map((s, i) => (
                <li key={s.label} className="flex items-start gap-2 sm:flex-col sm:items-center sm:text-center">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      s.done ? "bg-[var(--pd-green)] text-white" : i === doneSteps ? "bg-[var(--pd-gold)] text-[#1b2a1d]" : "bg-[var(--pd-track)] text-[var(--pd-muted)]",
                    )}
                  >
                    {s.done ? "✓" : i + 1}
                  </span>
                  <span className={cn("text-xs leading-tight", s.done || i === doneSteps ? "text-[var(--pd-text)]" : "text-[var(--pd-muted)]")}>
                    {s.label}
                    {s.note && <span className="block text-[10px] text-[var(--pd-muted)]">{s.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Glass>
          <Glass delay={360}>
            <GlassTitle title="Poza săptămânii" hint={lastPhoto ? formatDate(lastPhoto.date) : "Gospodarul trimite o poză la 7 zile"} right={vets ? <Pill tone="green">{vets} vizite vet.</Pill> : undefined} />
            {lastPhoto ? (
              <a href={`/foto/${lastPhoto.photoId}?o=${token}`} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/foto/${lastPhoto.photoId}?o=${token}`} alt="Puii din lotul tău" className="h-40 w-full rounded-xl object-cover" />
              </a>
            ) : (
              <p className="mt-3 rounded-xl bg-[var(--pd-track)] p-6 text-center text-sm text-[var(--pd-muted)]">Prima poză apare după pornirea țarcului.</p>
            )}
            {journal.length > 0 && <a href="#jurnal" className="mt-3 inline-block text-sm text-[var(--pd-gold)] underline">Tot jurnalul de creștere ↓</a>}
          </Glass>
        </div>
      </div>
    </section>
  );
}
