import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LotStatusBadge } from "@/components/lots/LotStatusBadge";
import { availabilityDate, availableBirds, growthProgress, lotStatus } from "@/lib/lots";
import { formatDate, formatLei } from "@/lib/format";
import type { Parcel, PreorderStatus } from "@/lib/domain";
import { DELIVERY, parcelStage, parcelStageLabels, tourStatusLabels } from "@/lib/delivery";
import { CreateTourForm } from "@/components/delivery/FarmerTourTools";
import { parcelRepository, tourRepository } from "@/server/repositories/delivery";
import { generateLabelAction } from "./livrari-actions";
import { farmRepository, lotRepository, zoneRepository } from "@/server/repositories/catalog";
import { preorderRepository } from "@/server/repositories/preorders";
import { requireUser } from "@/server/session";
import { inputClasses } from "@/components/forms/Field";
import { FeedCell } from "@/components/orders/FeedCell";
import { feedAdvance, pricing } from "@/lib/pricing";
import { farmPaymentRepository } from "@/server/repositories/farm-payments";
import { saveFarmPaymentAction } from "./plati-actions";
import { LotAdminRow, NewLotForm } from "@/components/lots/LotForms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contul gospodarului", robots: { index: false, follow: false } };

const preorderLabels: Record<PreorderStatus, string> = {
  noua: "Nouă",
  confirmata: "Confirmată",
  "alocata-lot": "Alocată pe lot",
  "in-livrare": "În livrare",
  livrata: "Livrată",
  anulata: "Anulată",
};

