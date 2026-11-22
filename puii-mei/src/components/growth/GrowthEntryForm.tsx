"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addGrowthEntryAction, type GrowthFormState } from "@/app/(panou)/cont/gospodar/jurnal-actions";
import { growthEntryLabels, type GrowthEntryType } from "@/lib/growth-log";
import { prepareForm } from "@/lib/client-media";

const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal";

/**
 * Formularul jurnalului: la „Mutarea țarcului” se ia automat poziția GPS a telefonului
 * (locul nou de pe pășune); poza se micșorează înainte de trimitere.
 */
export function GrowthEntryForm({
  lotCode,
  pens,
  type: fixedType,
  pen: fixedPen,
  compact = false,
}: {
  lotCode: string;
  pens: number;
  type?: GrowthEntryType;
  pen?: number;
  compact?: boolean;
}) {
  const [state, action] = useActionState<GrowthFormState, FormData>(addGrowthEntryAction, { status: "idle" });
  const [pending, start] = useTransition();
  const [type, setType] = useState<GrowthEntryType>(fixedType ?? "hranire");
  const formRef = useRef<HTMLFormElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.status === "ok") formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        start(async () => action(await prepareForm(form)));
      }}
      className={compact ? "flex flex-wrap items-center gap-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}
    >
      <input type="hidden" name="lotCode" value={lotCode} />
      {fixedType ? (
        <input type="hidden" name="type" value={fixedType} />
      ) : (
        <label className="text-sm font-semibold">Ce ai făcut
          <select name="type" value={type} onChange={(e) => setType(e.target.value as GrowthEntryType)} className={input}>
            {(Object.keys(growthEntryLabels) as GrowthEntryType[]).filter((k) => k !== "mutare" && k !== "poza").map((k) => (
              <option key={k} value={k}>{growthEntryLabels[k]}</option>
            ))}
          </select>
        </label>
      )}
      {fixedPen ? (
        <input type="hidden" name="pen" value={fixedPen} />
      ) : (
        !compact && (
          <label className="text-sm font-semibold">Țarcul
            <select name="pen" className={input} defaultValue="">
              <option value="">Tot lotul</option>
              {Array.from({ length: pens }, (_, i) => <option key={i} value={i + 1}>Țarcul {i + 1}</option>)}
            </select>
          </label>
        )
      )}
      {!compact && <label className="text-sm font-semibold">Data<input name="date" type="date" defaultValue={today} max={today} className={input} /></label>}
      {!compact && type === "mortalitate" && <label className="text-sm font-semibold">Câți pui<input name="count" type="number" min={1} required className={input} /></label>}
      {!compact && type === "veterinar" && <label className="text-sm font-semibold">Medicul veterinar<input name="vetName" required className={input} /></label>}
      {!compact && <label className="text-sm font-semibold sm:col-span-2">Observații<input name="note" className={input} placeholder="Ex. 2 kg furaj de finisare, apă schimbată" /></label>}
      {(fixedType === "poza" || (!compact && (type === "veterinar" || type === "tratament" || type === "mortalitate"))) && (
        <label className="text-sm font-semibold">{fixedType === "poza" ? "Poza (puii și țarcul)" : "Poză / document (opțional)"}
          <input name="photo" type="file" accept="image/*" capture="environment" required={fixedType === "poza"} className={input} />
        </label>
      )}
      <div className={compact ? "" : "sm:col-span-2 lg:col-span-3"}>
        <button disabled={pending} className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Se salvează…" : fixedType === "mutare" ? "Am mutat țarcul" : fixedType === "poza" ? "Trimite poza" : "Notează"}
        </button>
        {state.status === "ok" && <span className="ml-2 text-sm text-green-700">✓ {state.message}</span>}
        {state.status === "error" && <span className="ml-2 text-sm text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}
