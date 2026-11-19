"use client";

import { useActionState, useState, useTransition } from "react";
import { submitConfirmation, type ConfirmationFormState } from "@/app/(site)/confirmare/[token]/actions";
import { PHOTO_SIDES } from "@/lib/delivery";
import { buttonClasses } from "@/components/ui/Button";
import { Field, fieldA11y, inputClasses } from "./Field";

const initial: ConfirmationFormState = { status: "idle" };

/** Micșorează fotografia în browser (max. 1280 px, JPEG), ca trimiterea să fie rapidă. */
async function compress(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.72));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function ConfirmationForm({ token, birdsOrdered }: { token: string; birdsOrdered: number }) {
  const [state, formAction] = useActionState(submitConfirmation.bind(null, token), initial);
  const [pending, startTransition] = useTransition();
  const errors = state.status === "error" ? state.errors : {};
  const v = state.status === "error" ? state.values : {};
  const [checks, setChecks] = useState({
    packagingOk: v.packagingOk === "on",
    coldOk: v.coldOk === "on",
    appearanceOk: v.appearanceOk === "on",
  });
  const [birds, setBirds] = useState(Number(v.birdsReceived ?? birdsOrdered));
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null, null]);
  const allOk = checks.packagingOk && checks.coldOk && checks.appearanceOk && birds === birdsOrdered;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    for (let i = 1; i <= PHOTO_SIDES.length; i++) {
      const f = fd.get(`photo${i}`);
      if (f instanceof File && f.size > 0) fd.set(`photo${i}`, await compress(f), `latura-${i}.jpg`);
    }
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {(errors.form || Object.keys(errors).length > 0) && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">
          {errors.form ?? "Te rugăm să completezi câmpurile marcate mai jos."}
        </p>
      )}

      <fieldset className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
        <legend className="sr-only">Lista de verificare</legend>
        <h2 className="font-display text-xl font-semibold sm:text-2xl">Verifică pachetul</h2>
        <p className="mt-1 text-sm text-muted">Bifează ce este în regulă.</p>
        <div className="mt-5 space-y-5">
          <Field id="birdsReceived" label="Câți pui ai primit?" required error={errors.birdsReceived} hint={`Ai comandat ${birdsOrdered} pui.`}>
            <input
              {...fieldA11y("birdsReceived", errors.birdsReceived, true)}
              type="number"
              inputMode="numeric"
              min={0}
              value={Number.isNaN(birds) ? "" : birds}
              onChange={(e) => setBirds(e.target.valueAsNumber)}
              className={`${inputClasses} max-w-40`}
            />
          </Field>
          <CheckRow id="packagingOk" checked={checks.packagingOk} onChange={(c) => setChecks((s) => ({ ...s, packagingOk: c }))}>
            Ambalajul este intact
          </CheckRow>
          <CheckRow id="coldOk" checked={checks.coldOk} onChange={(c) => setChecks((s) => ({ ...s, coldOk: c }))}>
            Carnea este rece
          </CheckRow>
          <CheckRow id="appearanceOk" checked={checks.appearanceOk} onChange={(c) => setChecks((s) => ({ ...s, appearanceOk: c }))}>
            Aspectul și mirosul sunt în regulă
          </CheckRow>
        </div>
        {!allOk && (
          <Field id="problem" label="Ce nu a fost în regulă?" required error={errors.problem} className="mt-6">
            <textarea {...fieldA11y("problem", errors.problem)} defaultValue={v.problem} rows={3} maxLength={1500} placeholder="Descrie pe scurt problema" className={inputClasses} />
          </Field>
        )}
      </fieldset>

      <fieldset className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
        <legend className="sr-only">Fotografii</legend>
        <h2 className="font-display text-xl font-semibold sm:text-2xl">Fotografiază coletul</h2>
        <p className="mt-1 text-sm text-muted">Câte o fotografie pentru fiecare latură a coletului, înainte să-l deschizi.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {PHOTO_SIDES.map((side, i) => (
            <div key={side}>
              <label
                htmlFor={`photo${i + 1}`}
                className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-center text-sm font-semibold ${errors[`photo${i + 1}`] && !previews[i] ? "border-red-400 bg-red-50 text-red-800" : "border-forest-900/20 bg-cream-50 text-forest-800"}`}
              >
                {previews[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previews[i]!} alt={`Fotografie ${side}`} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                      <circle cx="12" cy="13" r="3.5" />
                    </svg>
                    <span className="mt-2">{side}</span>
                    <span className="text-xs font-normal text-muted">Apasă pentru fotografie</span>
                  </>
                )}
              </label>
              <input
                id={`photo${i + 1}`}
                name={`photo${i + 1}`}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                aria-invalid={errors[`photo${i + 1}`] && !previews[i] ? true : undefined}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPreviews((p) => p.map((x, j) => (j === i ? (f ? URL.createObjectURL(f) : null) : x)));
                }}
              />
              {errors[`photo${i + 1}`] && !previews[i] && <p className="mt-1 text-xs font-medium text-red-700">{errors[`photo${i + 1}`]}</p>}
            </div>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3">
        <p className="text-sm text-muted">După trimitere, confirmarea nu mai poate fi modificată.</p>
        <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
          {pending ? "Se trimite…" : allOk ? "Confirm primirea în condițiile promise" : "Trimite confirmarea cu problema semnalată"}
        </button>
      </div>
    </form>
  );
}

function CheckRow({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (c: boolean) => void; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${checked ? "border-forest-700 bg-forest-50" : "border-forest-900/12"}`}>
      <input id={id} name={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-6 w-6 shrink-0 accent-forest-700" />
      <span className="font-semibold text-forest-900">{children}</span>
    </label>
  );
}
