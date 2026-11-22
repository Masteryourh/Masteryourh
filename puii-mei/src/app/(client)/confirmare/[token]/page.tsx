import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { ConfirmationForm } from "@/components/forms/ConfirmationForm";
import { PhotoCompare } from "@/components/delivery/PhotoCompare";
import { DELIVERY, confirmationOpen, ratingState } from "@/lib/delivery";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";
import { farmRepository } from "@/server/repositories/catalog";
import { parcelRepository, tourRepository } from "@/server/repositories/delivery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comanda ta", robots: { index: false, follow: false } };

const time = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });

/** Deschisă din codul QR „CLIENT” de pe colet: urmărire, confirmare, satisfacție. */
export default async function ClientParcelPage({ params }: PageProps<"/confirmare/[token]">) {
  const { token } = await params;
  const parcel = await parcelRepository.byClientToken(token);
  if (!parcel) {
    const replaced = await parcelRepository.replacedBy(token);
    if (!replaced) notFound();
    return (
      <Container className="max-w-md py-12">
        <p className="rounded-3xl bg-cream-100 p-6 font-semibold">
          Eticheta comenzii {replaced.preorderNumber} a fost înlocuită. Folosește codul „CLIENT” de pe eticheta nouă a coletului.
        </p>
      </Container>
    );
  }
  const [tour, farm] = await Promise.all([
    parcel.tourId ? tourRepository.byId(parcel.tourId) : null,
    farmRepository.bySlug(parcel.farmSlug, { includeInactive: true }),
  ]);
  const activeTour = tour && tour.status !== "anulata" ? tour : null;
  const delivered = activeTour ? (await Promise.all(activeTour.parcelIds.map((id) => parcelRepository.byId(id)))).filter((p) => p?.delivered).length : 0;
  const position = activeTour ? activeTour.parcelIds.indexOf(parcel.id) + 1 : 0;
  const open = confirmationOpen(parcel);

  return (
    <>
      <section className="border-b border-forest-900/5 bg-cream-100">
        <Container className="max-w-3xl py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Comanda ta</p>
          <h1 className="mt-2 font-mono text-3xl font-semibold">{parcel.preorderNumber}</h1>
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
            <div><dt className="text-muted">Pui</dt><dd className="font-semibold">{parcel.birds}</dd></div>
            <div><dt className="text-muted">Gospodăria</dt><dd className="font-semibold">{farm ? `${farm.name}, ${farm.village}` : "—"}</dd></div>
            <div><dt className="text-muted">Lot · consum până la</dt><dd className="font-semibold">{parcel.lotCode} · {formatDate(parcel.expiresOn)}</dd></div>
          </dl>
        </Container>
      </section>

      <Container className="max-w-3xl space-y-8 py-10">
        {/* Urmărirea turei (semi-live: la fiecare livrare încheiată) */}
        {!parcel.delivered && (
          <div className="rounded-3xl bg-white p-6 ring-1 ring-forest-900/10">
            <h2 className="text-2xl font-semibold">Unde este comanda</h2>
            {!activeTour && <p className="mt-2 text-muted">Comanda e pregătită. Te anunțăm când pleacă spre tine.</p>}
            {activeTour?.status === "planificata" && <p className="mt-2 text-muted">Livrarea e planificată pentru {formatDate(activeTour.date)}. Ești oprirea {position} din {activeTour.parcelIds.length}.</p>}
            {activeTour?.status === "in-curs" && (
              <>
                <p className="mt-2 text-lg">
                  Curierul a predat <strong>{delivered} din {activeTour.parcelIds.length}</strong> colete. Ești oprirea{" "}
                  <strong>{position}</strong>.
                </p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-forest-50">
                  <div className="h-full rounded-full bg-forest-500" style={{ width: `${(delivered / activeTour.parcelIds.length) * 100}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted">Se actualizează la fiecare livrare încheiată. Reîncarcă pagina.</p>
              </>
            )}
            {parcel.loaded && (
              <div className="mt-6">
                <p className="text-sm text-muted">
                  Încărcat la ridicare: {time.format(new Date(parcel.loaded.at))}, temperatura mărfii {parcel.loaded.temp} °C
                </p>
                <div className="mt-3">
                  <PhotoCompare loadIds={parcel.loaded.photoIds} clientToken={token} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirmarea primirii */}
        {parcel.delivered && open && (
          <>
            <p className="rounded-2xl bg-forest-50 p-4 text-sm leading-relaxed text-forest-800">
              Predat la {time.format(new Date(parcel.delivered.at))} ({parcel.delivered.temp} °C). Verifică pachetul,
              bifează lista și fotografiază coletul din aceleași 4 laturi ca la ridicare. Confirmarea e deschisă{" "}
              {DELIVERY.confirmationHours} ore, până la <strong>{time.format(new Date(parcel.confirmationDeadline!))}</strong>.
            </p>
            <ConfirmationForm token={token} birdsOrdered={parcel.birds} />
          </>
        )}

        {parcel.submittedAt && parcel.answers && (
          <div className="rounded-3xl bg-white p-6 ring-1 ring-forest-900/10">
            <p className="flex items-center gap-2 text-xl font-semibold text-forest-900">
              <Icon name="check" className="h-6 w-6" /> Confirmare trimisă pe {time.format(new Date(parcel.submittedAt))}
            </p>
            <p className="mt-1 text-sm text-muted">
              {parcel.answers.conditionOk ? "Primit în condițiile promise." : "Ai semnalat o problemă. Te contactăm pentru rezolvare."} Confirmarea nu
              mai poate fi modificată.
            </p>
            {parcel.answers.problem && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-900">{parcel.answers.problem}</p>}
            <h3 className="mt-6 font-sans text-base font-semibold">Fotografiile coletului</h3>
            <div className="mt-3">
              <PhotoCompare loadIds={parcel.loaded?.photoIds} clientIds={parcel.answers.photoIds} clientToken={token} />
            </div>
            {ratingState(parcel) === "asteapta" && (
              <ButtonLink href={`/evaluare/${parcel.ratingToken}`} className="mt-6">Notează experiența</ButtonLink>
            )}
          </div>
        )}

        {parcel.delivered && !open && !parcel.submittedAt && (
          <div className="rounded-3xl bg-white p-6 ring-1 ring-forest-900/10">
            <h2 className="text-2xl font-semibold">Termenul de confirmare a expirat</h2>
            <p className="mt-2 text-muted">
              Pentru orice problemă cu comanda, scrie-ne la{" "}
              <a href={`mailto:${site.company.email}`} className="font-semibold text-forest-700 underline">{site.company.email}</a>.
            </p>
          </div>
        )}
      </Container>
    </>
  );
}
