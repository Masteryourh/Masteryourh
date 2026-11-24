import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { GrowthJournalView } from "@/components/growth/GrowthJournalView";
import { farmRepository } from "@/server/repositories/catalog";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Jurnal de creștere (admin)", robots: { index: false, follow: false } };

/**
 * NAV-001: jurnalul unei gospodării văzut din Admin, în spațiul Admin (meniu, traseu, „Înapoi” de Admin), fără
 * trecere în spațiul gospodarului. Doar citire: adminul nu face înregistrări în numele gospodarului (fără impersonare).
 */
export default async function AdminFarmJournalPage({ params }: PageProps<"/admin/gospodarii/[slug]/jurnal">) {
  const { slug } = await params;
  await requireUser(["admin"], `/admin/gospodarii/${slug}/jurnal`);
  const farm = await farmRepository.bySlug(slug, { includeInactive: true });
  if (!farm) notFound();
  return (
    <Container className="py-8">
      <GrowthJournalView farm={farm} canWrite={false} />
    </Container>
  );
}
