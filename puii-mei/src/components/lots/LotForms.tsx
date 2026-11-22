import type { Lot } from "@/lib/domain";
import { speciesLabels } from "@/lib/products";
import { availableBirds, lotStatus, statusLabels } from "@/lib/lots";
import { createLotAction, decideLotAction, updateLotAction } from "@/app/(panou)/cont/gospodar/loturi-actions";

const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

function Fields({ lot, maxPerLot = 10000 }: { lot?: Lot; maxPerLot?: number }) {
  return (
    <>
      {!lot && (
        <label className="text-sm font-semibold">
          Specia
          <select name="species" defaultValue="pui" className={input}>
            {Object.entries(speciesLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      )}
      <label className="text-sm font-semibold">
        Data de început (puii de o zi intră în gospodărie)
        <input name="startDate" type="date" required defaultValue={lot?.startDate} className={input} />
      </label>
      <label className="text-sm font-semibold">
        Număr de păsări în lot
        <input name="totalBirds" type="number" min={5} max={maxPerLot} required defaultValue={lot?.totalBirds ?? 200} className={input} />
      </label>
      <label className="text-sm font-semibold">
        Durata creșterii (zile)
        <input name="growthDays" type="number" min={30} max={200} required defaultValue={lot?.growthDays ?? 60} className={input} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Rasa / tipul
        <input name="breed" defaultValue={lot?.breed ?? "Pui cu creștere lentă (hibrid de exterior)"} className={input} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Hrana
        <input name="feed" defaultValue={lot?.feed ?? "Furaje din cereale, fără promotori de creștere"} className={input} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Sacrificare
        <input name="processor" defaultValue={lot?.processor ?? "Sacrificare tradițională în gospodăria de creștere"} className={input} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Observații (apar la trasabilitate)
        <input name="notes" defaultValue={lot?.notes ?? ""} className={input} />
      </label>
    </>
  );
}

/** Formular pentru un lot nou. */
export function NewLotForm({ farmSlug, returnTo, needsApproval = false, maxPerLot }: { farmSlug: string; returnTo: string; needsApproval?: boolean; maxPerLot?: number }) {
  return (
    <form action={createLotAction} className="grid gap-4 rounded-xl bg-white p-5 ring-1 ring-slate-200 sm:grid-cols-2">
      <input type="hidden" name="farmSlug" value={farmSlug} />
      <input type="hidden" name="inapoi" value={returnTo} />
      <Fields maxPerLot={maxPerLot} />
      <div className="sm:col-span-2">
        <button className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white">{needsApproval ? "Trimite lotul spre aprobare" : "Creează lotul"}</button>
        <span className="ml-3 text-xs text-slate-500">
          Codul lotului se generează automat.{" "}
          {needsApproval ? "Lotul apare la precomandă după aprobarea Puii mei." : "Lotul apare imediat la precomandă."}
        </span>
      </div>
    </form>
  );
}

/** Rândul unui lot, cu editare și închidere / redeschidere pentru precomenzi. */
export function LotAdminRow({ lot, farmName, returnTo, canApprove = false }: { lot: Lot; farmName?: string; returnTo: string; canApprove?: boolean }) {
  const status = lotStatus(lot);
  return (
    <details className="rounded-xl bg-white ring-1 ring-slate-200">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
        <span>
          <span className="font-mono font-semibold">{lot.code}</span>
          {farmName && <span className="text-slate-500"> · {farmName}</span>}
          <span className="text-slate-500"> · start {lot.startDate} · {statusLabels[status]}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold">
            {lot.reservedBirds} / {lot.totalBirds} rezervați · {availableBirds(lot)} liberi
          </span>
          {lot.closed && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">închis la precomenzi</span>}
          {lot.approval?.status === "asteapta" && <span className="rounded bg-amber-300 px-2 py-0.5 text-xs font-semibold text-slate-900">așteaptă aprobarea</span>}
          {lot.approval?.status === "respins" && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-900">respins</span>}
        </span>
      </summary>
      {lot.approval?.status === "respins" && lot.approval.reason && (
        <p className="border-t border-slate-200 bg-red-50 px-4 py-2 text-sm text-red-900">
          Motivul respingerii: {lot.approval.reason}. Corectează și salvează; lotul intră din nou la aprobare.
        </p>
      )}
      {canApprove && lot.approval?.status === "asteapta" && (
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-200 bg-amber-50 px-4 py-3">
          <p className="w-full text-xs text-slate-600">Propus de {lot.createdBy}. Verifică datele, apoi decide.</p>
          <form action={decideLotAction}>
            <input type="hidden" name="code" value={lot.code} />
            <input type="hidden" name="inapoi" value={returnTo} />
            <input type="hidden" name="decision" value="aproba" />
            <button className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white">Aprobă lotul</button>
          </form>
          <form action={decideLotAction} className="flex items-end gap-2">
            <input type="hidden" name="code" value={lot.code} />
            <input type="hidden" name="inapoi" value={returnTo} />
            <input type="hidden" name="decision" value="respinge" />
            <label className="text-xs font-semibold">Motiv<input name="reason" className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" /></label>
            <button className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white">Respinge</button>
          </form>
        </div>
      )}
      <form action={updateLotAction} className="grid gap-4 border-t border-slate-200 p-4 sm:grid-cols-2">
        <input type="hidden" name="code" value={lot.code} />
        <input type="hidden" name="inapoi" value={returnTo} />
        <Fields lot={lot} />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white">Salvează lotul</button>
        </div>
      </form>
      <form action={updateLotAction} className="border-t border-slate-200 px-4 py-3">
        <input type="hidden" name="code" value={lot.code} />
        <input type="hidden" name="inapoi" value={returnTo} />
        <input type="hidden" name="toggle" value="1" />
        <button className="text-sm font-semibold text-slate-700 underline">
          {lot.closed ? "Redeschide lotul pentru precomenzi" : "Închide lotul pentru precomenzi"}
        </button>
      </form>
    </details>
  );
}
