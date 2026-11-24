import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ClientShell } from "@/components/orders/ClientShell";
import { ContractDocument } from "@/components/orders/ContractDocument";
import { PrintButton } from "@/components/orders/PrintButton";
import { buttonClasses } from "@/components/ui/Button";
import { orderFarm } from "@/server/orders";
import { canViewOrder } from "@/server/order-access";
import { preorderRepository } from "@/server/repositories/preorders";
import { zoneRepository } from "@/server/repositories/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contract de creștere", robots: { index: false, follow: false } };

/**
 * Contractul de creștere la comandă, în trei părți: clientul (beneficiar), gospodăria (crescător)
 * și ECORATE S.R.L. (consultant). MODEL: textul se validează cu juristul.
 */
export default async function ContractPage({ params }: PageProps<"/comanda/[token]/contract">) {
  const { token } = await params;
  const order = await preorderRepository.byTrackingToken(token);
  if (!order) notFound();
  if (!(await canViewOrder(order))) redirect(`/comanda?nr=${encodeURIComponent(order.number)}`);
  const [{ lot, farm, payment }, zone] = await Promise.all([orderFarm(order), zoneRepository.byId(order.zoneId, { includeInactive: true })]);


  return (
    <ClientShell number={order.number} token={token}>
    <Container className="max-w-3xl py-10 print:py-0">
      <div className="print:hidden">
        <p role="note" className="mb-6 rounded-2xl border-2 border-[#f5c400] bg-[#fff6c7] p-4 text-sm text-[#3d3200]">
          <strong>Model de contract, în curs de validare juridică.</strong> Datele companiei se completează la înființarea firmei.
          Clauzele finale pot diferi.
        </p>
      </div>

      <ContractDocument order={order} lot={lot} farm={farm} payment={payment} zone={zone} />

      <div className="mt-8 flex flex-wrap gap-2 print:hidden">
        <PrintButton className={buttonClasses("primary", "md")} />
        <a href={`/comanda/${token}`} className={buttonClasses("ghost", "md")}>← Înapoi la comandă</a>
      </div>
    </Container>
    </ClientShell>
  );
}
