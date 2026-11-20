"use client";

import { useActionState, useState } from "react";
import { createTourAction, type TourFormState } from "@/app/(site)/cont/gospodar/livrari-actions";
import { inputClasses } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";

/** Trimiterea PIN-ului de ridicare pe WhatsApp (îi rămâne salvat șoferului). */
export function SendPinWhatsApp({ tourCode, pin, link }: { tourCode: string; pin: string; link: string }) {
  const [phone, setPhone] = useState("");
  const digits = phone.replace(/\D/g, "").replace(/^0040/, "40").replace(/^0/, "40");
  const text = `Tura de livrare ${tourCode} – Puii mei.\nLinkul turei: ${link}\nPIN de ridicare: ${pin}\nIntroduci PIN-ul la ridicare, apoi îți alegi PIN-ul personal.`;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-0 flex-1">
        <label htmlFor="driverPhone" className="mb-1 block text-sm font-semibold text-forest-900">Telefonul șoferului</label>
        <input id="driverPhone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="07xx xxx xxx" className={inputClasses} />
      </div>
      <a
        href={`https://wa.me/${digits.length >= 10 ? digits : ""}?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-[#25D366] px-5 py-3 font-semibold text-forest-900"
      >
        Trimite pe WhatsApp
      </a>
    </div>
  );
}

const initial: TourFormState = { status: "idle" };

export function CreateTourForm({
  farmSlug,
  parcels,
  defaultHours,
  today,
}: {
  farmSlug: string;
  parcels: { id: string; label: string; hasPin: boolean }[];
  defaultHours: number;
  today: string;
}) {
  const [state, action] = useActionState(createTourAction, initial);
  return (
    <form action={action} className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-forest-900/10">
      {state.status === "error" && (
        <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-800">{state.error}</p>
      )}
      <input type="hidden" name="farmSlug" value={farmSlug} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-forest-900">Colete cu etichetă, gata de livrare</legend>
        <div className="space-y-2">
          {parcels.map((p) => (
            <label key={p.id} className="flex items-center gap-3 rounded-2xl border border-forest-900/12 p-3 text-sm">
              <input type="checkbox" name="parcelIds" value={p.id} defaultChecked className="h-5 w-5 accent-forest-700" />
              <span className="flex-1">{p.label}</span>
              {!p.hasPin && <span className="rounded-full bg-grain-300/60 px-2 py-0.5 text-xs font-semibold">fără pin pe hartă</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="mb-1 block text-sm font-semibold text-forest-900">Data turei</label>
          <input id="date" name="date" type="date" defaultValue={today} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="durationHours" className="mb-1 block text-sm font-semibold text-forest-900">Termen de livrare (ore de la pornire)</label>
          <input id="durationHours" name="durationHours" type="number" min={1} max={24} defaultValue={defaultHours} className={inputClasses} />
        </div>
      </div>
      <p className="text-xs text-muted">Traseul se calculează automat după pinii clienților; ordinea se poate ajusta apoi.</p>
      <SubmitButton pendingText="Se creează tura…">Creează tura</SubmitButton>
    </form>
  );
}
