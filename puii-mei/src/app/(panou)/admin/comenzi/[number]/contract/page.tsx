import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ContractDocument } from "@/components/orders/ContractDocument";
import { PrintButton } from "@/components/admin/PrintButton";
import { orderFarm } from "@/server/orders";
import { preorderRepository } from "@/server/repositories/preorders";
import { zoneRepository } from "@/server/repositories/catalog";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contractul comenzii (admin)", robots: { index: false, follow: false } };

/** Contractul de creștere al comenzii, în spațiul Admin (același text ca în panoul clientului). */
export default async function AdminOrderContractPage({ params }: PageProps<"/admin/comenzi/[number]/contract">) {
  const { number } = await params;
  await requireUser(["admin"], `/admin/comenzi/${number}/contract`);
  const order = await preorderRepository.byNumber(decodeURIComponent(number));
  if (!order) notFound();
  const [{ lot, farm, payment }, zone] = await Promise.all([orderFarm(order), zoneRepository.byId(order.zoneId, { includeInactive: true })]);
  return (
    <Container className="max-w-3xl py-8 print:py-0">
      <div className="mb-4 flex justify-end print:hidden"><PrintButton label="Tipărește contractul" /></div>
      <ContractDocument order={order} lot={lot} farm={farm} payment={payment} zone={zone} />
    </Container>
  );
}
