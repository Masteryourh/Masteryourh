import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { LotAdminRow, NewLotForm } from "@/components/lots/LotForms";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { governanceRepository } from "@/server/repositories/governance";
import { landRepository } from "@/server/repositories/land";
import { effectiveLimits } from "@/lib/governance";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Loturi", robots: { index: false, follow: false } };

export default async function AdminLotsPage({ searchParams }: PageProps<"/admin/loturi">) {
  const sp = await searchParams;
  const [lots, farms] = await Promise.all([lotRepository.list({ all: true }), farmRepository.listAll()]);
  const farmName = new Map(farms.map((f) => [f.slug, f.name]));
  const pending = lots.filter((l) => l.approval?.status === "asteapta");
  const farm = typeof sp.gospodarie === "string" && farmName.has(sp.gospodarie) ? sp.gospodarie : farms[0]?.slug;
  const lim = farm ? effectiveLimits(await governanceRepository.bySlug(farm), await landRepository.bySlug(farm)) : null;

  return (
    <Container className="py-8">
      <h1>Loturi</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Locurile rezervate se calculează automat din precomenzile active alocate pe fiecare lot. Un lot închis nu mai
        primește precomenzi, dar rămâne vizibil la trasabilitate.
      </p>
      {typeof sp.eroareLot === "string" && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{sp.eroareLot}</p>}
      {typeof sp.lotNou === "string" && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Lotul {sp.lotNou} a fost creat.</p>}
      {typeof sp.lotSalvat === "string" && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Lotul {sp.lotSalvat} a fost salvat.</p>}

      {pending.length > 0 && (
        <>
          <h2 className="mt-6 text-lg">De aprobat ({pending.length})</h2>
          <p className="text-sm text-slate-600">Loturi propuse de gospodari. Apar la precomandă doar după aprobare.</p>
          <div className="mt-2 space-y-2">
            {pending.map((l) => (
              <LotAdminRow key={l.code} lot={l} farmName={farmName.get(l.farmSlug)} returnTo="/admin/loturi" canApprove />
            ))}
          </div>
          <h2 className="mt-8 text-lg">Toate loturile</h2>
        </>
      )}
      <div id="loturi" className="mt-6 space-y-2">
        {lots.filter((l) => l.approval?.status !== "asteapta").map((l) => (
          <LotAdminRow key={l.code} lot={l} farmName={farmName.get(l.farmSlug)} returnTo="/admin/loturi" canApprove />
        ))}
      </div>

      <h2 className="mt-10 text-xl">Lot nou</h2>
      <form className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="gospodarie" className="font-semibold">Gospodăria:</label>
        <select id="gospodarie" name="gospodarie" defaultValue={farm} className="rounded-lg border border-slate-300 bg-white px-2 py-1">
          {farms.map((f) => (
            <option key={f.slug} value={f.slug}>{f.name}</option>
          ))}
        </select>
        <button className="rounded-lg bg-slate-800 px-3 py-1 font-semibold text-white">Alege</button>
      </form>
      {farm && (
        <div className="mt-3 max-w-3xl">
          <p className="mb-2 text-sm text-slate-600">Pentru: <strong>{farmName.get(farm)}</strong></p>
          {lim && !lim.landVerified && (
            <p className="mb-2 rounded-lg bg-amber-50 p-3 text-sm">
              Suprafața acestei gospodării nu e confirmată: confirm-o din Gospodării → „Limite și regim” înainte de a crea loturi.
            </p>
          )}
          <NewLotForm farmSlug={farm} returnTo={`/admin/loturi?gospodarie=${farm}`} maxPens={lim?.pens} />
        </div>
      )}
    </Container>
  );
}
