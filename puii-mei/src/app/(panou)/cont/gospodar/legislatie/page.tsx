import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { LegalList } from "@/components/legal/LegalList";
import { legalRepository } from "@/server/repositories/legal";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Legislație și reguli", robots: { index: false, follow: false } };

export default async function FarmerLegalPage() {
  await requireUser(["gospodar"], "/cont/gospodar/legislatie");
  const entries = await legalRepository.list();
  return (
    <Container className="max-w-4xl py-8">
      <p className="text-xs tracking-[0.25em] text-[var(--pd-muted)] uppercase">Puii mei · reguli</p>
      <h1 className="mt-1 text-3xl font-light">Legislație și reguli</h1>
      <p className="mt-2 text-sm text-slate-600">
        Legile și ghidurile pentru creștere, sacrificarea în gospodărie și vânzarea directă, plus știri relevante. Cele
        marcate „De verificat” sunt în curs de confirmare. Pentru întrebări, contactează echipa Puii mei sau DSVSA județeană.
      </p>
      <div className="mt-8">
        <LegalList entries={entries} />
      </div>
    </Container>
  );
}
