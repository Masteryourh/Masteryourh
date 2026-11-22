import type { GrowthEntry } from "@/lib/growth-log";
import { growthEntryLabels } from "@/lib/growth-log";
import { formatDate } from "@/lib/format";

/** Jurnalul de creștere (cele mai noi sus), cu pozele. `photoQuery` dă acces la poze (ex. „?o=<cod comandă>”). */
export function GrowthTimeline({ entries, photoQuery = "", limit = 60 }: { entries: GrowthEntry[]; photoQuery?: string; limit?: number }) {
  if (!entries.length) return <p className="text-sm text-slate-500">Încă nimic notat în jurnal.</p>;
  return (
    <ol className="space-y-2">
      {entries.slice(0, limit).map((e) => (
        <li key={e.id} className="flex gap-3 rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
          {e.photoId && (
            <a href={`/foto/${e.photoId}${photoQuery}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/foto/${e.photoId}${photoQuery}`} alt={growthEntryLabels[e.type]} className="h-16 w-16 rounded-md object-cover" loading="lazy" />
            </a>
          )}
          <div className="min-w-0">
            <p className="font-semibold">
              {growthEntryLabels[e.type]}
              {e.pen ? ` · țarcul ${e.pen}` : ""}
              {e.count ? ` · ${e.count} pui` : ""}
            </p>
            <p className="text-xs text-slate-500">
              {formatDate(e.date)} · {e.by}
              {e.vetName ? ` · dr. ${e.vetName}` : ""}
              {e.lat ? " · GPS ✓" : ""}
            </p>
            {e.note && <p className="mt-1 text-slate-700">{e.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
