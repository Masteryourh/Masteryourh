import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { confirmationState, confirmationStateLabels } from "@/lib/confirmation";
import type { DeliveryConfirmation, Preorder } from "@/lib/domain";
import { preorderRepository } from "@/server/repositories/preorders";
import { confirmationRepository } from "@/server/repositories/confirmations";
import { zoneRepository } from "@/server/repositories/catalog";
import { courierMarkDelivered } from "./actions";
import { OrderInfo } from "./OrderInfo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Livrări", robots: { index: false, follow: false } };

const toDeliver: Preorder["status"][] = ["confirmata", "alocata-lot", "in-livrare"];

/** Comenzile predate în ultimele 24 de ore. */
function deliveredRecently(preorders: Preorder[], byPreorder: Map<string, DeliveryConfirmation>) {
  const since = Date.now() - 24 * 3600_000;
  return preorders.filter((p) => {
    const c = byPreorder.get(p.id);
    return p.status === "livrata" && c?.deliveredAt && new Date(c.deliveredAt).getTime() > since;
  });
}

export default async function CourierPage() {
  const [preorders, confirmations, zones] = await Promise.all([
    preorderRepository.list(),
    confirmationRepository.list(),
    zoneRepository.listActive(),
  ]);
  const zoneName = new Map(zones.map((z) => [z.id, z.name]));
  const byPreorder = new Map(confirmations.map((c) => [c.id, c]));
  const pending = preorders.filter((p) => toDeliver.includes(p.status));
  const delivered = deliveredRecently(preorders, byPreorder);

  return (
    <Container className="max-w-2xl py-8">
      <h1 className="text-3xl font-semibold">Livrări</h1>
      <p className="mt-1 text-sm text-muted">
        La predare, scanează codul QR „Curier” de pe colet și apasă „Livrat”. Dacă nu poți scana, apasă „Livrat” aici.
        Clientul confirmă apoi primirea cu codul QR „Client”.
      </p>

      <h2 className="mt-8 text-xl font-semibold">De livrat ({pending.length})</h2>
      <ul className="mt-3 space-y-3">
        {pending.length === 0 && <li className="rounded-2xl bg-white p-5 text-muted ring-1 ring-forest-900/10">Nicio comandă de livrat.</li>}
        {pending.map((p) => (
          <li key={p.id} className="rounded-3xl bg-white p-5 ring-1 ring-forest-900/10">
            <OrderInfo p={p} zone={zoneName.get(p.zoneId) ?? p.zoneId} />
            <form action={courierMarkDelivered} className="mt-4">
              <input type="hidden" name="id" value={p.id} />
              <SubmitButton pendingText="Se înregistrează…">Livrat</SubmitButton>
            </form>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Predate în ultimele 24 de ore ({delivered.length})</h2>
      <ul className="mt-3 space-y-3">
        {delivered.map((p) => {
          const state = confirmationState(byPreorder.get(p.id)!);
          return (
            <li key={p.id} className="rounded-3xl bg-white p-5 ring-1 ring-forest-900/10">
              <OrderInfo p={p} zone={zoneName.get(p.zoneId) ?? p.zoneId} />
              <p className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${state === "confirmat" ? "bg-forest-100 text-forest-800" : state === "problema" ? "bg-red-100 text-red-800" : "bg-grain-300/60 text-forest-900"}`}>
                {confirmationStateLabels[state]}
              </p>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