export default async function FarmerDashboard({ searchParams }: PageProps<"/cont/gospodar">) {
  const user = await requireUser(["gospodar"], "/cont/gospodar");
  const sp = await searchParams;
  const { gospodarie } = sp;
  const farms = await farmRepository.listAll();
  // Gospodarul își vede doar gospodăria; adminul poate alege oricare (previzualizare).
  const slug = user.role === "admin" ? (typeof gospodarie === "string" ? gospodarie : farms[0]?.slug) : user.farmSlug;
  const farm = farms.find((f) => f.slug === slug) ?? null;

  if (!farm) {
    return (
      <Container className="max-w-3xl py-10">
        <p className="mt-8 rounded-3xl bg-white p-6 text-muted ring-1 ring-forest-900/10">
          Contul tău nu este încă legat de o gospodărie. Echipa Puii mei îl configurează în scurt timp.
        </p>
      </Container>
    );
  }

  const [lots, preorders, zones] = await Promise.all([
    lotRepository.byFarm(farm.slug),
    preorderRepository.list(),
    zoneRepository.listActive(),
  ]);
  const lotCodes = new Set(lots.map((l) => l.code));
  const backTo = user.role === "admin" ? `/cont/gospodar?gospodarie=${farm.slug}` : "/cont/gospodar";
  const farmPreorders = preorders.filter((p) => p.lotCode && lotCodes.has(p.lotCode) && p.status !== "anulata");
  const zoneName = new Map(zones.map((z) => [z.id, z.name]));
  const activeLots = lots.filter((l) => lotStatus(l) !== "livrat");
  const [allParcels, allTours, payment] = await Promise.all([
    parcelRepository.list(),
    tourRepository.list(),
    farmPaymentRepository.bySlug(farm.slug),
  ]);
  const parcels = allParcels.filter((x) => x.farmSlug === farm.slug);
  const parcelById = new Map(parcels.map((x) => [x.id, x]));
  const preorderById = new Map(farmPreorders.map((x) => [x.id, x]));
  const farmTours = allTours.filter((t) => t.farmSlug === farm.slug);
  const activeTourIds = new Set(farmTours.filter((t) => t.status !== "anulata").map((t) => t.id));
  const readyParcels = parcels.filter(
    (x) => !x.delivered && (!x.tourId || !activeTourIds.has(x.tourId)) && preorderById.has(x.id),
  );

  return (
    <Container className="py-8">
      {user.role === "admin" && (
        <form className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-cream-100 p-3 text-sm">
          <label htmlFor="gospodarie" className="font-semibold">Previzualizare ca administrator:</label>
          <select id="gospodarie" name="gospodarie" defaultValue={farm.slug} className="rounded-lg border border-forest-900/15 bg-white px-2 py-1">
            {farms.map((f) => (
              <option key={f.slug} value={f.slug}>{f.name}</option>
            ))}
          </select>
          <button className="rounded-lg bg-forest-700 px-3 py-1 font-semibold text-white">Afișează</button>
        </form>
      )}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{farm.name}</h1>
          <p className="mt-1 text-muted">
            {farm.owner} · {farm.village}, jud. {farm.county}
          </p>
        </div>
        <Link href={`/gospodarii/${farm.slug}`} className="text-sm font-semibold text-forest-700 underline">
          Vezi profilul public
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Loturi active" value={String(activeLots.length)} />
        <Stat label="Pui precomandați" value={String(farmPreorders.reduce((s, p) => s + p.birds, 0))} />
        <Stat label="Valoare estimativă" value={formatLei(farmPreorders.reduce((s, p) => s + p.estimate.productValue, 0))} />
      </div>

      <h2 id="loturi" className="mt-10 scroll-mt-6 text-2xl font-semibold">Loturi</h2>
      {typeof sp.eroareLot === "string" && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{sp.eroareLot}</p>}
      {typeof sp.lotNou === "string" && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Lotul {sp.lotNou} a fost creat și apare la precomandă.</p>}
      {typeof sp.lotSalvat === "string" && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Lotul {sp.lotSalvat} a fost salvat.</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {lots.length === 0 && <p className="text-muted">Niciun lot încă.</p>}
        {lots.map((l) => {
          const status = lotStatus(l);
          const progress = growthProgress(l);
          return (
            <div key={l.code} className="rounded-3xl bg-white p-5 ring-1 ring-forest-900/10">
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono font-semibold">{l.code}</p>
                <LotStatusBadge status={status} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-muted">Început</dt><dd className="font-medium">{formatDate(l.startDate)}</dd></div>
                <div><dt className="text-muted">Disponibil</dt><dd className="font-medium">{formatDate(availabilityDate(l))}</dd></div>
                <div><dt className="text-muted">Rezervați</dt><dd className="font-medium">{l.reservedBirds} / {l.totalBirds}</dd></div>
                <div><dt className="text-muted">Locuri libere</dt><dd className="font-medium">{availableBirds(l)}</dd></div>
              </dl>
              {status === "in-crestere" && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-forest-50">
                  <div className="h-full rounded-full bg-forest-500" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <details className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <summary className="cursor-pointer text-sm font-semibold">Administrează loturile: lot nou, modificare, închidere</summary>
        <div className="mt-4 space-y-2">
          {lots.map((l) => (
            <LotAdminRow key={l.code} lot={l} returnTo={backTo} />
          ))}
        </div>
        <h3 className="mt-6 mb-2 font-sans text-base font-semibold">Lot nou</h3>
        <NewLotForm farmSlug={farm.slug} returnTo={backTo} />
      </details>

      <h2 className="mt-10 text-2xl font-semibold">Precomenzi pe loturile tale</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-forest-900/10 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-cream-100 text-xs uppercase tracking-wider text-muted">
            <tr>
              {["Nr.", "Client", "Pui", "Lot", "Livrare", "Status", "Avans hrană", "Etichetă"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-900/5">
            {farmPreorders.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-muted">Nicio precomandă alocată încă pe loturile tale.</td></tr>
            )}
            {farmPreorders.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-mono text-xs">{p.number}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.customer.name}</div>
                  <div className="text-muted">{p.customer.phone}</div>
                </td>
                <td className="px-4 py-3">{p.birds}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.lotCode}</td>
                <td className="px-4 py-3">{zoneName.get(p.zoneId) ?? p.zoneId}</td>
                <td className="px-4 py-3">
                  {preorderLabels[p.status]}
                  {!p.location && !["ridicare-personala", "alta-zona"].includes(p.zoneId) && (
                    <span className="block text-xs text-red-700">fără pin pe hartă</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <FeedCell preorder={p} amount={feedAdvance(p.birds, payment?.feedPricePerKg).amount} canConfirm />
                </td>
                <td className="px-4 py-3">
                  <LabelCell preorderId={p.id} parcel={parcelById.get(p.id)} delivered={p.status === "livrata"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="plata-hrana" className="mt-10 scroll-mt-6 text-2xl font-semibold">Contul pentru avansul de hrană</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Clienții văd aceste date pe pagina comenzii și plătesc avansul prin transfer, direct în contul tău, cu numărul comenzii
        în detalii. Tu confirmi primirea banilor în tabelul de mai sus.
      </p>
      {typeof sp.eroarePlata === "string" && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{sp.eroarePlata}</p>}
      {sp.salvatPlata && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Datele de plată au fost salvate.</p>}
      {!payment && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Completează datele, altfel clienții nu pot plăti avansul.
        </p>
      )}
      <form action={saveFarmPaymentAction} className="mt-4 grid max-w-3xl gap-4 rounded-2xl bg-white p-5 ring-1 ring-forest-900/10 sm:grid-cols-2">
        <input type="hidden" name="farmSlug" value={farm.slug} />
        <label className="text-sm font-semibold sm:col-span-2">
          Titularul contului
          <input name="holder" defaultValue={payment?.holder ?? farm.owner} required className={`${inputClasses} mt-1`} />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          IBAN
          <input name="iban" defaultValue={payment?.iban ?? ""} required placeholder="RO49 AAAA 1B31 0075 9384 0000" className={`${inputClasses} mt-1 font-mono uppercase`} />
        </label>
        <label className="text-sm font-semibold">
          Banca
          <input name="bank" defaultValue={payment?.bank ?? ""} placeholder="Ex. Banca Transilvania" className={`${inputClasses} mt-1`} />
        </label>
        <label className="text-sm font-semibold">
          Prețul furajului (lei / kg)
          <input name="feedPricePerKg" type="number" step="0.01" min="0.1" max="50" defaultValue={payment?.feedPricePerKg ?? pricing.feedPricePerKg} required className={`${inputClasses} mt-1`} />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white">Salvează datele de plată</button>
          {payment && <span className="text-xs text-muted">Actualizat {formatDate(payment.updatedAt)} de {payment.updatedBy}</span>}
        </div>
      </form>

      <h2 className="mt-10 text-2xl font-semibold">Ture de livrare</h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <ul className="space-y-3">
          {farmTours.length === 0 && <li className="rounded-2xl bg-white p-5 text-muted ring-1 ring-forest-900/10">Nicio tură încă.</li>}
          {farmTours.map((t) => (
            <li key={t.id}>
              <Link href={`/cont/gospodar/ture/${t.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-4 ring-1 ring-forest-900/10 hover:ring-forest-700/40">
                <span>
                  <span className="font-mono font-semibold">{t.code}</span>
                  <span className="block text-sm text-muted">{t.date} · {t.parcelIds.length} colete</span>
                </span>
                <span className="flex items-center gap-2">
                  {t.pinRequest?.status === "asteapta" && <span className="rounded-full bg-grain-400 px-2.5 py-1 text-xs font-semibold">Cerere curier</span>}
                  <span className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-semibold">{tourStatusLabels[t.status]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div>
          <h3 className="mb-3 font-sans text-lg font-semibold">Tură nouă</h3>
          {readyParcels.length ? (
            <CreateTourForm
              farmSlug={farm.slug}
              parcels={readyParcels.map((x) => ({
                id: x.id,
                label: `${x.preorderNumber} · ${preorderById.get(x.id)?.customer.name ?? ""} · ${x.birds} pui`,
                hasPin: Boolean(preorderById.get(x.id)?.location),
              }))}
              defaultHours={DELIVERY.defaultTourHours}
              today={todayIso()}
            />
          ) : (
            <p className="rounded-2xl bg-cream-100 p-4 text-sm text-muted">
              Generează întâi etichetele comenzilor (în tabelul de mai sus). Coletele cu etichetă care nu sunt într-o tură apar aici.
            </p>
          )}
        </div>
      </div>

      <h2 className="mt-10 text-2xl font-semibold">Documente și cheltuieli</h2>
      <Link href={`/cont/gospodar/documente${user.role === "admin" ? `?gospodarie=${farm.slug}` : ""}`} className="mt-3 block max-w-xl rounded-xl bg-white p-5 ring-1 ring-slate-200 hover:ring-slate-400">
        <p className="font-semibold">Registrul de cheltuieli și documentele gospodăriei →</p>
        <p className="mt-1 text-sm text-slate-600">Facturi, avize, documente contabile, înregistrări DSV, contracte; costul pe lot și pe pasăre.</p>
      </Link>
    </Container>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function LabelCell({ preorderId, parcel, delivered }: { preorderId: string; parcel?: Parcel; delivered: boolean }) {
  const small = "rounded-lg px-2.5 py-1 text-xs font-semibold";
  if (!parcel) {
    return delivered ? (
      <span className="text-xs text-muted">—</span>
    ) : (
      <form action={generateLabelAction}>
        <input type="hidden" name="id" value={preorderId} />
        <button className={`${small} bg-grain-400 text-forest-900`}>Generează eticheta</button>
      </form>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-xs text-muted">{parcelStageLabels[parcelStage(parcel)]} · v{parcel.version}</span>
      <div className="flex flex-wrap gap-1">
        <Link href={`/cont/gospodar/etichete?ids=${parcel.id}`} className={`${small} ring-1 ring-forest-900/15`}>Tipărește</Link>
        {!parcel.loaded && (
          <form action={generateLabelAction}>
            <input type="hidden" name="id" value={preorderId} />
            <input type="hidden" name="regenerate" value="1" />
            <button className={`${small} ring-1 ring-forest-900/15`} title="Codurile vechi nu mai funcționează">Regenerează</button>
          </form>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-forest-900/10">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-forest-900">{value}</p>
    </div>
  );
}
