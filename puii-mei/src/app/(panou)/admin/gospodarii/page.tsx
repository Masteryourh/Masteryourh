import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { lotStatus } from "@/lib/lots";
import { cn } from "@/lib/cn";
import { toggleFarmActive } from "../partner-actions";
import { governanceRepository } from "@/server/repositories/governance";
import { effectiveLimits, standingLabels } from "@/lib/governance";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gospodării", robots: { index: false, follow: false } };

export default async function AdminFarmsPage() {
  const [farms, lots, govs] = await Promise.all([farmRepository.listAll(), lotRepository.list({ all: true }), governanceRepository.list()]);
  const govBySlug = new Map(govs.map((g) => [g.id, g]));
  return (
    <Container className="py-8">
      <h1 className="text-3xl font-semibold">Gospodării partenere</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Gospodăriile noi se creează din solicitările aprobate. Cele marcate „Demo” sunt exemple din cod: le poți ascunde
        de pe site, dar nu le poți edita aici.
      </p>
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {farms.map((f) => {
          const farmLots = lots.filter((l) => l.farmSlug === f.slug);
          const activeLots = farmLots.filter((l) => lotStatus(l) !== "livrat").length;
          const gov = govBySlug.get(f.slug) ?? null;
          const lim = effectiveLimits(gov);
          return (
            <li key={f.slug} className={cn("flex flex-col rounded-3xl bg-white p-5 ring-1 ring-forest-900/10", !f.active && "opacity-70")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-xl font-semibold text-forest-900">{f.name}</p>
                  <p className="text-sm text-muted">{f.owner} · {f.village}, jud. {f.county}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {gov && gov.standing !== "activa" && (
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", gov.standing === "avertizata" ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-900")}>
                      {standingLabels[gov.standing]}
                    </span>
                  )}
                  {f.source === "demo" && <span className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-semibold">Demo</span>}
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", f.active ? "bg-forest-100 text-forest-800" : "bg-ink/5 text-muted")}>
                    {f.active ? "Vizibilă pe site" : "Ascunsă"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">
                Capacitate {f.capacityPerLot} pui/lot · {farmLots.length} loturi ({activeLots} active) · limite {lim.birdsPerYear.toLocaleString("ro-RO")}/an,{" "}
                {lim.birdsPerLot}/lot{lim.custom ? " (proprii)" : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <Link href={`/admin/gospodarii/${f.slug}/regim`} className="rounded-full bg-slate-800 px-4 py-2 font-semibold text-white">
                  Limite și regim
                </Link>
                <Link href={`/admin/gospodarii/${f.slug}/jurnal?inapoi=${encodeURIComponent("/admin/gospodarii")}`} className="rounded-full px-4 py-2 font-semibold text-forest-700 ring-1 ring-forest-900/15">
                  Jurnal de creștere
                </Link>
                <Link href={`/admin/gospodarii/${f.slug}`} className="rounded-full bg-forest-700 px-4 py-2 font-semibold text-white">
                  Editează
                </Link>
                {f.active && (
                  <Link href={`/gospodarii/${f.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-full px-4 py-2 font-semibold text-forest-700 ring-1 ring-forest-900/15">
                    Vezi pe site ↗
                  </Link>
                )}
                <form action={toggleFarmActive}>
                  <input type="hidden" name="slug" value={f.slug} />
                  <button className="rounded-full px-4 py-2 font-semibold text-forest-800 ring-1 ring-forest-900/15 hover:bg-forest-50">
                    {f.active ? "Ascunde de pe site" : "Afișează pe site"}
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
