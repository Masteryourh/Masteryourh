import Link from "next/link";
import type { Tour, User } from "@/lib/domain";
import { DELIVERY, tourDeadline, tourStatusLabels } from "@/lib/delivery";
import { googleMapsRoute } from "@/lib/route";
import { TourTimeline } from "./TourTimeline";
import { SendPinWhatsApp } from "./FarmerTourTools";
import { TourMap } from "@/components/maps/TourMap";
import {
  cancelTourAction,
  courierAccessAction,
  extensionDecisionAction,
  pinRequestAction,
  routeAction,
} from "@/app/(panou)/cont/gospodar/livrari-actions";
import { courierTourUrl, requestOrigin } from "@/server/delivery";
import { eventRepository } from "@/server/repositories/delivery";
import { loadTourView } from "@/server/tour-view";

const time = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });

const btn = "rounded-full px-4 py-2 text-sm font-semibold";

/** Detaliul unei ture, comun pentru gospodar și admin. */
export async function TourDetail({ tour, user, highlightRequest, space = "household" }: { tour: Tour; user: User; highlightRequest?: string; /** Spațiul paginii (linkurile rămân în el, SC-049). */ space?: "admin" | "household" }) {
  const [view, events, origin] = await Promise.all([loadTourView(tour), eventRepository.forTour(tour.id), requestOrigin()]);
  const link = courierTourUrl(origin, tour);
  const deadline = tourDeadline(tour);
  const pendingReq = tour.pinRequest?.status === "asteapta" ? tour.pinRequest : null;
  const mapStops = view.stops.filter((s) => s.preorder?.location).map((s) => ({ point: s.preorder!.location!, done: Boolean(s.parcel.delivered) }));
  const route = googleMapsRoute(view.start, mapStops.map((s) => s.point));
  const kmDone = tour.finish && tour.start ? tour.finish.odometer - tour.start.odometer : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Tură de livrare</p>
          <h1 className="mt-1 font-mono text-3xl font-semibold">{tour.code}</h1>
          <p className="mt-1 text-muted">
            {view.farmName} · {tour.date} · {tour.parcelIds.length} colete · <strong>{tourStatusLabels[tour.status]}</strong>
            {deadline && tour.status === "in-curs" ? ` · termen ${time.format(deadline)}` : ""}
            {kmDone !== null ? ` · ${kmDone} km` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={space === "admin" ? `/admin/livrari/etichete?tura=${tour.id}&inapoi=${encodeURIComponent(`/admin/livrari/${tour.id}`)}` : `/cont/gospodar/etichete?tura=${tour.id}`} className={`${btn} ring-1 ring-forest-900/15`}>Etichetele turei</Link>
          {tour.status === "planificata" && (
            <form action={cancelTourAction}>
              <input type="hidden" name="tourId" value={tour.id} />
              <button className={`${btn} text-red-800 ring-1 ring-red-200`}>Anulează tura</button>
            </form>
          )}
        </div>
      </div>

      {pendingReq && (
        <div role="alert" className={`rounded-3xl p-5 ${highlightRequest === pendingReq.id ? "bg-grain-300/70 ring-4 ring-grain-400" : "bg-grain-300/40"}`}>
          <p className="text-lg font-semibold text-forest-900">Curierul cere confirmarea ridicării</p>
          <p className="mt-1 text-sm text-forest-900">
            {pendingReq.name} · {pendingReq.phone} · {pendingReq.vehicleType}, {pendingReq.plate} · ATP {pendingReq.atp} · {time.format(new Date(pendingReq.at))}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={pinRequestAction}>
              <input type="hidden" name="tourId" value={tour.id} />
              <input type="hidden" name="requestId" value={pendingReq.id} />
              <input type="hidden" name="decision" value="confirm" />
              <button className={`${btn} bg-forest-700 text-white`}>Confirm ridicarea</button>
            </form>
            <form action={pinRequestAction}>
              <input type="hidden" name="tourId" value={tour.id} />
              <input type="hidden" name="requestId" value={pendingReq.id} />
              <input type="hidden" name="decision" value="respinge" />
              <button className={`${btn} ring-1 ring-forest-900/20`}>Respinge</button>
            </form>
          </div>
        </div>
      )}

      {/* Accesul curierului */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-forest-900 p-5 text-cream-50">
          <p className="text-sm text-cream-100/70">PIN de ridicare</p>
          <p className="mt-1 font-mono text-4xl font-bold tracking-[0.4em]">{tour.pickupPinUsed ? "••••" : tour.pickupPin}</p>
          <p className="mt-2 text-sm text-cream-100/80">
            {tour.pickupPinUsed
              ? `Folosit la împerechere${tour.courier ? `, ${time.format(new Date(tour.courier.pairedAt))}` : ""}.`
              : "Îl dai personal șoferului la ridicare sau îl trimiți pe WhatsApp. Se folosește o singură dată."}
          </p>
          {!tour.pickupPinUsed && tour.status !== "incheiata" && tour.status !== "anulata" && (
            <div className="mt-4 rounded-2xl bg-white p-3 text-ink">
              <SendPinWhatsApp tourCode={tour.code} pin={tour.pickupPin} link={link} />
            </div>
          )}
        </div>
        <div className="rounded-3xl bg-white p-5 ring-1 ring-forest-900/10">
          <p className="font-semibold text-forest-900">Curier</p>
          {tour.courier ? (
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-muted">Șofer</dt><dd className="font-medium">{tour.courier.name}</dd></div>
              <div><dt className="text-muted">Telefon</dt><dd className="font-medium">{tour.courier.phone}</dd></div>
              <div><dt className="text-muted">Mașina</dt><dd className="font-medium">{tour.courier.plate} · {tour.courier.vehicleType}</dd></div>
              <div><dt className="text-muted">Certificat ATP</dt><dd className="font-medium">{tour.courier.atp}</dd></div>
              <div><dt className="text-muted">Împerecheat</dt><dd className="font-medium">{tour.courier.pairedBy === "pin" ? "cu PIN" : "prin confirmare"}</dd></div>
              <div><dt className="text-muted">PIN personal</dt><dd className="font-medium">{tour.courier.personalPinHash ? "setat" : "nesetat"}</dd></div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-muted">Niciun curier încă. Linkul turei pentru șofer:</p>
          )}
          <p className="mt-3 break-all rounded-xl bg-cream-100 p-2 font-mono text-xs">{link}</p>
          {tour.locked && <p className="mt-3 rounded-xl bg-red-50 p-2 text-sm font-semibold text-red-800">Acces blocat după {DELIVERY.maxPinAttempts} PIN-uri greșite.</p>}
          {tour.status !== "incheiata" && tour.status !== "anulata" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tour.locked && (
                <form action={courierAccessAction}>
                  <input type="hidden" name="tourId" value={tour.id} />
                  <input type="hidden" name="mode" value="deblocare" />
                  <button className={`${btn} bg-forest-700 text-white`}>Deblochează</button>
                </form>
              )}
              {tour.courier && (
                <form action={courierAccessAction}>
                  <input type="hidden" name="tourId" value={tour.id} />
                  <input type="hidden" name="mode" value="resetare" />
                  <button className={`${btn} ring-1 ring-forest-900/20`}>Resetează accesul (PIN nou)</button>
                </form>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Prelungiri */}
      {tour.extensions.length > 0 && (
        <section id="prelungiri" className="scroll-mt-6">
          <h2 className="text-xl font-semibold">Cereri de prelungire</h2>
          <ul className="mt-3 space-y-3">
            {tour.extensions.map((e) => (
              <li key={e.id} className="rounded-3xl bg-white p-5 ring-1 ring-forest-900/10">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold">{e.reason}</p>
                  <span className="text-sm text-muted">{time.format(new Date(e.at))}{e.lat ? " · GPS" : ""}</span>
                </div>
                <p className="mt-1 text-sm">{e.description}</p>
                <a href={`/foto/${e.photoId}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-forest-700 underline">Vezi dovada foto</a>
                {e.status === "asteapta" ? (
                  user.role === "admin" ? (
                    <form action={extensionDecisionAction} className="mt-3 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="tourId" value={tour.id} />
                      <input type="hidden" name="extId" value={e.id} />
                      <label className="text-sm">
                        <span className="block font-semibold">Ore</span>
                        <input name="hours" type="number" min={1} max={12} defaultValue={2} className="w-20 rounded-lg border border-forest-900/15 px-2 py-1" />
                      </label>
                      <label className="min-w-40 flex-1 text-sm">
                        <span className="block font-semibold">Comentariu</span>
                        <input name="comment" className="w-full rounded-lg border border-forest-900/15 px-2 py-1" />
                      </label>
                      <button name="decision" value="aproba" className={`${btn} bg-forest-700 text-white`}>Aprobă</button>
                      <button name="decision" value="respinge" className={`${btn} ring-1 ring-forest-900/20`}>Respinge</button>
                    </form>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-grain-600">Așteaptă decizia administratorului.</p>
                  )
                ) : (
                  <p className="mt-2 text-sm">
                    {e.status === "aprobata" ? `Aprobată: +${e.hours} ore` : "Respinsă"} de {e.decidedBy}
                    {e.comment ? ` – ${e.comment}` : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Traseu */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Traseu și cronologie</h2>
            {tour.status === "planificata" && (
              <form action={routeAction}>
                <input type="hidden" name="tourId" value={tour.id} />
                <input type="hidden" name="how" value="optim" />
                <button className={`${btn} bg-grain-400 text-forest-900`}>Generează traseul optim</button>
              </form>
            )}
          </div>
          <div className="mt-4 rounded-3xl bg-white p-5 ring-1 ring-forest-900/10">
            <TourTimeline tour={tour} stops={view.stops} start={view.start} farmName={view.farmName} variant={user.role === "admin" ? "admin" : "gospodar"} />
          </div>
          {tour.status === "planificata" && view.stops.length > 1 && (
            <div className="mt-3 rounded-3xl bg-cream-100 p-4">
              <p className="text-sm font-semibold">Schimbă ordinea manual</p>
              <ul className="mt-2 space-y-1.5">
                {view.stops.map((s, i) => (
                  <li key={s.parcel.id} className="flex items-center gap-2 text-sm">
                    <span className="w-6 font-semibold">{i + 1}.</span>
                    <span className="flex-1 truncate">{s.preorder?.customer.name} · {s.parcel.preorderNumber}</span>
                    {(["sus", "jos"] as const).map((dir) => (
                      <form key={dir} action={routeAction}>
                        <input type="hidden" name="tourId" value={tour.id} />
                        <input type="hidden" name="parcelId" value={s.parcel.id} />
                        <input type="hidden" name="how" value={dir} />
                        <button
                          aria-label={`Mută ${dir}`}
                          disabled={(dir === "sus" && i === 0) || (dir === "jos" && i === view.stops.length - 1)}
                          className="h-8 w-8 rounded-full bg-white ring-1 ring-forest-900/15 disabled:opacity-30"
                        >
                          {dir === "sus" ? "↑" : "↓"}
                        </button>
                      </form>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div>
          {mapStops.length > 0 ? <TourMap start={view.start} stops={mapStops} /> : <p className="text-sm text-muted">Clienții nu au pin pe hartă.</p>}
          {route && <a href={route} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-forest-700 underline">Deschide traseul în Google Maps</a>}
          {tour.start && (
            <dl className="mt-4 grid grid-cols-2 gap-2 rounded-3xl bg-white p-4 text-sm ring-1 ring-forest-900/10">
              <div><dt className="text-muted">Pornire</dt><dd className="font-medium">{time.format(new Date(tour.start.at))}</dd></div>
              <div><dt className="text-muted">Km pornire</dt><dd className="font-medium">{tour.start.odometer}</dd></div>
              <div><dt className="text-muted">Compartiment</dt><dd className="font-medium">{tour.start.compartmentTemp} °C</dd></div>
              <div><dt className="text-muted">Igienă</dt><dd className="font-medium">{tour.start.hygieneOk ? "Conformă" : "Neconformă"}</dd></div>
              <div className="col-span-2 flex flex-wrap gap-3">
                {[["Plăcuța", tour.start.platePhotoId], ["Bord", tour.start.odometerPhotoId], ["Termometru", tour.start.tempPhotoId], ...(tour.finish ? [["Bord final", tour.finish.odometerPhotoId]] : [])].map(([l, id]) => (
                  <a key={id} href={`/foto/${id}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-700 underline">{l}</a>
                ))}
              </div>
            </dl>
          )}
        </div>
      </section>

      {/* Jurnal */}
      <section>
        <h2 className="text-xl font-semibold">Jurnalul turei</h2>
        <p className="mt-1 text-sm text-muted">Înregistrare completă, nemodificabilă, a tuturor acțiunilor.</p>
        <ol className="mt-3 divide-y divide-forest-900/5 rounded-3xl bg-white ring-1 ring-forest-900/10">
          {events.map((e) => (
            <li key={e.id} className={`flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-sm ${e.alert ? "bg-red-50" : ""}`}>
              <span className="w-28 shrink-0 tabular-nums text-muted">{time.format(new Date(e.at))}</span>
              <span className="w-40 shrink-0 font-medium">{e.actor}</span>
              <span className={`min-w-0 flex-1 ${e.alert ? "font-semibold text-red-800" : ""}`}>{e.message}</span>
              {e.lat !== undefined && e.lng !== undefined && (
                <a href={`https://www.google.com/maps?q=${e.lat},${e.lng}`} target="_blank" rel="noopener noreferrer" className="text-forest-700 underline">GPS</a>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
