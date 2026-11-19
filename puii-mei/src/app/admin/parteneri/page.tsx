import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { applicationRepository, applicationStatusLabels, investorRepository } from "@/server/repositories/applications";
import { dsvLabels, investmentRangeLabels, investorTypeLabels } from "@/lib/validation/partner";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { FarmApplicationStatus, InvestorApplication } from "@/lib/domain";
import { createFarmFromApplication, updateApplication, updateInvestorApplication } from "../partner-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Solicitări parteneri", robots: { index: false, follow: false } };

const badge: Record<FarmApplicationStatus, string> = {
  noua: "bg-grain-300/70 text-forest-900",
  "in-evaluare": "bg-cream-200 text-forest-900",
  "vizita-programata": "bg-forest-100 text-forest-800",
  aprobata: "bg-forest-700 text-white",
  respinsa: "bg-ink/5 text-muted",
};

export default async function PartnerApplicationsPage({ searchParams }: PageProps<"/admin/parteneri">) {
  const { status, tip } = await searchParams;
  const investorsTab = tip === "investitori";
  const [farmApps, investorApps] = await Promise.all([applicationRepository.list(), investorRepository.list()]);
  const all: { status: FarmApplicationStatus }[] = investorsTab ? investorApps : farmApps;
  const filter = typeof status === "string" && status in applicationStatusLabels ? (status as FarmApplicationStatus) : null;
  const apps = filter ? farmApps.filter((a) => a.status === filter) : farmApps;
  const investors = filter ? investorApps.filter((a) => a.status === filter) : investorApps;
  const base = investorsTab ? "/admin/parteneri?tip=investitori" : "/admin/parteneri";
  const join = investorsTab ? "&" : "?";
  const newCount = (list: { status: FarmApplicationStatus }[]) => list.filter((a) => a.status === "noua").length;

  return (
    <Container className="py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Solicitări de parteneriat</h1>
          <p className="mt-1 text-sm text-muted">
            Gospodării și investitori care au aplicat prin pagina{" "}
            <Link href="/devino-partener" className="font-semibold text-forest-700 underline">Devino partener</Link>.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-6 border-b border-forest-900/10 text-sm font-semibold">
        <TabLink href="/admin/parteneri" active={!investorsTab} label="Gospodării" count={newCount(farmApps)} />
        <TabLink href="/admin/parteneri?tip=investitori" active={investorsTab} label="Investitori" count={newCount(investorApps)} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <FilterLink href={base} active={!filter} label={`Toate (${all.length})`} />
        {(Object.keys(applicationStatusLabels) as FarmApplicationStatus[]).map((s) => (
          <FilterLink
            key={s}
            href={`${base}${join}status=${s}`}
            active={filter === s}
            label={`${applicationStatusLabels[s]} (${all.filter((a) => a.status === s).length})`}
          />
        ))}
      </div>

      {investorsTab ? (
        <InvestorList items={investors} />
      ) : (
      <ul className="mt-6 space-y-4">
        {apps.length === 0 && (
          <li className="rounded-2xl bg-white p-6 text-muted ring-1 ring-forest-900/10">Nicio solicitare în această categorie.</li>
        )}
        {apps.map((a) => (
          <li key={a.id} className="rounded-3xl bg-white p-5 ring-1 ring-forest-900/10 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-semibold text-forest-900">{a.farmName || a.name}</p>
                <p className="text-sm text-muted">
                  {a.village}, jud. {a.county} · trimisă {formatDate(a.createdAt)}
                </p>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", badge[a.status])}>
                {applicationStatusLabels[a.status]}
              </span>
            </div>

            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Item label="Persoană de contact" value={a.name} />
              <Item label="Telefon / email" value={`${a.phone} · ${a.email}`} />
              <Item label="Capacitate estimată" value={`${a.capacity} pui / lot`} />
              <Item label="Experiență" value={`${a.experienceYears} ani`} />
              <Item label="DSV" value={dsvLabels[a.dsvStatus]} />
              <Item label="Adăpost" value={a.hasShelter ? "Da" : "Nu"} />
              <Item label="Padoc / teren" value={a.hasOutdoorArea ? "Da" : "Nu"} />
              <Item
                label="Ar putea produce și"
                value={
                  [a.canTurkeys && "curcani", a.canDucks && "rațe", a.canPheasants && "fazani", a.hasGreenhouse && "legume din seră"]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
            </dl>
            {a.message && <p className="mt-4 whitespace-pre-line rounded-2xl bg-cream-100 p-4 text-sm">{a.message}</p>}

            <form action={updateApplication} className="mt-5 grid gap-3 border-t border-forest-900/10 pt-5 sm:grid-cols-[200px_1fr_auto] sm:items-start">
              <input type="hidden" name="id" value={a.id} />
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-forest-900">Status</span>
                <select name="status" defaultValue={a.status} className="w-full rounded-xl border border-forest-900/15 bg-white px-3 py-2">
                  {Object.entries(applicationStatusLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-forest-900">Note interne</span>
                <textarea name="internalNote" defaultValue={a.internalNote} rows={2} placeholder="Ex. vizită stabilită pe 12 decembrie" className="w-full rounded-xl border border-forest-900/15 bg-white px-3 py-2" />
              </label>
              <button className="rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white sm:mt-6">Salvează</button>
            </form>

            <div className="mt-3">
              {a.farmSlug ? (
                <Link href={`/admin/gospodarii/${a.farmSlug}`} className="text-sm font-semibold text-forest-700 underline">
                  Vezi profilul gospodăriei →
                </Link>
              ) : (
                <form action={createFarmFromApplication}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="rounded-full bg-grain-400 px-5 py-2.5 text-sm font-semibold text-forest-900 hover:bg-grain-500">
                    Aprobă și creează profilul gospodăriei
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
      )}
    </Container>
  );
}

function InvestorList({ items }: { items: InvestorApplication[] }) {
  if (items.length === 0) {
    return <p className="mt-6 rounded-2xl bg-white p-6 text-muted ring-1 ring-forest-900/10">Nicio solicitare în această categorie.</p>;
  }
  return (
    <ul className="mt-6 space-y-4">
      {items.map((a) => {
        const interests = [
          a.interestLots && "Finanțarea loturilor",
          a.interestInfrastructure && "Adăposturi și echipamente",
          a.interestExpansion && "Extindere regională",
        ].filter(Boolean);
        return (
          <li key={a.id} className="rounded-3xl bg-white p-5 ring-1 ring-forest-900/10 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-semibold text-forest-900">{a.company || a.name}</p>
                <p className="text-sm text-muted">
                  {investorTypeLabels[a.investorType]} · trimisă {formatDate(a.createdAt)}
                </p>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", badge[a.status])}>
                {applicationStatusLabels[a.status]}
              </span>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Item label="Persoană de contact" value={a.name} />
              <Item label="Telefon / email" value={`${a.phone} · ${a.email}`} />
              <Item label="Interval orientativ" value={investmentRangeLabels[a.amountRange]} />
              <Item label="Regiune" value={a.region || "—"} />
              <Item label="Interese" value={interests.join(", ")} />
            </dl>
            {a.message && <p className="mt-4 whitespace-pre-line rounded-2xl bg-cream-100 p-4 text-sm">{a.message}</p>}
            <form action={updateInvestorApplication} className="mt-5 grid gap-3 border-t border-forest-900/10 pt-5 sm:grid-cols-[200px_1fr_auto] sm:items-start">
              <input type="hidden" name="id" value={a.id} />
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-forest-900">Status</span>
                <select name="status" defaultValue={a.status} className="w-full rounded-xl border border-forest-900/15 bg-white px-3 py-2">
                  {Object.entries(applicationStatusLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-forest-900">Note interne</span>
                <textarea name="internalNote" defaultValue={a.internalNote} rows={2} placeholder="Ex. întâlnire stabilită pe 5 decembrie" className="w-full rounded-xl border border-forest-900/15 bg-white px-3 py-2" />
              </label>
              <button className="rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white sm:mt-6">Salvează</button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

function TabLink({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("-mb-px inline-flex items-center gap-2 border-b-2 pb-3", active ? "border-forest-800 text-forest-900" : "border-transparent text-muted hover:text-forest-800")}
    >
      {label}
      {count > 0 && <span className="rounded-full bg-grain-400 px-2 py-0.5 text-xs text-forest-900">{count}</span>}
    </Link>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1.5 font-medium",
        active ? "bg-forest-800 text-white" : "bg-white text-forest-800 ring-1 ring-forest-900/10",
      )}
    >
      {label}
    </Link>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted">{label}</dt>
      <dd className="break-words font-medium text-forest-900">{value}</dd>
    </div>
  );
}
