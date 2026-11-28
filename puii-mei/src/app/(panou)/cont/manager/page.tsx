import type { Metadata } from "next";
import { requireUser } from "@/server/session";
import { communesFor, farmsInScope } from "@/server/territory";
import { farmerDayItems } from "@/server/farmer-day";
import { lotRepository } from "@/server/repositories/catalog";
import { userRepository } from "@/server/repositories/users";
import { growthProgress, lotDay, lotStatus, statusLabels } from "@/lib/lots";
import type { TodayItem } from "@/lib/today";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Astăzi în teritoriu", robots: { index: false, follow: false } };

const dot: Record<TodayItem["severity"], string> = { urgent: "bg-red-500", atentie: "bg-lime-500", info: "bg-slate-400" };
const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("font-mono text-[10px] font-medium tracking-[0.18em] text-slate-500 uppercase", className)}>{children}</p>
);

/**
 * Managerul local (o comună) / zonal (mai multe comune): gospodăriile din teritoriu, lotul fiecăreia și ce are de
 * făcut azi gospodarul. Doar vizualizare: deciziile rămân la gospodar și la admin.
 */
export default async function ManagerTodayPage() {
  const user = await requireUser(["manager-local", "manager-zonal"], "/cont/manager");
  const [communes, farms] = await Promise.all([communesFor(user), farmsInScope(user)]);
  const rows = await Promise.all(
    farms.map(async (f) => {
      const [lots, items, people] = await Promise.all([lotRepository.byFarm(f.slug, { all: true }), farmerDayItems(f.slug), userRepository.byFarm(f.slug)]);
      const current = lots.find((l) => lotStatus(l) !== "livrat") ?? null;
      return { farm: f, lot: current, items, farmer: people.find((u) => u.role === "gospodar") ?? null };
    }),
  );
  const populated = rows.filter((r) => r.lot);
  const birds = populated.reduce((s, r) => s + (r.lot?.reservedBirds ?? 0), 0);
  const urgent = rows.reduce((s, r) => s + r.items.filter((i) => i.severity === "urgent").length, 0);
  const date = new Date().toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Bucharest" });

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <Label>{user.role === "manager-zonal" ? "Manager zonal" : "Manager local"} · {communes.join(", ") || "fără comune"}</Label>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Astăzi în teritoriu</h1>
      <p className="mt-1 text-sm text-slate-500"><span className="capitalize">{date}</span> · doar vizualizare</p>

      <section aria-label="Cifrele teritoriului" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Gospodării" value={String(rows.length)} hint={`${populated.length} cu lot, ${rows.length - populated.length} disponibile`} />
        <Kpi label="Pui în loturi" value={String(birds)} hint="rezervați prin precomenzi" />
        <Kpi label="Comune" value={String(communes.length)} hint={communes.join(", ")} />
        <Kpi label="Urgente azi" value={String(urgent)} hint="la gospodari" accent={urgent > 0} />
      </section>

      {communes.map((c) => (
        <section key={c} aria-label={`Comuna ${c}`} data-comuna={c} className="mt-8">
          <h2 className="text-lg font-semibold">Comuna {c}</h2>
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {rows
              .filter((r) => r.farm.commune === c)
              .map(({ farm, lot, items, farmer }) => (
                <li key={farm.slug} data-gospodarie={farm.slug} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{farm.name}</p>
                      <p className="text-xs text-slate-500">{farmer ? `${farmer.name} · ${farmer.phone}` : farm.owner} · {farm.village}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", lot ? "bg-slate-900 text-white" : "bg-lime-200 text-slate-900")}>
                      {lot ? statusLabels[lotStatus(lot)] : "Disponibilă"}
                    </span>
                  </div>
                  {lot ? (
                    <div className="mt-3">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-mono font-semibold">{lot.code}</span>
                        <span className="text-slate-500">{lot.reservedBirds}/{lot.totalBirds} pui</span>
                      </div>
                      {lotStatus(lot) === "in-crestere" ? (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <span className="block h-full rounded-full bg-slate-900" style={{ width: `${growthProgress(lot)}%` }} />
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">ziua {Math.max(0, lotDay(lot))}/{lot.growthDays}</span>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">Pornire: {lot.startDate}</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Fără lot în lucru. Poate primi un lot nou.</p>
                  )}
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <Label>De făcut azi la gospodar · {items.length}</Label>
                    {items.length === 0 ? (
                      <p className="mt-1 text-sm text-slate-500">Totul e la zi.</p>
                    ) : (
                      <ul className="mt-1.5 space-y-1">
                        {items.slice(0, 4).map((i) => (
                          <li key={i.id} className="flex items-start gap-2 text-sm">
                            <span aria-hidden className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot[i.severity])} />
                            <span>{i.title}</span>
                          </li>
                        ))}
                        {items.length > 4 && <li className="text-xs text-slate-500">și încă {items.length - 4}</li>}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl p-4 ring-1", accent ? "bg-lime-200 ring-lime-300" : "bg-white ring-slate-200")}>
      <Label className={accent ? "text-slate-700" : undefined}>{label}</Label>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-slate-900">{value}</p>
      <p className={cn("mt-1 truncate text-xs", accent ? "text-slate-700" : "text-slate-500")}>{hint}</p>
    </div>
  );
}
