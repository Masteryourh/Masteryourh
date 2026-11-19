import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { ConfirmationForm } from "@/components/forms/ConfirmationForm";
import { CONFIRMATION_WINDOW_HOURS, confirmationState, ratingTargets } from "@/lib/confirmation";
import { site } from "@/lib/site";
import { confirmationRepository } from "@/server/repositories/confirmations";
import { farmRepository } from "@/server/repositories/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Confirmarea primirii comenzii",
  robots: { index: false, follow: false },
};

const dateTime = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Bucharest",
});

export default async function ConfirmationPage({ params }: PageProps<"/confirmare/[token]">) {
  const { token } = await params;
  const confirmation = await confirmationRepository.byToken(token);
  if (!confirmation) notFound();

  if (!confirmation.firstOpenedAt) {
    await confirmationRepository.update(confirmation.id, { firstOpenedAt: new Date().toISOString() });
  }
  const state = confirmationState(confirmation);
  const farm = confirmation.farmSlug ? await farmRepository.bySlug(confirmation.farmSlug, { includeInactive: true }) : null;

  return (
    <>
      <section className="border-b border-forest-900/5 bg-cream-100">
        <Container className="max-w-3xl py-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Confirmarea primirii</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Comanda <span className="font-mono">{confirmation.preorderNumber}</span>
          </h1>
          <dl className="mt-5 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Pui comandați</dt>
              <dd className="font-semibold">{confirmation.birdsOrdered}</dd>
            </div>
            {farm && (
              <div>
                <dt className="text-muted">Gospodăria</dt>
                <dd className="font-semibold">{farm.name}, {farm.village}</dd>
              </div>
            )}
            {confirmation.lotCode && (
              <div>
                <dt className="text-muted">Lot</dt>
                <dd className="font-mono font-semibold">{confirmation.lotCode}</dd>
              </div>
            )}
          </dl>
        </Container>
      </section>

      <Container className="max-w-3xl py-10 sm:py-14">
        {state === "asteapta" && (
          <>
            <p className="mb-8 rounded-2xl bg-forest-50 p-4 text-sm leading-relaxed text-forest-800">
              Te rugăm să confirmi starea comenzii în {CONFIRMATION_WINDOW_HOURS} ore de la predare, până la{" "}
              <strong>{dateTime.format(new Date(confirmation.expiresAt))}</strong>. O confirmare rapidă ne ajută să
              rezolvăm imediat orice problemă. Poți închide pagina și reveni pe acest link până trimiți confirmarea.
            </p>
            <ConfirmationForm token={token} birdsOrdered={confirmation.birdsOrdered} />
          </>
        )}

        {(state === "confirmat" || state === "problema") && confirmation.answers && (
          <div role="status" className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-700">
              <Icon name="check" className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold">Mulțumim! Confirmarea a fost înregistrată.</h2>
            <p className="mt-1 text-sm text-muted">
              Trimisă pe {dateTime.format(new Date(confirmation.submittedAt!))}. Confirmarea nu mai poate fi modificată.
            </p>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Pui primiți" value={String(confirmation.answers.birdsReceived)} />
              <Row label="Ambalaj intact" value={yn(confirmation.answers.packagingOk)} />
              <Row label="Reci la primire" value={yn(confirmation.answers.coldOk)} />
              <Row label="Aspect și miros normale" value={yn(confirmation.answers.appearanceOk)} />
              <Row
                label="Concluzie"
                value={confirmation.answers.conditionOk ? "Primit în condițiile promise" : "Problemă semnalată"}
              />
              {ratingTargets.map((t) => (
                <Row key={t.key} label={`Nota pentru ${t.label}`} value={`${confirmation.answers![t.key]} din 5`} />
              ))}
            </dl>
            {confirmation.answers.problem && (
              <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-900">{confirmation.answers.problem}</p>
            )}
            {!confirmation.answers.conditionOk && (
              <p className="mt-5 text-sm text-muted">
                Te contactăm cât mai repede pentru rezolvare. Ne poți scrie și la{" "}
                <a href={`mailto:${site.company.email}`} className="font-semibold text-forest-700 underline">{site.company.email}</a>.
              </p>
            )}
          </div>
        )}

        {state === "expirat" && (
          <div className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">Termenul de confirmare a expirat</h2>
            <p className="mt-2 leading-relaxed text-muted">
              Linkul a fost valabil {CONFIRMATION_WINDOW_HOURS} ore de la predarea comenzii, până la{" "}
              {dateTime.format(new Date(confirmation.expiresAt))}. Dacă ai o problemă cu comanda, scrie-ne la{" "}
              <a href={`mailto:${site.company.email}`} className="font-semibold text-forest-700 underline">{site.company.email}</a>{" "}
              sau sună-ne la {site.company.phone}.
            </p>
          </div>
        )}
      </Container>
    </>
  );
}

const yn = (v: boolean) => (v ? "Da" : "Nu");

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-100 px-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-forest-900">{value}</dd>
    </div>
  );
}
