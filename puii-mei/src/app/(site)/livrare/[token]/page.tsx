import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import {
  ExtensionForm,
  FinishForm,
  PairForms,
  PinLoginForm,
  SetPinForm,
  StartForm,
  WaitForApproval,
} from "@/components/delivery/CourierForms";
import { TourTimeline } from "@/components/delivery/TourTimeline";
import { DELIVERY, tourDeadline, tourStatusLabels } from "@/lib/delivery";
import { googleMapsRoute } from "@/lib/route";
import { courierAuthorized, pendingRequestId } from "@/server/courier-session";
import { requestOrigin } from "@/server/delivery";
import { tourRepository } from "@/server/repositories/delivery";
import { userRepository } from "@/server/repositories/users";
import { loadTourView } from "@/server/tour-view";
import {
  extensionAction,
  finishAction,
  pairAction,
  pinLoginAction,
  requestPinAction,
  setPinAction,
  startAction,
} from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tura de livrare", robots: { index: false, follow: false } };

const time = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });

function whatsapp(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0040/, "40").replace(/^0/, "40");
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function remaining(deadline: Date | null) {
  if (!deadline) return null;
  const min = Math.round((deadline.getTime() - Date.now()) / 60000);
  return min;
}

/** Pagina turei pentru curier (acces temporar, fără cont). */
export default async function CourierTourPage({ params }: PageProps<"/livrare/[token]">) {
  const { token } = await params;
  const tour = await tourRepository.byToken(token);
  if (!tour) notFound();
  const authorized = await courierAuthorized(tour);
  const view = await loadTourView(tour);

  const header = (
    <section className="border-b border-forest-900/5 bg-cream-100">
      <Container className="max-w-2xl py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Tura de livrare</p>
        <h1 className="mt-1 font-mono text-2xl font-semibold">{tour.code}</h1>
        <p className="mt-1 text-sm text-muted">
          {view.farmName} · {tour.date} · {tour.parcelIds.length} colete · {tourStatusLabels[tour.status]}
        </p>
      </Container>
    </section>
  );

  if (tour.status === "anulata" || (tour.status === "incheiata" && !authorized)) {
    return (
      <>
        {header}
        <Container className="max-w-2xl py-8">
          <p className="rounded-3xl bg-white p-6 text-muted ring-1 ring-forest-900/10">
            Tura este {tourStatusLabels[tour.status].toLowerCase()}. Accesul temporar nu mai este activ.
          </p>
        </Container>
      </>
    );
  }

  /* ---------------- nu e autorizat pe acest telefon ---------------- */
  if (!authorized) {
    if (tour.locked) {
      return (
        <>
          {header}
          <Container className="max-w-2xl py-8">
            <p role="alert" className="rounded-3xl bg-red-50 p-6 font-semibold text-red-800">
              Accesul a fost blocat după {DELIVERY.maxPinAttempts} PIN-uri greșite. Cere gospodarului să-l deblocheze.
            </p>
          </Container>
        </>
      );
    }
    if (tour.courier?.personalPinHash) {
      return (
        <>
          {header}
          <Container className="max-w-md py-8">
            <h2 className="text-2xl font-semibold">Intră în tură</h2>
            <p className="mt-1 mb-6 text-muted">Introdu PIN-ul personal ales la ridicare.</p>
            <PinLoginForm action={pinLoginAction.bind(null, token)} />
          </Container>
        </>
      );
    }
    const rid = await pendingRequestId(tour);
    const waiting = rid && tour.pinRequest?.id === rid && tour.pinRequest.status === "asteapta";
    const farmer = (await userRepository.byFarm(tour.farmSlug)).find((u) => u.role === "gospodar" && u.status === "activ");
    const confirmLink = `${await requestOrigin()}/cont/gospodar/ture/${tour.id}?cerere=${tour.pinRequest?.id ?? ""}`;
    return (
      <>
        {header}
        <Container className="max-w-2xl py-8">
          <h2 className="text-2xl font-semibold">Ridicarea din gospodărie</h2>
          <p className="mt-1 mb-6 text-muted">
            Completează datele tale și ale mașinii, apoi introdu PIN-ul de ridicare primit de la gospodar.
          </p>
          {waiting ? (
            <div className="space-y-4">
              <WaitForApproval token={token} />
              <a
                href={whatsapp(farmer?.phone ?? "", `Bună! Sunt ${tour.pinRequest!.name}, curierul turei ${tour.code}. Te rog confirmă ridicarea: ${confirmLink}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-full bg-[#25D366] px-6 py-3 text-center font-semibold text-forest-900"
              >
                Trimite cererea gospodarului pe WhatsApp
              </a>
              <p className="text-sm text-muted">Gospodarul vede cererea și în contul lui, la tura {tour.code}.</p>
            </div>
          ) : (
            <PairForms pairAction={pairAction.bind(null, token)} requestAction={requestPinAction.bind(null, token)} />
          )}
        </Container>
      </>
    );
  }

  /* ---------------- autorizat ---------------- */
  if (!tour.courier?.personalPinHash) {
    return (
      <>
        {header}
        <Container className="max-w-md py-8">
          <h2 className="text-2xl font-semibold">Alege-ți PIN-ul personal</h2>
          <p className="mt-1 mb-6 text-muted">
            Îl folosești dacă închizi pagina: rescanezi orice cod „Curier” de pe colete și intri cu acest PIN. E valabil doar
            pentru tura aceasta.
          </p>
          <SetPinForm action={setPinAction.bind(null, token)} />
        </Container>
      </>
    );
  }

  if (tour.status === "planificata") {
    return (
      <>
        {header}
        <Container className="max-w-2xl py-8">
          <h2 className="text-2xl font-semibold">Verificarea mașinii</h2>
          <p className="mt-1 mb-6 text-muted">
            Înainte de încărcare: plăcuța, kilometrajul, temperatura compartimentului (0–4 °C pentru carne proaspătă) și
            igiena. Termenul de livrare de {tour.durationHours} ore pornește acum.
          </p>
          <StartForm action={startAction.bind(null, token)} />
        </Container>
      </>
    );
  }

  const deadline = tourDeadline(tour);
  const minutes = remaining(deadline);
  const undelivered = view.stops.filter((s) => !s.parcel.delivered).length;
  const unloaded = view.stops.filter((s) => !s.parcel.loaded).length;
  const pendingExt = tour.extensions.find((e) => e.status === "asteapta");
  const route = googleMapsRoute(
    view.start,
    view.stops.filter((s) => !s.parcel.delivered && s.preorder?.location).map((s) => s.preorder!.location!),
  );

  return (
    <>
      {header}
      <Container className="max-w-2xl space-y-6 py-6">
        {tour.status === "in-curs" && deadline && (
          <div className={`rounded-2xl p-4 ${minutes! < 0 ? "bg-red-50 text-red-900" : minutes! < 60 ? "bg-grain-300/50 text-forest-900" : "bg-forest-50 text-forest-900"}`}>
            <p className="text-sm">Termen de livrare</p>
            <p className="font-display text-2xl font-semibold">
              {minutes! < 0 ? "Termen depășit" : `${Math.floor(minutes! / 60)} h ${minutes! % 60} min rămase`}
            </p>
            <p className="text-sm">până la {time.format(deadline)}</p>
          </div>
        )}

        {tour.status === "in-curs" && unloaded > 0 && (
          <p className="rounded-2xl bg-cream-100 p-4 text-sm font-semibold text-forest-900">
            Încarcă fiecare colet: scanează codul QR „CURIER” de pe etichetă și fă cele 4 fotografii. Mai sunt {unloaded}.
          </p>
        )}
        {tour.status === "in-curs" && unloaded === 0 && undelivered > 0 && (
          <p className="rounded-2xl bg-cream-100 p-4 text-sm font-semibold text-forest-900">
            La fiecare client: scanează codul „CURIER” de pe colet, apoi bifează predarea cu temperatura și semnătura.
          </p>
        )}

        {route && tour.status === "in-curs" && (
          <a href={route} target="_blank" rel="noopener noreferrer" className="block rounded-full bg-forest-700 px-6 py-3 text-center font-semibold text-white">
            Deschide traseul în Google Maps
          </a>
        )}

        <div className="rounded-3xl bg-white p-5 ring-1 ring-forest-900/10">
          <TourTimeline tour={tour} stops={view.stops} start={view.start} farmName={view.farmName} variant="curier" />
        </div>

        {tour.status === "in-curs" && (
          <>
            <details className="rounded-3xl bg-white p-5 ring-1 ring-forest-900/10" open={minutes !== null && minutes < 0}>
              <summary className="cursor-pointer font-semibold text-forest-900">
                {pendingExt ? "Cerere de prelungire trimisă – așteaptă decizia" : "Am nevoie de mai mult timp"}
              </summary>
              <div className="mt-4">
                {pendingExt ? (
                  <p className="text-sm text-muted">Motiv: {pendingExt.reason}. Administratorul decide în curând.</p>
                ) : (
                  <ExtensionForm action={extensionAction.bind(null, token)} />
                )}
              </div>
            </details>
            <details className="rounded-3xl bg-white p-5 ring-1 ring-forest-900/10" open={undelivered === 0}>
              <summary className="cursor-pointer font-semibold text-forest-900">Închei tura</summary>
              <div className="mt-4">
                <FinishForm action={finishAction.bind(null, token)} undelivered={undelivered} />
              </div>
            </details>
          </>
        )}
        {tour.status === "incheiata" && (
          <p role="status" className="rounded-3xl bg-forest-50 p-5 font-semibold text-forest-800">
            Tura s-a încheiat. Mulțumim! Accesul temporar se închide.
          </p>
        )}
      </Container>
    </>
  );
}
