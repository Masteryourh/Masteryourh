import Link from "next/link";
import { cn } from "@/lib/cn";
import type { TodayItem } from "@/lib/today";

const severity: Record<TodayItem["severity"], { dot: string; label: string }> = {
  urgent: { dot: "bg-red-500", label: "Urgent" },
  atentie: { dot: "bg-lime-500", label: "Așteaptă-te pe tine" },
  info: { dot: "bg-slate-400", label: "Informare" },
};

/** Coada „ce e de făcut” (Admin › Astăzi, gospodar): carduri mari, acțiunea la îndemâna degetului pe telefon. */
export function TodayQueue({ title, items, empty, emptyHint }: { title: string; items: TodayItem[]; empty: string; emptyHint: string }) {
  return (
    <section aria-labelledby="necesita" data-today="coada">
      <div className="flex items-center gap-2">
        <h2 id="necesita" className="text-lg font-semibold">{title}</h2>
        <span className="rounded-full bg-lime-300 px-2 py-0.5 text-xs font-bold text-slate-900">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <p className="font-medium">{empty}</p>
          <p className="mt-1 text-sm text-slate-500">{emptyHint}</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((i) => (
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
  );
}
