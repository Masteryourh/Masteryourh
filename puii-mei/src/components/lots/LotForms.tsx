import type { Lot, Preorder } from "@/lib/domain";
import { penOrders } from "@/lib/order-pens";
import { speciesLabels } from "@/lib/products";
import { availableBirds, lotStatus, statusLabels } from "@/lib/lots";
import { createLotAction, decideLotAction, startPenAction, updateLotAction } from "@/app/(panou)/cont/gospodar/loturi-actions";
import { GROWTH, lotPens, penStateLabels, penView } from "@/lib/growth";

const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

function Fields({ lot, maxPens: maxPensProp }: { lot?: Lot; maxPens?: number }) {
  const maxPens = maxPensProp ?? 250;
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
        Data estimată de pornire (primul țarc)
        <input name="startDate" type="date" required defaultValue={lot?.startDate} className={input} />
      </label>
      <label className="text-sm font-semibold">
        Număr de țarcuri ({GROWTH.birdsPerPen} de pui / țarc)
        <input
          name="pens"
          type="number"
          min={1}
          max={maxPens >= 1 ? maxPens : undefined}
          required
          defaultValue={lot ? lotPens(lot) : Math.max(1, Math.min(maxPens, 5))}
          disabled={Boolean(lot?.penStarts?.length) || (!lot && maxPens < 1)}
          className={input}
        />
        {maxPensProp !== undefined && <span className={`mt-1 block text-xs font-normal ${maxPens < 1 ? "text-red-700" : "text-slate-500"}`}>
          {maxPens < 1
            ? "Suprafața gospodăriei nu e confirmată încă, deci nu se pot alege țarcuri. Gospodarul o declară cu actul de proprietate, iar Puii mei o confirmă după măsurare."
            : `Între 1 și ${maxPens} țarcuri (${maxPens * GROWTH.birdsPerPen} pui), după suprafața confirmată.`}
        </span>}
      </label>
      {lot?.penStarts?.length ? <input type="hidden" name="pens" value={lotPens(lot)} /> : null}
      <label className="text-sm font-semibold">
        Durata creșterii (zile)
        <input name="growthDays" type="number" min={30} max={200} required defaultValue={lot?.growthDays ?? GROWTH.growthDays} className={input} />
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
export function NewLotForm({ farmSlug, returnTo, needsApproval = false, maxPens }: { farmSlug: string; returnTo: string; needsApproval?: boolean; maxPens?: number }) {
  return (
    <form action={createLotAction} className="grid gap-4 rounded-xl bg-white p-5 ring-1 ring-slate-200 sm:grid-cols-2">
      <input type="hidden" name="farmSlug" value={farmSlug} />
      <input type="hidden" name="inapoi" value={returnTo} />
      <Fields maxPens={maxPens} />
      <div className="sm:col-span-2">
        <button disabled={maxPens !== undefined && maxPens < 1} className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{needsApproval ? "Trimite lotul spre aprobare" : "Creează lotul"}</button>
        <span className="ml-3 text-xs text-slate-500">
          Codul lotului se generează automat.{" "}
          {needsApproval ? "Lotul apare la precomandă după aprobarea Puii mei." : "Lotul apare imediat la precomandă."}
        </span>
      </div>
    </form>
  );
}

/** Rândul unui lot, cu editare și închidere / redeschidere pentru precomenzi. */
export function LotAdminRow({ lot, farmName, returnTo, canApprove = false, maxPens, orders = [] }: { lot: Lot; farmName?: string; returnTo: string; canApprove?: boolean; maxPens?: number; orders?: Preorder[] }) {
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
      <PensPanel lot={lot} returnTo={returnTo} orders={orders} />
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
        <Fields lot={lot} maxPens={maxPens} />
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

/** Țarcurile lotului: câți pui are fiecare, starea și butonul „Pornește țarcul” când e plin. */
function PensPanel({ lot, returnTo, orders }: { lot: Lot; returnTo: string; orders: Preorder[] }) {
  if (lot.approval?.status === "asteapta" || lot.approval?.status === "respins") return null;
  const pens = penView(lot);
  const inPen = penOrders(lot, orders);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="border-t border-slate-200 px-4 py-3">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Țarcuri</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pens.map((p) => (
          <li key={p.n} className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">Țarcul {p.n}</span>
              <span className="text-xs text-slate-500">{penStateLabels[p.state]}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded bg-slate-200">
              <div className="h-full rounded bg-green-600" style={{ width: `${(p.birds / GROWTH.birdsPerPen) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {p.birds} / {GROWTH.birdsPerPen} pui{p.date ? ` · pornit ${p.date}` : ""}
            </p>
            {(inPen.get(p.n)?.length ?? 0) > 0 && (
              <ul className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs">
                {inPen.get(p.n)!.map((o) => (
                  <li key={o.number} className="flex flex-wrap items-baseline justify-between gap-x-2">
                    {o.token ? (
                      <a href={`/comanda/${o.token}`} className="font-mono font-semibold text-slate-800 underline">{o.number}</a>
                    ) : (
                      <span className="font-mono font-semibold">{o.number}</span>
                    )}
                    <span className="text-slate-600">
                      {o.name} · {o.birds} pui
                      {o.birds < o.total ? ` (din ${o.total}; și în țarcul ${o.pens.filter((x) => x !== p.n).join(", ")})` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {(p.state === "plin" || p.state === "se-umple") && (
              <form action={startPenAction} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="code" value={lot.code} />
                <input type="hidden" name="pen" value={p.n} />
                <input type="hidden" name="inapoi" value={returnTo} />
                <input name="date" type="date" defaultValue={today} className="rounded border border-slate-300 px-1.5 py-0.5 text-xs" />
                <button disabled={p.state !== "plin"} className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40">
                  Pornește țarcul
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">
        Țarcul pornește când are {GROWTH.birdsPerPen} de pui rezervați; țarcurile aceluiași lot pornesc în cel mult {GROWTH.penStartWindowDays} zile de la primul.
      </p>
    </div>
  );
}
