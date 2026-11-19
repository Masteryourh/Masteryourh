import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { confirmationState, confirmationStateLabels } from "@/lib/confirmation";
import { confirmationRepository } from "@/server/repositories/confirmations";
import { preorderRepository } from "@/server/repositories/preorders";
import { zoneRepository } from "@/server/repositories/catalog";
import { courierMarkDelivered } from "../../actions";
import { OrderInfo } from "../../OrderInfo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Predare colet", robots: { index: false, follow: false } };

const time = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });

/** Deschisă din codul QR „Curier” de pe colet. */
export default async function CourierDeliveryPage({ params }: PageProps<"/curier/livrare/[token]">) {
  const { token } = await params;
  const confirmation = await confirmationRepository.byCourierToken(token);
  if (!confirmation) notFound();
  const [preorder, zones] = await Promise.all([preorderRepository.byId(confirmation.id), zoneRepository.listActive()]);
  if (!preorder) notFound();
  const zone = zones.find((z) => z.id === preorder.zoneId)?.name ?? preorder.zoneId;
  const state = confirmationState(confirmation);

  return (
    <Container className="max-w-xl py-8">
      <Link href="/curier" className="text-sm text-muted hover:text-forest-800">← Toate livrările</Link>
      <h1 className="mt-3 text-3xl font-semibold">Predare colet</h1>
      <div className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-forest-900/10">
        <OrderInfo p={preorder} zone={zone} />
      </div>

      {preorder.status === "anulata" ? (
        <p className="mt-6 rounded-2xl bg-red-50 p-4 font-semibold text-red-800">Comanda este anulată. Nu o preda.</p>
      ) : !confirmation.deliveredAt ? (
        <form action={courierMarkDelivered} className="mt-6">
          <input type="hidden" name="courierToken" value={token} />
          <SubmitButton pendingText="Se înregistrează…">Livrat</SubmitButton>
          <p className="mt-3 text-sm text-muted">
            Apasă doar după ce ai predat coletul. Clientul poate apoi confirma primirea cu codul QR „Client”.
          </p>
        </form>
      ) : (
        <div role="status" className="mt-6 rounded-3xl bg-forest-50 p-5">
          <p className="flex items-center gap-2 font-semibold text-forest-800">
            <Icon name="check" className="h-5 w-5" /> Predat pe {time.format(new Date(confirmation.deliveredAt))}
          </p>
          <p className="mt-2 text-sm text-forest-800">Confirmarea clientului: {confirmationStateLabels[state]}</p>
        </div>
      )}
    </Container>
  );
}
