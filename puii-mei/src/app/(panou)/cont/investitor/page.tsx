import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { investmentStatusLabels } from "@/lib/documents";
import { formatDate, formatLei } from "@/lib/format";
import { site } from "@/lib/site";
import { farmRepository } from "@/server/repositories/catalog";
import { documentRepository, investmentRepository } from "@/server/repositories/documents";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contul investitorului", robots: { index: false, follow: false } };

export default async function InvestorDashboard() {
  const user = await requireUser(["investitor"], "/cont/investitor");
  const [investments, farms, docs] = await Promise.all([
    user.role === "admin" ? investmentRepository.list() : investmentRepository.byInvestor(user.id),
    farmRepository.listAll(),
    documentRepository.list(),
  ]);
  const farmName = new Map(farms.map((f) => [f.slug, f.name]));
  const counted = investments.filter((i) => i.status === "semnata" || i.status === "activa" || i.status === "finalizata");
  const myDocs = docs.filter((d) => d.investmentId && investments.some((i) => i.id === d.investmentId));
  const lastEvents = investments
    .flatMap((i) => i.events.map((e) => ({ ...e, investment: i })))
    .sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at))
    .slice(0, 6);

  return (
    <Container className="max-w-5xl py-8">
      <h1>Bun venit, {user.name.split(" ")[0]}!</h1>
      <p className="mt-1 text-sm text-slate-600">Investițiile tale în rețeaua Puii mei, cu actele și evoluția fiecăreia.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Total investit (contracte semnate)" value={formatLei(counted.reduce((s, i) => s + i.amount, 0))} />
        <Stat label="Investiții active" value={String(investments.filter((i) => i.status === "activa").length)} />
        <Stat label="Contracte și acte" value={String(myDocs.length)} />
      </div>

      <h2 className="mt-10 text-xl">Investițiile mele</h2>
      {!investments.length && (
        <p className="mt-3 rounded-xl bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">
          Nu ai încă investiții înregistrate. După semnarea contractului, investiția apare aici cu toate actele. Întrebări:{" "}
          <a href={`mailto:${site.company.email}`} className="font-semibold text-forest-700 underline">{site.company.email}</a>.
        </p>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {investments.map((i) => (
          <Link key={i.id} href={`/cont/investitor/${i.id}`} className="rounded-xl bg-white p-5 ring-1 ring-slate-200 hover:ring-slate-400">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">{i.title}</p>
              <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold">{investmentStatusLabels[i.status]}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{formatLei(i.amount)}</p>
            <p className="mt-1 text-sm text-slate-600">
              {formatDate(i.date)}
              {i.farmSlug ? ` · ${farmName.get(i.farmSlug) ?? ""}` : ""}
              {i.terms ? ` · ${i.terms}` : ""}
            </p>
          </Link>
        ))}
      </div>

      {lastEvents.length > 0 && (
        <>
          <h2 className="mt-10 text-xl">Noutăți</h2>
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
            {lastEvents.map((e, k) => (
              <li key={k} className="px-4 py-3 text-sm">
                <span className="text-slate-500">{formatDate(e.date)} · </span>
                <span className="font-semibold">{e.title}</span>
                {e.text && <span className="text-slate-600"> – {e.text}</span>}
                <span className="text-slate-400"> ({e.investment.title})</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-10 rounded-xl bg-white p-5 text-sm ring-1 ring-slate-200">
        <p className="font-semibold">Datele contului</p>
        <p className="mt-1 text-slate-600">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
      </div>
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
