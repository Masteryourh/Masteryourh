import type { GeoPoint, Parcel, Preorder, Tour } from "@/lib/domain";
import { parcelStage, parcelStageLabels, tempOk } from "@/lib/delivery";
import { estimateTimes } from "@/lib/route";
import { cn } from "@/lib/cn";

const time = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });

export interface Stop {
  parcel: Parcel;
  preorder: Preorder | null;
}

/**
 * Cronologia turei: ridicarea, apoi opririle în ordine. Se completează la
 * fiecare livrare încheiată (semi-live). `variant` controlează ce vede fiecare.
 */
export function TourTimeline({
  tour,
  stops,
  start,
  farmName,
  variant,
}: {
  tour: Tour;
  stops: Stop[];
  start: GeoPoint;
  farmName: string;
  variant: "curier" | "gospodar" | "admin";
}) {
  const pts = stops.map((s) => s.preorder?.location ?? null);
  const departure = tour.start ? new Date(tour.start.at) : new Date(`${tour.date}T08:00:00`);
  const known = stops.filter((_, i) => pts[i]);
  const etas = estimateTimes(start, known.map((s) => s.preorder!.location!), departure);
  const etaFor = new Map(known.map((s, i) => [s.parcel.id, etas[i]]));
  const loadedAll = stops.every((s) => s.parcel.loaded);

  return (
    <ol className="relative space-y-0">
      <Item
        done={Boolean(tour.start && loadedAll)}
        current={tour.status === "in-curs" && !loadedAll}
        title={`Ridicare – ${farmName}`}
        subtitle={
          tour.start
            ? `Pornire ${time.format(new Date(tour.start.at))} · ${stops.filter((s) => s.parcel.loaded).length}/${stops.length} colete încărcate · compartiment ${tour.start.compartmentTemp} °C`
            : `Planificată ${tour.date}`
        }
        alert={tour.start ? !tempOk(tour.start.compartmentTemp) : false}
      />
      {stops.map((s, i) => {
        const stage = parcelStage(s.parcel);
        const eta = etaFor.get(s.parcel.id);
        const d = s.parcel.delivered;
        const shownName = s.preorder?.customer.name ?? "Client";
        return (
          <Item
            key={s.parcel.id}
            n={i + 1}
            done={Boolean(d)}
            current={tour.status === "in-curs" && loadedAll && !d && stops.slice(0, i).every((x) => x.parcel.delivered)}
            title={`${shownName} · ${s.parcel.birds} pui · ${s.parcel.preorderNumber}`}
            subtitle={[
              d ? `Predat ${time.format(new Date(d.at))} · ${d.temp} °C${d.lat ? " · GPS" : ""}` : parcelStageLabels[stage],
              !d && eta ? `estimat ${time.format(eta.eta)} (${Math.round(eta.km)} km)` : null,
              !pts[i] ? "fără pin pe hartă" : null,
              s.preorder?.address || null,
            ]
              .filter(Boolean)
              .join(" · ")}
            alert={Boolean(d && !tempOk(d.temp)) || stage === "problema" || !pts[i]}
            nav={variant === "curier" && pts[i] ? `https://www.google.com/maps/dir/?api=1&destination=${pts[i]!.lat},${pts[i]!.lng}&travelmode=driving` : undefined}
            phone={variant === "curier" ? s.preorder?.customer.phone : undefined}
            note={s.preorder?.addressNote}
          />
        );
      })}
    </ol>
  );
}

function Item({
  n,
  title,
  subtitle,
  done,
  current,
  alert,
  nav,
  phone,
  note,
}: {
  n?: number;
  title: string;
  subtitle: string;
  done: boolean;
  current: boolean;
  alert?: boolean;
  nav?: string;
  phone?: string;
  note?: string;
}) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      <span className="absolute top-9 left-[17px] h-[calc(100%-2.25rem)] w-0.5 bg-forest-900/10 last:hidden" aria-hidden />
      <span
        className={cn(
          "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
          done && "border-forest-500 bg-forest-500 text-white",
          current && !done && "border-grain-500 bg-grain-300 text-forest-900 ring-4 ring-grain-300/40",
          !done && !current && "border-forest-900/15 bg-white text-muted",
        )}
      >
        {done ? "✓" : (n ?? "R")}
      </span>
      <div className="min-w-0 pt-1">
        <p className={cn("font-semibold", done || current ? "text-forest-900" : "text-muted")}>{title}</p>
        <p className={cn("mt-0.5 text-sm", alert ? "font-semibold text-red-700" : "text-muted")}>{subtitle}</p>
        {note && <p className="mt-0.5 text-sm italic text-muted">„{note}”</p>}
        {(nav || phone) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {nav && (
              <a href={nav} target="_blank" rel="noopener noreferrer" className="rounded-full bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white">
                Navighează
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="rounded-full px-3 py-1.5 text-xs font-semibold text-forest-800 ring-1 ring-forest-900/15">
                Sună clientul
              </a>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
