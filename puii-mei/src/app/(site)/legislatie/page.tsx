import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { LegalList } from "@/components/legal/LegalList";
import { pageMetadata } from "@/lib/seo";
import { legalRepository } from "@/server/repositories/legal";

export const revalidate = 3600;
export const metadata: Metadata = pageMetadata({
  title: "Legislație și reguli",
  description: "Legile, ghidurile și știrile pentru creșterea puilor, sacrificarea în gospodărie și vânzarea directă.",
  path: "/legislatie",
});

export default async function LegalPage() {
  const entries = await legalRepository.list();
  return (
    <>
      <PageHeader
        eyebrow="Transparență"
        title="Legislație și reguli"
        intro="Regulile după care lucrăm: creșterea puilor, sacrificarea în gospodărie și vânzarea directă. Cele marcate „De verificat” sunt în curs de confirmare cu specialiștii și cu DSVSA."
      />
      <Container className="max-w-4xl py-12">
        <LegalList entries={entries} />
        <p className="mt-10 text-sm text-muted">
          Informațiile au caracter orientativ și nu înlocuiesc textul oficial al actelor normative.
        </p>
      </Container>
    </>
  );
}
