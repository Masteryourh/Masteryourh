import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { GrowthJournalView } from "@/components/growth/GrowthJournalView";
import { farmRepository } from "@/server/repositories/catalog";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Jurnal de creștere", robots: { index: false, follow: false } };

export default async function GrowthJournalPage({ searchParams }: PageProps<"/cont/gospodar/jurnal">) {
  const user = await requireUser(["gospodar"], "/cont/gospodar/jurnal");
  const sp = await searchParams;
  const farms = await farmRepository.listAll();
  const slug = user.role === "admin" ? (typeof sp.gospodarie === "string" ? sp.gospodarie : farms[0]?.slug) : user.farmSlug;
  const farm = farms.find((f) => f.slug === slug);
  if (!farm) return <Container className="py-8"><p>Contul nu e legat de o gospodărie.</p></Container>;

  return (
    <Container className="py-8">
      {user.role === "admin" && (
        <form className="mb-6 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm">
          <label htmlFor="gospodarie" className="font-semibold">Previzualizare ca administrator:</label>
          <select id="gospodarie" name="gospodarie" defaultValue={farm.slug} className="rounded border border-slate-300 bg-white px-2 py-1">
            {farms.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
          <button className="rounded bg-slate-800 px-3 py-1 font-semibold text-white">Afișează</button>
        </form>
      )}
      <GrowthJournalView farm={farm} canWrite />
    </Container>
  );
}
