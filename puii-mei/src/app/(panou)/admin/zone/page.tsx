import type { Metadata } from "next";
import type { DeliveryZone } from "@/lib/domain";
import { Container } from "@/components/ui/Container";
import { formatDate, formatLei } from "@/lib/format";
import { zoneRepository } from "@/server/repositories/catalog";
import { deliverySettingsRepository } from "@/server/repositories/settings";
import { saveFreeDeliveryAction, saveZoneAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Zone de livrare", robots: { index: false, follow: false } };

const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal";
const SPECIAL: Record<string, string> = {
  "ridicare-personala": "Clientul ridică singur; fără adresă.",
  "alta-zona": "Listă de așteptare pentru zone fără livrare.",
};

function ZoneForm({ z }: { z?: DeliveryZone & { updatedAt?: string; updatedBy?: string } }) {
  return (
    <form action={saveZoneAction} className="grid gap-3 sm:grid-cols-2">
      {z && <input type="hidden" name="id" value={z.id} />}
      <label className="text-sm font-semibold">Numele zonei
        <input name="name" required defaultValue={z?.name} className={input} />
      </label>
      <label className="text-sm font-semibold">Ziua de livrare
        <input name="deliveryDay" defaultValue={z?.deliveryDay} placeholder="Ex. Sâmbătă" className={input} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">Localitățile acoperite
        <input name="localities" defaultValue={z?.localities} placeholder="Ex. Câmpulung Moldovenesc, Pojorâta, Vama" className={input} />
      </label>
      <label className="text-sm font-semibold">Taxa de livrare (lei; 0 = gratuit)
        <input name="fee" type="number" step="0.5" min="0" max="500" required defaultValue={z?.fee ?? 20} className={input} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm font-semibold">Centru: lat.
          <input name="lat" inputMode="decimal" defaultValue={z?.center?.lat} placeholder="47.53" className={input} />
        </label>
        <label className="text-sm font-semibold">long.
          <input name="lng" inputMode="decimal" defaultValue={z?.center?.lng} placeholder="25.55" className={input} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="active" defaultChecked={z ? z.active : true} className="h-4 w-4" /> Activă (apare la precomandă)
      </label>
      <div className="flex items-center justify-end sm:col-span-1">
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">{z ? "Salvează zona" : "Adaugă zona"}</button>
      </div>
    </form>
  );
}

export default async function ZonesPage({ searchParams }: PageProps<"/admin/zone">) {
  const sp = await searchParams;
  const [zones, delivery] = await Promise.all([zoneRepository.listAll(), deliverySettingsRepository.get()]);

  return (
    <Container className="max-w-4xl py-8">
      <h1>Zone de livrare</h1>
      <p className="mt-1 text-sm text-slate-600">
        Zonele, localitățile, ziua și taxa de livrare. Modificările se văd imediat la precomandă; comenzile deja plasate își
        păstrează taxa de atunci. O zonă dezactivată nu mai apare la precomandă, dar comenzile vechi o păstrează.
      </p>
      {typeof sp.salvat === "string" && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-900">Salvat: {sp.salvat}.</p>}
      {typeof sp.eroare === "string" && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">{sp.eroare}</p>}

      <form action={saveFreeDeliveryAction} className="mt-6 flex flex-wrap items-end gap-3 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <label className="text-sm font-semibold">Livrare gratuită pentru comenzi de peste (lei; 0 = niciodată)
          <input name="freeDeliveryFrom" type="number" min="0" max="100000" step="10" defaultValue={delivery.freeDeliveryFrom} className={`${input} max-w-48`} />
        </label>
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Salvează pragul</button>
        {delivery.updatedAt && <p className="w-full text-xs text-slate-500">Modificat {formatDate(delivery.updatedAt)} · {delivery.updatedBy}</p>}
      </form>

      <h2 className="mt-8 text-lg">Zonele ({zones.filter((z) => z.active).length} active din {zones.length})</h2>
      <div className="mt-3 space-y-3">
        {zones.map((z) => (
          <details key={z.id} id={`zona-${z.id}`} className="rounded-xl bg-white ring-1 ring-slate-200">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
              <span>
                <span className="font-semibold">{z.name}</span>
                <span className="block text-xs text-slate-500">{z.localities}</span>
              </span>
              <span className="flex items-center gap-2 text-sm">
                <span>{z.fee > 0 ? formatLei(z.fee) : "Gratuit"} · {z.deliveryDay}</span>
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${z.active ? "bg-green-100 text-green-900" : "bg-slate-200 text-slate-600"}`}>{z.active ? "Activă" : "Inactivă"}</span>
              </span>
            </summary>
            <div className="border-t border-slate-100 p-4">
              {SPECIAL[z.id] && <p className="mb-3 text-xs text-slate-500">Zonă specială: {SPECIAL[z.id]}</p>}
              <ZoneForm z={z} />
              {z.updatedAt && <p className="mt-2 text-xs text-slate-500">Modificată {formatDate(z.updatedAt)} · {z.updatedBy}</p>}
            </div>
          </details>
        ))}
      </div>

      <h2 className="mt-8 text-lg">Zonă nouă</h2>
      <div className="mt-3 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <ZoneForm />
      </div>
    </Container>
  );
}
