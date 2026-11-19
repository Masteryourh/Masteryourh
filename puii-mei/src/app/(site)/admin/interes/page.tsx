import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { interestRepository } from "@/server/repositories/interest";
import { applicationRepository } from "@/server/repositories/applications";
import { upcomingProducts } from "@/lib/products";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Interes produse", robots: { index: false, follow: false } };

export default async function InterestAdminPage() {
  const [signups, farmApps] = await Promise.all([interestRepository.list(), applicationRepository.list()]);

  const counties = [...new Set(signups.map((s) => s.county))];
  const rows = counties
    .map((county) => {
      const inCounty = signups.filter((s) => s.county === county);
      return {
        county,
        total: inCounty.length,
        byProduct: Object.fromEntries(
          upcomingProducts.map((p) => [p.id, inCounty.filter((s) => s.products.includes(p.id)).length]),
        ) as Record<string, number>,
      };
    })
    .sort((a, b) => b.total - a.total);
  const totals = Object.fromEntries(
    upcomingProducts.map((p) => [p.id, signups.filter((s) => s.products.includes(p.id)).length]),
  ) as Record<string, number>;

  const supply = {
    curcani: farmApps.filter((a) => a.canTurkeys).length,
    rate: farmApps.filter((a) => a.canDucks).length,
    fazani: farmApps.filter((a) => a.canPheasants).length,
    "legume-sera": farmApps.filter((a) => a.hasGreenhouse).length,
  } as Record<string, number>;

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-semibold">Interes pentru produse noi</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Înscrieri prin pagina <Link href="/in-curand" className="font-semibold text-forest-700 underline">În curând</Link>,
        pe județe, comparate cu gospodăriile care au spus că pot produce aceste produse.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {upcomingProducts.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white p-5 ring-1 ring-forest-900/10">
            <p className="text-sm text-muted">{p.name}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-forest-900 tabular-nums">{totals[p.id]}</p>
            <p className="mt-1 text-xs text-muted">
              clienți interesați · {supply[p.id]} {supply[p.id] === 1 ? "gospodărie poate produce" : "gospodării pot produce"}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-semibold">Pe județe</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-forest-900/10 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm tabular-nums">
          <thead className="bg-cream-100 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Județ</th>
              <th className="px-4 py-3 font-semibold">Înscrieri</th>
              {upcomingProducts.map((p) => (
                <th key={p.id} className="px-4 py-3 font-semibold">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-900/5">
            {rows.length === 0 && (
              <tr><td colSpan={2 + upcomingProducts.length} className="px-4 py-6 text-center text-muted">Nicio înscriere încă.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.county}>
                <td className="px-4 py-3 font-medium">{r.county}</td>
                <td className="px-4 py-3">{r.total}</td>
                {upcomingProducts.map((p) => (
                  <td key={p.id} className="px-4 py-3">{r.byProduct[p.id] || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-2xl font-semibold">Înscrieri</h2>
      <ul className="mt-4 space-y-2">
        {signups.length === 0 && <li className="text-muted">Nicio înscriere încă.</li>}
        {signups.map((s) => (
          <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl bg-white p-4 text-sm ring-1 ring-forest-900/10">
            <span className="font-semibold">{s.name}</span>
            <span className="text-muted">{s.email}{s.phone ? ` · ${s.phone}` : ""}</span>
            <span>{s.county}</span>
            <span className="text-forest-700">
              {s.products.map((id) => upcomingProducts.find((p) => p.id === id)?.name).join(", ")}
            </span>
            <span className="text-muted">{formatDate(s.createdAt)}</span>
          </li>
        ))}
      </ul>
    </Container>
  );
}
