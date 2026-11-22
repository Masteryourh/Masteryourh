import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { LotStatusBadge } from "@/components/lots/LotStatusBadge";
import { preorderRepository } from "@/server/repositories/preorders";
import { contactRepository } from "@/server/repositories/contact";
import { farmRepository, lotRepository, zoneRepository } from "@/server/repositories/catalog";
import { availableBirds, lotStatus } from "@/lib/lots";
import { formatDate, formatLei } from "@/lib/format";
import type { PreorderStatus } from "@/lib/domain";
import { updatePreorderLot, updatePreorderStatus } from "./actions";
import { storageKind } from "@/server/db/store";
import { FeedCell } from "@/components/orders/FeedCell";
import { CopyButton } from "@/components/orders/CopyButton";
import { feedAdvance } from "@/lib/pricing";
import { site } from "@/lib/site";
import { farmPaymentRepository } from "@/server/repositories/farm-payments";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administrare", robots: { index: false, follow: false } };

const statusLabels: Record<PreorderStatus, string> = {
  noua: "Nouă",
  confirmata: "Confirmată",
  "alocata-lot": "Alocată pe lot",
  "in-livrare": "În livrare",
  livrata: "Livrată",
  anulata: "Anulată",
};

export default async function AdminPage() {
  const [preorders, messages, lots, farms, zones] = await Promise.all([
    preorderRepository.list(),
    contactRepository.list(),
    lotRepository.list(),
    farmRepository.listAll(),
    zoneRepository.listActive(),
  ]);
  const farmName = new Map(farms.map((f) => [f.slug, f.name]));
  const lotFarm = new Map(lots.map((l) => [l.code, l.farmSlug]));
  const payments = new Map(
    (await Promise.all(farms.map((f) => farmPaymentRepository.bySlug(f.slug)))).filter((x) => x !== null).map((x) => [x.id, x]),
  );
  const zoneName = new Map(zones.map((z) => [z.id, z.name]));
  const active = preorders.filter((p) => p.status !== "anulata");
  const totalBirds = active.reduce((s, p) => s + p.birds, 0);
  const totalValue = active.reduce((s, p) => s + p.estimate.total, 0);

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-semibold">Precomenzi și mesaje</h1>
      {storageKind === "temporar" && (
        <p role="alert" className="mt-6 rounded-2xl bg-grain-300/40 p-4 text-sm text-forest-900">
          <strong>Stocare temporară.</strong> Precomenzile se păstrează doar în memoria temporară a serverului și se pot
          pierde. Conectează o bază de date PostgreSQL (Vercel → Storage → Neon) ca să le salvezi permanent.
        </p>
      )}
      {storageKind === "postgres" && (
        <p className="mt-4 text-sm text-forest-700">Datele sunt salvate în baza de date PostgreSQL.</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Stat label="Precomenzi active" value={String(active.length)} />
        <Stat label="Pui comandați" value={String(totalBirds)} />
        <Stat label="Valoare estimativă" value={formatLei(totalValue)} />
        <Stat label="Mesaje" value={String(messages.length)} />
      </div>

      <h2 className="mt-12 text-2xl font-semibold">Precomenzi</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-forest-900/10 bg-white">
        <table className="w-full min-w-[1250px] text-left text-sm">
          <thead className="bg-cream-100 text-xs uppercase tracking-wider text-muted">
            <tr>
              {["Nr.", "Data", "Client", "Pui", "Lot", "Zonă", "Valoare", "Avans", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-900/5">
            {preorders.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-muted">Nicio precomandă încă.</td></tr>
            )}
            {preorders.map((p) => (
              <tr key={p.id} className="align-top">
                <td className="px-4 py-3 font-mono text-xs">
                  {p.number}
                  {p.parentNumber && <div className="mt-1 text-[10px] text-slate-500">parte din {p.parentNumber}</div>}
                  {!p.lotCode && p.allocation?.status === "alegere" && <div className="mt-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">clientul alege</div>}
                  {!p.lotCode && p.allocation?.status === "asteapta" && <div className="mt-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold">în așteptare</div>}
                  {p.trackingToken && (
                    <div className="mt-1.5">
                      <CopyButton value={`${site.url}/comanda/${p.trackingToken}`} label="Link client" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{formatDate(p.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.customer.name}</div>
                  <div className="text-muted">{p.customer.phone} · {p.customer.email}</div>
                  {p.accessPin?.manual && manualPinActive(p.accessPin.expiresAt) && (
                    <div className="mt-1.5 rounded-lg bg-amber-100 p-2 text-xs text-amber-950">
                      Clientul a cerut PIN (SMS neconfigurat): <strong className="font-mono text-sm">{p.accessPin.manual}</strong>{" "}
                      <a
                        href={`https://wa.me/${p.customer.phone.replace(/\D/g, "").replace(/^0/, "40")}?text=${encodeURIComponent(`Puii mei: PIN-ul pentru comanda ${p.number} este ${p.accessPin.manual}. Valabil 24 de ore.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline"
                      >
                        Trimite pe WhatsApp
                      </a>
                    </div>
                  )}
                  {p.address && <div className="text-muted">{p.address}</div>}
                  {p.notes && <div className="mt-1 text-xs italic text-muted">„{p.notes}”</div>}
                </td>
                <td className="px-4 py-3">{p.birds}</td>
                <td className="px-4 py-3">
                  <form action={updatePreorderLot} className="flex flex-col gap-1.5">
                    <input type="hidden" name="id" value={p.id} />
                    <select name="lotCode" defaultValue={p.lotCode ?? ""} className="rounded-lg border border-forest-900/15 px-2 py-1 font-mono text-xs">
                      <option value="">primul disponibil</option>
                      {lots.map((l) => (
                        <option key={l.code} value={l.code}>{l.code} · {farmName.get(l.farmSlug)}</option>
                      ))}
                    </select>
                    <button className="self-start rounded-lg px-2 py-0.5 text-xs font-semibold text-forest-800 ring-1 ring-forest-900/15">Alocă lotul</button>
                  </form>
                  {p.location ? (
                    <a href={`https://www.google.com/maps?q=${p.location.lat},${p.location.lng}`} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs font-semibold text-forest-700 underline">Pin pe hartă</a>
                  ) : (
                    !["ridicare-personala", "alta-zona"].includes(p.zoneId) && <span className="mt-1 block text-xs text-red-700">fără pin</span>
                  )}
                </td>
                <td className="px-4 py-3">{zoneName.get(p.zoneId) ?? p.zoneId}</td>
                <td className="px-4 py-3">{formatLei(p.estimate.total)}</td>
                <td className="px-4 py-3">
                  {p.lotCode ? (
                    <FeedCell
                      preorder={p}
                      amount={feedAdvance(p.birds, payments.get(lotFarm.get(p.lotCode) ?? "")?.feedPricePerKg, payments.get(lotFarm.get(p.lotCode) ?? "")?.chickPricePerBird).amount}
                      canConfirm
                    />
                  ) : (
                    <span className="text-xs text-muted">după alocarea lotului</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <form action={updatePreorderStatus} className="flex gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <select name="status" defaultValue={p.status} className="rounded-lg border border-forest-900/15 px-2 py-1">
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button className="rounded-lg bg-forest-700 px-3 py-1 text-white">Salvează</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-2xl font-semibold">Loturi</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-forest-900/10 bg-white">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-cream-100 text-xs uppercase tracking-wider text-muted">
            <tr>
              {["Cod", "Gospodărie", "Start", "Status", "Rezervați / total", "Libere"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-900/5">
            {lots.map((l) => (
              <tr key={l.code}>
                <td className="px-4 py-3 font-mono text-xs">{l.code}</td>
                <td className="px-4 py-3">{farmName.get(l.farmSlug)}</td>
                <td className="px-4 py-3">{formatDate(l.startDate)}</td>
                <td className="px-4 py-3"><LotStatusBadge status={lotStatus(l)} /></td>
                <td className="px-4 py-3">{l.reservedBirds} / {l.totalBirds}</td>
                <td className="px-4 py-3">{availableBirds(l)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-2xl font-semibold">Mesaje de contact</h2>
      <ul className="mt-4 space-y-3">
        {messages.length === 0 && <li className="text-muted">Niciun mesaj.</li>}
        {messages.map((m) => (
          <li key={m.id} className="rounded-2xl border border-forest-900/10 bg-white p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-semibold">{m.subject}</span>
              <span className="text-muted">{formatDate(m.createdAt)}</span>
            </div>
            <p className="text-muted">{m.name} · {m.email}{m.phone ? ` · ${m.phone}` : ""}</p>
            <p className="mt-2 whitespace-pre-line">{m.message}</p>
          </li>
        ))}
      </ul>
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-forest-900/10">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-forest-900">{value}</p>
    </div>
  );
}

/** PIN-ul de acces cerut de client, încă valabil (pentru trimiterea manuală). */
function manualPinActive(expiresAt: string) {
  return Date.parse(expiresAt) > Date.now();
}
