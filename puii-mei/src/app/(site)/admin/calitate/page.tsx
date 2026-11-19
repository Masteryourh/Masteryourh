import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { confirmationRepository } from "@/server/repositories/confirmations";
import { farmRepository } from "@/server/repositories/catalog";
import { confirmationState, confirmationStateLabels, ratingTargets } from "@/lib/confirmation";
import type { ConfirmationState, DeliveryConfirmation } from "@/lib/domain";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calitate", robots: { index: false, follow: false } };

type RatingKey = (typeof ratingTargets)[number]["key"];

function average(items: DeliveryConfirmation[], key: RatingKey) {
  const values = items.flatMap((c) => (c.answers ? [c.answers[key]] : []));
  return values.length ? { avg: values.reduce((a, b) => a + b, 0) / values.length, n: values.length } : null;
}

const fmt = (n: number) => n.toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default async function QualityPage() {
  const [all, farms] = await Promise.all([confirmationRepository.list(), farmRepository.listAll()]);
  const farmName = new Map(farms.map((f) => [f.slug, `${f.name}, ${f.village}`]));
  const submitted = all.filter((c) => c.submittedAt);
  const counts = all.reduce(
    (acc, c) => ({ ...acc, [confirmationState(c)]: (acc[confirmationState(c)] ?? 0) + 1 }),
    {} as Partial<Record<ConfirmationState, number>>,
  );
  const problems = all.filter((c) => confirmationState(c) === "problema");
  const farmSlugs = [...new Set(submitted.map((c) => c.farmSlug ?? "—"))];

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-semibold">Calitate</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Din confirmările de primire completate de clienți. Notele sunt interne și arată unde apar abateri: la gospodărie,
        la curier sau la platformă.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(confirmationStateLabels) as ConfirmationState[]).map((s) => (
          <div key={s} className="rounded-2xl bg-white p-5 ring-1 ring-forest-900/10">
            <p className="text-sm text-muted">{confirmationStateLabels[s]}</p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-forest-900">{counts[s] ?? 0}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-semibold">Note medii</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-forest-900/10 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm tabular-nums">
          <thead className="bg-cream-100 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Gospodărie</th>
              <th className="px-4 py-3 font-semibold">Confirmări</th>
              {ratingTargets.map((t) => (
                <th key={t.key} className="px-4 py-3 font-semibold">{t.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-900/5">
            {submitted.length === 0 && (
              <tr><td colSpan={2 + ratingTargets.length} className="px-4 py-6 text-center text-muted">Nicio confirmare trimisă încă.</td></tr>
            )}
            {farmSlugs.map((slug) => {
              const items = submitted.filter((c) => (c.farmSlug ?? "—") === slug);
              return (
                <tr key={slug}>
                  <td className="px-4 py-3 font-medium">{slug === "—" ? "Fără lot alocat" : farmName.get(slug) ?? slug}</td>
                  <td className="px-4 py-3">{items.length}</td>
                  {ratingTargets.map((t) => {
                    const a = average(items, t.key);
                    return (
                      <td key={t.key} className={`px-4 py-3 ${a && a.avg < 3.5 ? "font-semibold text-red-700" : ""}`}>
                        {a ? `${fmt(a.avg)} / 5` : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {submitted.length > 0 && (
              <tr className="bg-cream-50 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3">{submitted.length}</td>
                {ratingTargets.map((t) => {
                  const a = average(submitted, t.key);
                  return <td key={t.key} className="px-4 py-3">{a ? `${fmt(a.avg)} / 5` : "—"}</td>;
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">Mediile sub 3,5 sunt marcate cu roșu.</p>

      <h2 className="mt-12 text-2xl font-semibold">Probleme semnalate</h2>
      <ul className="mt-4 space-y-3">
        {problems.length === 0 && <li className="text-muted">Nicio problemă semnalată.</li>}
        {problems.map((c) => (
          <li key={c.id} className="rounded-2xl bg-white p-5 text-sm ring-1 ring-red-200">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-mono font-semibold">{c.preorderNumber}</span>
              <span className="text-muted">{formatDate(c.submittedAt!)}</span>
            </div>
            <p className="mt-1 text-muted">
              {c.farmSlug ? farmName.get(c.farmSlug) : "Fără lot alocat"} · {c.answers!.birdsReceived} din {c.birdsOrdered} pui ·
              ambalaj {c.answers!.packagingOk ? "ok" : "deteriorat"} · {c.answers!.coldOk ? "rece" : "nu era rece"} · aspect{" "}
              {c.answers!.appearanceOk ? "ok" : "neconform"}
            </p>
            <p className="mt-3 whitespace-pre-line rounded-xl bg-red-50 p-3 text-red-900">{c.answers!.problem}</p>
            {c.answers!.comment && <p className="mt-2 italic text-muted">„{c.answers!.comment}”</p>}
          </li>
        ))}
      </ul>
    </Container>
  );
}
