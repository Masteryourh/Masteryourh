import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { RatingForm } from "@/components/forms/RatingForm";
import { ratingState } from "@/lib/confirmation";
import { confirmationRepository } from "@/server/repositories/confirmations";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notează experiența", robots: { index: false, follow: false } };

export default async function RatingPage({ params, searchParams }: PageProps<"/evaluare/[token]">) {
  const { token } = await params;
  const { multumim } = await searchParams;
  const confirmation = await confirmationRepository.byRatingToken(token);
  if (!confirmation) notFound();
  const state = ratingState(confirmation);

  return (
    <>
      <section className="border-b border-forest-900/5 bg-cream-100">
        <Container className="max-w-2xl py-10 sm:py-14">
          {multumim !== undefined && state === "asteapta" && (
            <p role="status" className="mb-6 flex items-center gap-3 rounded-2xl bg-forest-700 p-4 font-semibold text-white">
              <Icon name="check" className="h-6 w-6 shrink-0" />
              Mulțumim! Confirmarea primirii a fost înregistrată.
            </p>
          )}
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Satisfacție</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Cum a fost comanda?</h1>
          <p className="mt-3 text-muted">
            Comanda <span className="font-mono font-semibold text-forest-900">{confirmation.preorderNumber}</span>. Notele
            sunt interne: ne arată unde să intervenim pentru calitate, la gospodărie, la curier sau la platformă.
          </p>
        </Container>
      </section>
      <Container className="max-w-2xl py-10 sm:py-14">
        {state === "asteapta" && <RatingForm token={token} />}
        {state === "trimis" && (
          <div role="status" className="rounded-3xl border border-forest-900/8 bg-white p-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-forest-700">
              <Icon name="check" className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold">Mulțumim pentru note!</h2>
            <p className="mt-2 text-muted">Ne ajută să facem fiecare comandă mai bună.</p>
          </div>
        )}
        {(state === "expirat" || state === "indisponibil") && (
          <p className="rounded-3xl bg-white p-6 text-muted ring-1 ring-forest-900/8">Linkul de evaluare nu mai este activ.</p>
        )}
      </Container>
    </>
  );
}
