import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PHOTO_SIDES, confirmationState, confirmationStateLabels, ratingTargets } from "@/lib/confirmation";
import { confirmationRepository } from "@/server/repositories/confirmations";
import { farmRepository } from "@/server/repositories/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirmare primire", robots: { index: false, follow: false } };

const time = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });

export default async function ConfirmationDetail({ params }: PageProps<"/admin/confirmare/[id]">) {
  const { id } = await params;
  const c = await confirmationRepository.byPreorder(id);
  if (!c) notFound();
  const farm = c.farmSlug ? await farmRepository.bySlug(c.farmSlug, { includeInactive: true }) : null;
  const a = c.answers;
  const yn = (v: boolean) => (v ? "Da" : "Nu");

  return (
    <Container className="max-w-4xl py-8">
      <Link href="/admin" className="text-sm text-muted hover:text-forest-800">← Precomenzi</Link>
      <h1 className="mt-3 text-3xl font-semibold">
        Confirmare <span className="font-mono">{c.preorderNumber}</span>
      </h1>
      <p className="mt-1 text-muted">
        {confirmationStateLabels[confirmationState(c)]}
        {farm ? ` · ${farm.name}, ${farm.village}` : ""}
        {c.lotCode ? ` · lot ${c.lotCode}` : ""}
      </p>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        <Item label="Etichetă tipărită" value={time.format(new Date(c.createdAt))} />
        <Item label="Predat" value={c.deliveredAt ? `${time.format(new Date(c.deliveredAt))} (${c.deliveredBy})` : "—"} />
        <Item label="Confirmat de client" value={c.submittedAt ? time.format(new Date(c.submittedAt)) : "—"} />
      </dl>

      {a && (
        <>
          <h2 className="mt-10 text-2xl font-semibold">Lista de verificare</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <Item label="Pui primiți" value={`${a.birdsReceived} din ${c.birdsOrdered}`} />
            <Item label="Ambalaj intact" value={yn(a.packagingOk)} />
            <Item label="Carne rece" value={yn(a.coldOk)} />
            <Item label="Aspect și miros" value={yn(a.appearanceOk)} />
          </dl>
          {a.problem && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-red-900">{a.problem}</p>}

          <h2 className="mt-10 text-2xl font-semibold">Fotografii colet</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PHOTO_SIDES.slice(0, a.photos).map((side, i) => (
              <a key={side} href={`/admin/foto/${c.id}-${i + 1}`} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/admin/foto/${c.id}-${i + 1}`} alt={`Colet, ${side}`} className="aspect-square w-full rounded-2xl object-cover ring-1 ring-forest-900/10" />
                <span className="mt-1 block text-xs text-muted">{side}</span>
              </a>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-10 text-2xl font-semibold">Satisfacție</h2>
      {c.ratings ? (
        <>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            {ratingTargets.map((t) => (
              <Item key={t.key} label={t.label} value={`${c.ratings![t.key]} din 5`} />
            ))}
          </dl>
          {c.ratings.comment && <p className="mt-4 italic text-muted">„{c.ratings.comment}”</p>}
        </>
      ) : (
        <p className="mt-2 text-muted">Clientul nu a trimis încă notele.</p>
      )}
    </Container>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-forest-900/10">
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-forest-900">{value}</dd>
    </div>
  );
}
