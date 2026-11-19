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
import { headers } from "next/headers";
import { CopyLink } from "@/components/admin/CopyLink";
import { confirmationRepository } from "@/server/repositories/confirmations";
import { CONFIRMATION_WINDOW_HOURS, confirmationState, confirmationStateLabels } from "@/lib/confirmation";
import { emailEnabled } from "@/server/email";
import type { ConfirmationState } from "@/lib/domain";
import { storageKind } from "@/server/db/store";

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
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "www.puiimei.ro";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  const confirmations = new Map((await confirmationRepository.list()).map((c) => [c.id, c]));
  const [preorders, messages, lots, farms, zones] = await Promise.all([
    preorderRepository.list(),
    contactRepository.list(),
    lotRepository.list(),
    farmRepository.listAll(),
    zoneRepository.listActive(),
  ]);
  const farmName = new Map(farms.map((f) => [f.slug, f.name]));
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
      {!emailEnabled() && (
        <p className="mt-4 rounded-2xl bg-cream-100 p-4 text-sm text-forest-900">
          Emailurile automate nu sunt configurate. La marcarea „Livrată”, linkul de confirmare apare în tabel: trimite-l
          clientului pe WhatsApp sau copiază-l. Clientul are {CONFIRMATION_WINDOW_HOURS} ore să confirme.
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
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="bg-cream-100 text-xs uppercase tracking-wider text-muted">
            <tr>
              {["Nr.", "Data", "Client", "Pui", "Lot", "Zonă", "Valoare", "Status", "Confirmare primire"].map((h) => (
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
                <td className="px-4 py-3 font-mono text-xs">{p.number}</td>
                <td className="px-4 py-3">{formatDate(p.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.customer.name}</div>
                  <div className="text-muted">{p.customer.phone} · {p.customer.email}</div>
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
                </td>
                <td className="px-4 py-3">{zoneName.get(p.zoneId) ?? p.zoneId}</td>
                <td className="px-4 py-3">{formatLei(p.estimate.total)}</td>
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
                <td className="px-4 py-3">
                  <ConfirmationCell
                    confirmation={confirmations.get(p.id)}
                    origin={origin}
                    phone={p.customer.phone}
                    number={p.number}
                  />
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

const stateBadge: Record<ConfirmationState, string> = {
  asteapta: "bg-grain-300/60 text-forest-900",
  confirmat: "bg-forest-100 text-forest-800",
  problema: "bg-red-100 text-red-800",
  expirat: "bg-ink/5 text-muted",
};

function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0040/, "40").replace(/^0/, "40");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function ConfirmationCell({
  confirmation,
  origin,
  phone,
  number,
}: {
  confirmation?: import("@/lib/domain").DeliveryConfirmation;
  origin: string;
  phone: string;
  number: string;
}) {
  if (!confirmation) return <span className="text-xs text-muted">Se creează la „Livrată”</span>;
  const state = confirmationState(confirmation);
  const url = `${origin}/confirmare/${confirmation.token}`;
  return (
    <div className="space-y-1.5">
      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${stateBadge[state]}`}>
        {confirmationStateLabels[state]}
      </span>
      {confirmation.answers && (
        <p className="text-xs text-muted">
          Note: gospodărie {confirmation.answers.ratingFarm}/5 · curier {confirmation.answers.ratingCourier}/5 · Puii mei{" "}
          {confirmation.answers.ratingPlatform}/5
        </p>
      )}
      {state === "asteapta" && (
        <div className="flex flex-wrap gap-1.5">
          <CopyLink url={url} />
          <a
            href={whatsappLink(phone, `Bună! Te rugăm să confirmi primirea comenzii ${number} în ${CONFIRMATION_WINDOW_HOURS} ore: ${url}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[#25D366]/15 px-2.5 py-1 text-xs font-semibold text-forest-900 ring-1 ring-[#25D366]/40"
          >
            WhatsApp
          </a>
          {confirmation.sentByEmail && <span className="text-xs text-muted">trimis pe email</span>}
        </div>
      )}
      {!confirmation.firstOpenedAt && state === "asteapta" && <p className="text-xs text-muted">Nedeschis încă</p>}
    </div>
  );
}
