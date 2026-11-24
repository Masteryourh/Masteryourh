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
import { reportUnrequestedIbanAction, saveFarmPaymentAction } from "./plati-actions";
import { maskIban } from "@/server/iban-core";
import { LotAdminRow, NewLotForm } from "@/components/lots/LotForms";
import { AerialMap, Bars, FARM_SPOTS, Gauge, Glass, GlassTitle, Metric, Pill, Ring } from "@/components/panel/Dash";
import { expenseCategoryLabels } from "@/lib/documents";
import { lotDay, statusLabels } from "@/lib/lots";
import { expenseRepository, expenseTotals, investmentRepository } from "@/server/repositories/documents";
import { RepaymentBox } from "@/components/documents/RepaymentBox";
import { governanceRepository } from "@/server/repositories/governance";
import { legalRepository } from "@/server/repositories/legal";
import { legalKindLabels } from "@/lib/legal";
import { birdsInYear, effectiveLimits, standingLabels } from "@/lib/governance";
import { landRepository } from "@/server/repositories/land";
import { declareLandAction } from "./teren-actions";
import { GROWTH, pensForArea } from "@/lib/growth";
import { expiringDocuments, zile } from "@/lib/document-expiry";
import { documentRepository } from "@/server/repositories/documents";
import { mfaEnabled } from "@/server/mfa";

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

  const [lots, preorders, zones, investments] = await Promise.all([
    lotRepository.byFarm(farm.slug, { all: true }),
    preorderRepository.list(),
    zoneRepository.listActive(),
    investmentRepository.list().then((all) => all.filter((i) => i.farmSlug === farm.slug && (i.status === "activa" || i.status === "semnata" || i.status === "finalizata"))),
  ]);
  const lotCodes = new Set(lots.map((l) => l.code));
  const backTo = user.role === "admin" ? `/cont/gospodar?gospodarie=${farm.slug}` : "/cont/gospodar";
  const farmPreorders = preorders.filter((p) => p.lotCode && lotCodes.has(p.lotCode) && p.status !== "anulata");
  const zoneName = new Map(zones.map((z) => [z.id, z.name]));
  const activeLots = lots.filter((l) => lotStatus(l) !== "livrat");
  const [allParcels, allTours, payment, expenses, gov, land] = await Promise.all([
    parcelRepository.list(),
    tourRepository.list(),
    farmPaymentRepository.bySlug(farm.slug),
    expenseRepository.byFarm(farm.slug),
    governanceRepository.bySlug(farm.slug),
    landRepository.bySlug(farm.slug),
  ]);
  const expiring = expiringDocuments(await documentRepository.byFarm(farm.slug), new Date());
  const legalNews = (await legalRepository.list()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const recentSince = recentCutoff();
  const limits = effectiveLimits(gov, land);
  const thisYear = new Date().getFullYear();
  const usedThisYear = birdsInYear(lots, thisYear);
  const blocked = gov?.standing === "suspendata" || gov?.standing === "exclusa";
  const parcels = allParcels.filter((x) => x.farmSlug === farm.slug);
  const parcelById = new Map(parcels.map((x) => [x.id, x]));
  const preorderById = new Map(farmPreorders.map((x) => [x.id, x]));
  const farmTours = allTours.filter((t) => t.farmSlug === farm.slug);
  const activeTourIds = new Set(farmTours.filter((t) => t.status !== "anulata").map((t) => t.id));
  const readyParcels = parcels.filter(
    (x) => !x.delivered && (!x.tourId || !activeTourIds.has(x.tourId)) && preorderById.has(x.id),
  );

  // Dashboard: lotul curent (în creștere, altfel următorul), avansuri, cheltuieli, livrări.
  const approvedLots = lots.filter((l) => !l.approval || l.approval.status === "aprobat");
  const growing = approvedLots.filter((l) => lotStatus(l) === "in-crestere");
  const upcoming = approvedLots.filter((l) => lotStatus(l) === "precomenzi-deschise").sort((a, b) => a.startDate.localeCompare(b.startDate));
  const currentLot = growing[0] ?? upcoming[0] ?? approvedLots[0];
  const day = currentLot ? Math.max(0, Math.min(currentLot.growthDays, lotDay(currentLot))) : 0;
  const progress = currentLot ? growthProgress(currentLot) : 0;
  const totals = expenseTotals(expenses);
  const feedPaid = farmPreorders.filter((p) => p.feedPayment?.status === "primita").length;
  const advanceOf = (p: (typeof farmPreorders)[number]) => p.feedPayment?.amount ?? feedAdvance(p.birds, payment?.feedPricePerKg, payment?.chickPricePerBird).amount;
  const feedPaidSum = farmPreorders.filter((p) => p.feedPayment?.status === "primita").reduce((s, p) => s + advanceOf(p), 0);
  const feedTotalSum = farmPreorders.reduce((s, p) => s + advanceOf(p), 0);
  const nextTour = farmTours
    .filter((t) => t.status === "planificata" || t.status === "in-curs")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const mapLots = activeLots.filter((l) => !l.approval || l.approval.status !== "respins").slice(0, FARM_SPOTS.length);

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

      {gov && gov.standing !== "activa" && (
        <div role="alert" className={`mb-4 rounded-xl p-4 text-sm ${gov.standing === "avertizata" ? "bg-amber-50" : "bg-red-50"}`}>
          <p className="font-semibold">Gospodăria e {standingLabels[gov.standing].toLowerCase()} în platforma Puii mei.</p>
          {gov.standingReason && <p className="mt-1">Motiv: {gov.standingReason}</p>}
          {blocked && <p className="mt-1">Nu poți crea loturi noi, iar loturile tale nu mai primesc precomenzi. Comenzile existente continuă.</p>}
          <p className="mt-1 opacity-80">Pentru lămuriri, contactează echipa Puii mei.</p>
        </div>
      )}
      <section className="mt-2 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.25em] text-[var(--pd-muted)] uppercase">Puii mei · gospodăria mea</p>
            <h1 className="mt-1 text-3xl font-light tracking-tight sm:text-4xl">{farm.name}</h1>
            <p className="text-sm text-[var(--pd-muted)]">{farm.owner} · {farm.village}, jud. {farm.county}</p>
          </div>
          <Link href={`/gospodarii/${farm.slug}`} className="rounded-full border border-white/15 px-4 py-2 text-sm text-[var(--pd-text)] hover:bg-white/10">
            Profilul public ↗
          </Link>
        </div>

        {expiring.length > 0 && (
          <div id="documente-expira" role="alert" className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-300">
            <p className="font-semibold">Documente care expiră în curând</p>
            <ul className="mt-1 space-y-0.5">
              {expiring.map(({ doc, days }) => (
                <li key={doc.id}>
                  {doc.title}: {days < 0 ? <strong>expirat de {zile(-days)}</strong> : days === 0 ? <strong>expiră azi</strong> : <>expiră în <strong>{zile(days)}</strong></>} ({formatDate(doc.expiresOn!)})
                </li>
              ))}
            </ul>
            <Link href={`/cont/gospodar/documente${user.role === "admin" ? `?gospodarie=${farm.slug}` : ""}#documente`} className="mt-2 inline-block font-semibold underline">
              Încarcă documentul nou
            </Link>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <AerialMap
            src="/images/panou/gospodarie-aerian.webp"
            className="min-h-[300px] sm:min-h-[380px] xl:min-h-[470px]"
            pins={
              mapLots.length
                ? mapLots.map((l, i) => ({
                    ...FARM_SPOTS[i],
                    label: l.code,
                    note: l.approval?.status === "asteapta" ? "de aprobat" : lotStatus(l) === "in-crestere" ? `ziua ${Math.max(0, lotDay(l))}` : statusLabels[lotStatus(l)],
                    active: l.code === currentLot?.code,
                  }))
                : [{ ...FARM_SPOTS[2], label: farm.name, note: "fără loturi active" }]
            }
          >
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-black/45 px-3 py-1 text-white backdrop-blur-md">{farm.village}, {farm.county}</span>
              <span className="rounded-full bg-black/45 px-3 py-1 text-white backdrop-blur-md">{activeLots.length} loturi active</span>
            </div>
          </AerialMap>

          <div className="grid content-start gap-4">
            <Glass delay={100}>
              <GlassTitle
                title="Lotul curent"
                hint={currentLot ? `${currentLot.code} · ${currentLot.totalBirds} păsări` : "Niciun lot încă"}
                right={currentLot ? <Pill>{statusLabels[lotStatus(currentLot)]}</Pill> : undefined}
              />
              <div className="mt-3">
                <Gauge percent={progress} label={`${progress}%`} sub={currentLot ? `ziua ${day} din ${currentLot.growthDays}` : "creștere"} />
              </div>
              {currentLot && <p className="mt-2 text-center text-xs text-[var(--pd-muted)]">Disponibil estimat: {formatDate(availabilityDate(currentLot))}</p>}
            </Glass>
            <div className="grid grid-cols-2 gap-4">
              <Metric
                delay={180}
                label="Pui rezervați"
                value={String(currentLot?.reservedBirds ?? 0)}
                unit={currentLot ? `/ ${currentLot.totalBirds}` : undefined}
                pill={currentLot ? <Pill tone="green">{availableBirds(currentLot)} liberi</Pill> : undefined}
              />
              <Metric
                delay={240}
                label="Avansuri primite"
                value={`${feedPaid}`}
                unit={`/ ${farmPreorders.length}`}
                pill={<Pill tone={feedPaid === farmPreorders.length ? "green" : "gold"}>{farmPreorders.length - feedPaid} de primit</Pill>}
                note={`Total primit: ${formatLei(feedPaidSum)} din ${formatLei(feedTotalSum)}`}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Glass delay={300}>
            <GlassTitle title="Rezervări pe loturi" hint="păsări rezervate în fiecare lot" />
            <div className="mt-4">
              <Bars
                data={[...approvedLots].reverse().slice(-8).map((l) => ({ label: l.code.slice(3), value: l.reservedBirds, highlight: l.code === currentLot?.code, title: `${l.code}: ${l.reservedBirds} / ${l.totalBirds}` }))}
              />
            </div>
          </Glass>
          <Glass delay={360}>
            <GlassTitle
              title="Cheltuieli"
              hint="pe categorii, toate loturile"
              right={<Link href={`/cont/gospodar/documente${user.role === "admin" ? `?gospodarie=${farm.slug}` : ""}`} className="text-xs text-[var(--pd-green)]">registrul ↗</Link>}
            />
            <div className="mt-4">
              <Ring
                center={totals.total >= 1000 ? `${Math.round(totals.total / 1000)}k` : String(Math.round(totals.total))}
                sub="lei"
                data={[...totals.byCategory].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: expenseCategoryLabels[k as keyof typeof expenseCategoryLabels], value: v }))}
              />
            </div>
          </Glass>
          <Glass delay={420}>
            <GlassTitle title="Următoarea livrare" hint="ture și colete" />
            {nextTour ? (
              <Link href={`/cont/gospodar/ture/${nextTour.id}`} className="mt-4 block">
                <p className="text-3xl font-light">{formatDate(nextTour.date)}</p>
                <p className="mt-1 text-sm text-[var(--pd-muted)]">
                  Tura {nextTour.code} · {nextTour.parcelIds.length} colete · <span className="text-[var(--pd-gold)]">{tourStatusLabels[nextTour.status]}</span>
                </p>
              </Link>
            ) : (
              <p className="mt-4 text-sm text-[var(--pd-muted)]">Nicio tură planificată.</p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
              <div>
                <p className="text-[var(--pd-muted)]">Colete gata</p>
                <p className="text-2xl font-light">{readyParcels.length}</p>
              </div>
              <div>
                <p className="text-[var(--pd-muted)]">Valoare comenzi</p>
                <p className="text-2xl font-light">{formatLei(farmPreorders.reduce((s, p) => s + p.estimate.productValue, 0)).replace(",00", "")}</p>
              </div>
            </div>
          </Glass>
        </div>
      </section>

      <Glass className="mt-4" delay={480}>
        <GlassTitle
          title="Legislație și reguli"
          hint="ultimele noutăți: creștere, sacrificare în gospodărie, vânzare directă"
          right={<Link href="/cont/gospodar/legislatie" className="text-xs text-[var(--pd-green)]">toate ↗</Link>}
        />
        <ul className="mt-3 divide-y divide-white/10">
          {legalNews.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              {e.createdAt > recentSince && <Pill>nou</Pill>}
              <span className="text-[var(--pd-muted)]">{legalKindLabels[e.kind]}</span>
              <a href={e.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[var(--pd-text)] hover:underline">
                {e.title}
              </a>
              {!e.verified && <Pill tone="muted">de verificat</Pill>}
            </li>
          ))}
        </ul>
      </Glass>

      {investments.length > 0 && (
        <section id="investitii" className="mt-4 scroll-mt-6">
          <h2 className="text-lg">Investiții de rambursat</h2>
          <p className="mt-1 text-sm text-slate-600">Echipamentele finanțate de investitori se rambursează în rate, la fiecare lot vândut.</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {investments.map((i) => (
              <div key={i.id}>
                <p className="mb-2 text-sm font-semibold">{i.title}</p>
                <RepaymentBox investment={i} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="teren" className="mt-4 scroll-mt-6 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg">Suprafața pentru creștere</h2>
        <p className="mt-1 text-sm text-slate-600">
          Fiecare țarc mobil ({GROWTH.birdsPerPen} de pui, mutat zilnic) are nevoie de ~{GROWTH.pastureM2PerPen} m² de pășune. Capacitatea pe lot
          = suprafața confirmată / {GROWTH.pastureM2PerPen} m² × {GROWTH.birdsPerPen} pui.
        </p>
        {typeof sp.eroareTeren === "string" && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{sp.eroareTeren}</p>}
        {sp.salvatTeren && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Trimis. Puii mei măsoară suprafața și o confirmă.</p>}
        <p className="mt-3 text-sm">
          {land?.verifiedM2 ? (
            <>
              <strong>Confirmată:</strong> {land.verifiedM2.toLocaleString("ro-RO")} m² ⇒ {pensForArea(land.verifiedM2)} țarcuri ⇒ maximum{" "}
              {pensForArea(land.verifiedM2) * GROWTH.birdsPerPen} pui / lot.
            </>
          ) : land?.declaredM2 ? (
            <><strong>În verificare:</strong> ai declarat {land.declaredM2.toLocaleString("ro-RO")} m²; urmează măsurarea în teren.</>
          ) : (
            <><strong>Nedeclarată.</strong> Fără suprafață confirmată nu poți crea loturi.</>
          )}
        </p>
        <form action={declareLandAction} className="mt-3 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="farmSlug" value={farm.slug} />
          <label className="text-sm font-semibold">Suprafața verde (m²)<input name="declaredM2" type="number" min={50} required defaultValue={land?.declaredM2} className={`${inputClasses} mt-1`} /></label>
          <label className="text-sm font-semibold sm:col-span-2">
            Actul de proprietate / folosință {land?.proofDocumentId ? "(încărcat; alege altul doar pentru înlocuire)" : ""}
            <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" required={!land?.proofDocumentId} className={`${inputClasses} mt-1`} />
          </label>
          <div className="sm:col-span-3"><button className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white">Trimite spre confirmare</button></div>
        </form>
      </section>

      <h2 id="loturi" className="mt-10 scroll-mt-6 text-2xl font-semibold">Loturi</h2>
      {typeof sp.eroareLot === "string" && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{sp.eroareLot}</p>}
      {typeof sp.lotNou === "string" && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Lotul {sp.lotNou} a fost creat și apare la precomandă.</p>}
      {typeof sp.lotPropus === "string" && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-900">Lotul {sp.lotPropus} a fost trimis spre aprobare. Apare la precomandă după ce îl aprobă Puii mei.</p>}
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
                {l.approval?.status === "asteapta" ? (
                  <span className="rounded bg-amber-300 px-2 py-0.5 text-xs font-semibold">Așteaptă aprobarea</span>
                ) : l.approval?.status === "respins" ? (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-900">Respins</span>
                ) : (
                  <LotStatusBadge status={status} />
                )}
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
            <LotAdminRow key={l.code} lot={l} returnTo={backTo} canApprove={user.role === "admin"} maxPens={limits.pens} orders={farmPreorders} ordersHref={backTo} />
          ))}
        </div>
        <h3 className="mt-6 mb-2 font-sans text-base font-semibold">Lot nou</h3>
        <p className="mb-3 text-sm text-slate-600">
          Limitele gospodăriei: maximum <strong>{limits.pens} țarcuri</strong> ({limits.birdsPerLot} păsări) pe lot, un lot pe rând, și{" "}
          <strong>{limits.birdsPerYear.toLocaleString("ro-RO")}</strong> pe an (în {thisYear}: {usedThisYear.toLocaleString("ro-RO")} folosite)
          {limits.reason ? ` – ${limits.reason}` : ""}. Sacrificarea se face în gospodărie, conform normelor sanitar-veterinare.
        </p>
        {blocked ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm">Crearea loturilor e oprită cât timp gospodăria e {standingLabels[gov!.standing].toLowerCase()}.</p>
        ) : (
          <NewLotForm farmSlug={farm.slug} returnTo={backTo} needsApproval={user.role !== "admin"} maxPens={limits.pens} />
        )}
      </details>

      <h2 className="mt-10 text-2xl font-semibold">Precomenzi pe loturile tale</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-forest-900/10 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-cream-100 text-xs uppercase tracking-wider text-muted">
            <tr>
              {["Nr.", "Client", "Pui", "Lot", "Livrare", "Status", "Avans", "Etichetă"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-900/5">
            {farmPreorders.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-muted">Nicio precomandă alocată încă pe loturile tale.</td></tr>
            )}
            {farmPreorders.map((p) => (
              <tr key={p.id} id={`comanda-${p.number}`} className="scroll-mt-24 target:bg-amber-50 target:ring-2 target:ring-amber-400">
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
                  <FeedCell preorder={p} amount={feedAdvance(p.birds, payment?.feedPricePerKg, payment?.chickPricePerBird).amount} canConfirm />
                </td>
                <td className="px-4 py-3">
                  <LabelCell preorderId={p.id} parcel={parcelById.get(p.id)} delivered={p.status === "livrata"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="plata-hrana" className="mt-10 scroll-mt-6 text-2xl font-semibold">Contul pentru avans (pui de o zi + furaj)</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Clienții văd aceste date pe pagina comenzii și plătesc avansul prin transfer, direct în contul tău, cu numărul comenzii
        în detalii. Tu confirmi primirea banilor în tabelul de mai sus.
      </p>
      {typeof sp.eroarePlata === "string" && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{sp.eroarePlata}</p>}
      {sp.salvatPlata && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Datele de plată au fost salvate.</p>}
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Pentru siguranța banilor, un cont bancar nou nu se folosește imediat: PUII MEI te sună la numărul tău cunoscut ca să
        confirmi, iar contul nou devine activ după 24 de ore. Prețurile se schimbă imediat.
      </p>
      {sp.ibanVerificare && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-900">
          Cererea de schimbare a contului a fost înregistrată. Te sună PUII MEI ca să confirmi; până atunci clienții plătesc în contul vechi.
        </p>
      )}
      {sp.ibanAnulat && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Cererea a fost anulată, iar PUII MEI a fost anunțat.</p>}
      {!payment?.iban && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Clienții nu pot plăti avansul până nu există un cont verificat. Completează datele; te sună PUII MEI să le confirmi.
        </p>
      )}
      {payment?.iban && (
        <p className="mt-3 text-sm">
          Contul activ (pe care îl văd clienții): <strong>{payment.holder}</strong> · <span className="font-mono">{payment.iban.replace(/(.{4})/g, "$1 ").trim()}</span>
          {payment.bank ? ` · ${payment.bank}` : ""}
        </p>
      )}
      {(payment?.ibanChange?.status === "in-verificare" || payment?.ibanChange?.status === "confirmat") && (
        <div id="iban-cerere" role="status" className="mt-3 max-w-3xl rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-300">
          <p>
            <strong>Schimbare de cont în verificare:</strong> {maskIban(payment.ibanChange.iban)} ({payment.ibanChange.holder}), cerută de{" "}
            {payment.ibanChange.requestedBy} la {formatDate(payment.ibanChange.requestedAt)}.
          </p>
          <p className="mt-1">
            {payment.ibanChange.status === "in-verificare"
              ? "Așteaptă apelul de confirmare de la PUII MEI."
              : `Confirmată telefonic; devine activă la ${new Date(payment.ibanChange.activatesAfter).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}.`}{" "}
            Până atunci clienții plătesc în contul activ.
          </p>
          <form action={reportUnrequestedIbanAction} className="mt-3">
            <input type="hidden" name="farmSlug" value={farm.slug} />
            <input type="hidden" name="changeId" value={payment.ibanChange.id} />
            <button className="rounded-lg bg-red-700 px-3 py-1.5 font-semibold text-white">Nu am cerut eu – anulează</button>
          </form>
        </div>
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
        <label className="text-sm font-semibold">
          Prețul puiului de o zi (lei / pui)
          <input name="chickPricePerBird" type="number" step="0.01" min="0.1" max="100" defaultValue={payment?.chickPricePerBird ?? pricing.chickPrice} required className={`${inputClasses} mt-1`} />
        </label>
        {payment?.iban && (
          <label className="text-sm font-semibold sm:col-span-2">
            Cod de confirmare din aplicație (doar dacă schimbi contul bancar)
            <input name="mfaCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={`${inputClasses} mt-1 w-40 text-center tracking-[0.3em]`} />
            {user.role === "gospodar" && !mfaEnabled(user) && (
              <span className="mt-1 block text-xs font-normal text-amber-800">
                Pentru schimbarea contului activează întâi codul de confirmare: <Link href="/cont/gospodar/securitate" className="underline">Securitate</Link>.
              </span>
            )}
          </label>
        )}
        <p className="text-xs text-slate-500 sm:col-span-2">
          Avansul plătit de client = puii de o zi + furajul (~{pricing.feedKgPerBird} kg / pui). Se scade din prețul total la livrare.
        </p>
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

/** Ce s-a adăugat în ultimele 30 de zile e marcat „nou”. */
function recentCutoff() {
  return new Date(Date.now() - 30 * 86400000).toISOString();
}
