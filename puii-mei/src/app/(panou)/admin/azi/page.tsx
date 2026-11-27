import type { Metadata } from "next";
import Link from "next/link";
import { adminToday, type TodayItem } from "@/server/admin-today";
import { requireUser } from "@/server/session";
import { formatLei } from "@/lib/format";
import { statusLabels } from "@/lib/lots";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Astăzi", robots: { index: false, follow: false } };

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("font-mono text-[10px] font-medium tracking-[0.18em] text-slate-500 uppercase", className)}>{children}</p>
);

const severity: Record<TodayItem["severity"], { dot: string; label: string }> = {
  urgent: { dot: "bg-red-500", label: "Urgent" },
  atentie: { dot: "bg-lime-500", label: "Așteaptă-te pe tine" },
  info: { dot: "bg-slate-400", label: "Informare" },
};

/**
 * Admin › Astăzi: ce cere o decizie acum („Necesită atenția ta”), cifrele zilei și ce e în desfășurare. Pe telefon:
 * carduri mari, acțiunea la îndemâna degetului, bara de navigare jos (PanelShell).
 */
export default async function AdminTodayPage() {
  await requireUser(["admin"], "/admin/azi");
  const t = await adminToday();
  const date = new Date().toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Bucharest" });

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <Label>Admin · Astăzi</Label>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Astăzi</h1>
      <p className="mt-1 text-sm text-slate-500">
        <span className="capitalize">{date}</span> · {t.items.length === 0 ? "nimic nu te așteaptă" : `${t.items.length} ${t.items.length === 1 ? "lucru te așteaptă" : "lucruri te așteaptă"}`}
      </p>

      <section aria-label="Cifrele zilei" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Precomenzi noi" value={String(t.kpi.newOrders)} hint="de confirmat" accent={t.kpi.newOrders > 0} href="/admin#precomenzi" />
        <Kpi label="Precomenzi active" value={String(t.kpi.activeOrders)} hint={`${t.kpi.birds} pui · ${formatLei(t.kpi.value)}`} href="/admin#precomenzi" />
        <Kpi label="Loturi în lucru" value={String(t.kpi.activeLots)} hint="în creștere / procesare / livrare" href="/admin/loturi" />
        <Kpi label="Livrări azi" value={String(t.kpi.toursToday)} hint="ture planificate" href="/admin/livrari" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="necesita" data-today="coada">
          <div className="flex items-center gap-2">
            <h2 id="necesita" className="text-lg font-semibold">Necesită atenția ta</h2>
            <span className="rounded-full bg-lime-300 px-2 py-0.5 text-xs font-bold text-slate-900">{t.items.length}</span>
          </div>
          {t.items.length === 0 ? (
            <div className="mt-3 rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
              <p className="font-medium">Totul e la zi.</p>
              <p className="mt-1 text-sm text-slate-500">Nicio precomandă nouă, nicio cerere de cont bancar, nicio alertă.</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {t.items.map((i) => (
                <li key={i.id} data-today-item={i.kind} className="rounded-2xl bg-white ring-1 ring-slate-200">
                  <Link href={i.href} className="flex items-start gap-3 p-4 transition-colors hover:bg-slate-50 sm:items-center">
                    <span aria-hidden className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full sm:mt-0", severity[i.severity].dot)} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{i.title}</span>
                      <span className="mt-0.5 block text-sm text-slate-500">{i.detail}</span>
                      <span className="sr-only">{severity[i.severity].label}</span>
                    </span>
                    <span className="hidden shrink-0 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white sm:inline-flex">{i.action}</span>
                    <span aria-hidden className="shrink-0 self-center text-xl text-slate-400 sm:hidden">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="desfasurare">
          <h2 id="desfasurare" className="text-lg font-semibold">În desfășurare</h2>
          <div className="mt-3 rounded-2xl bg-white ring-1 ring-slate-200">
            <Label className="px-4 pt-4">Loturi</Label>
            {t.active.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">Niciun lot activ.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {t.active.slice(0, 8).map((l) => (
                  <li key={l.code}>
                    <Link href={`/admin/loturi?deschis=${encodeURIComponent(l.code)}`} className="block px-4 py-3 hover:bg-slate-50">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-sm font-semibold">{l.code}</span>
                        <span className="text-xs text-slate-500">{statusLabels[l.status]}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{l.farm} · {l.reserved}/{l.total} locuri</span>
                      {l.status === "in-crestere" && (
                        <span className="mt-2 flex items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <span className="block h-full rounded-full bg-slate-900" style={{ width: `${l.progress}%` }} />
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">ziua {l.day}/{l.days}</span>
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Label className="border-t border-slate-100 px-4 pt-4">Livrări azi</Label>
            {t.toursToday.length === 0 ? (
              <p className="px-4 pt-1 pb-4 text-sm text-slate-500">Nicio tură azi.</p>
            ) : (
              <ul className="pb-2">
                {t.toursToday.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/livrari/${r.id}`} className="flex justify-between gap-2 px-4 py-2.5 text-sm hover:bg-slate-50">
                      <span><span className="font-mono font-semibold">{r.code}</span> · {r.farm}</span>
                      <span className="text-slate-500">{r.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, accent, href }: { label: string; value: string; hint: string; accent?: boolean; href: string }) {
  return (
    <Link href={href} className={cn("rounded-2xl p-4 ring-1 transition-colors", accent ? "bg-lime-200 ring-lime-300 hover:bg-lime-300" : "bg-white ring-slate-200 hover:bg-slate-50")}>
      <Label className={accent ? "text-slate-700" : undefined}>{label}</Label>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-slate-900">{value}</p>
      <p className={cn("mt-1 truncate text-xs", accent ? "text-slate-700" : "text-slate-500")}>{hint}</p>
    </Link>
  );
}
