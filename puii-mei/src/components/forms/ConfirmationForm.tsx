"use client";

import { useActionState, useState } from "react";
import { submitConfirmation, type ConfirmationFormState } from "@/app/(site)/confirmare/[token]/actions";
import { ratingTargets } from "@/lib/confirmation";
import { cn } from "@/lib/cn";
import { Field, fieldA11y, inputClasses } from "./Field";
import { SubmitButton } from "./SubmitButton";

const initial: ConfirmationFormState = { status: "idle" };

export function ConfirmationForm({ token, birdsOrdered }: { token: string; birdsOrdered: number }) {
  const [state, formAction] = useActionState(submitConfirmation.bind(null, token), initial);
  const errors = state.status === "error" ? state.errors : {};
  const v = state.status === "error" ? state.values : {};
  const [conditionOk, setConditionOk] = useState(v.conditionOk ?? "");

  return (
    <form action={formAction} noValidate className="space-y-8">
      {(errors.form || Object.keys(errors).length > 0) && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">
          {errors.form ?? "Te rugăm să completezi câmpurile marcate mai jos."}
        </p>
      )}

      <fieldset className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
        <legend className="sr-only">Starea comenzii</legend>
        <h2 className="font-display text-xl font-semibold sm:text-2xl">Cum ai primit comanda?</h2>
        <div className="mt-5 space-y-5">
          <Field id="birdsReceived" label="Câți pui ai primit?" required error={errors.birdsReceived} hint={`Ai comandat ${birdsOrdered} pui.`}>
            <input
              {...fieldA11y("birdsReceived", errors.birdsReceived, true)}
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={v.birdsReceived ?? birdsOrdered}
              className={cn(inputClasses, "max-w-40")}
            />
          </Field>
          <YesNo name="packagingOk" label="Ambalajul a fost intact?" error={errors.packagingOk} value={v.packagingOk} />
          <YesNo name="coldOk" label="Puii au fost reci la primire?" error={errors.coldOk} value={v.coldOk} />
          <YesNo name="appearanceOk" label="Aspectul și mirosul au fost normale?" error={errors.appearanceOk} value={v.appearanceOk} />
        </div>
      </fieldset>

      <fieldset className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
        <legend className="sr-only">Confirmare</legend>
        <h2 className="font-display text-xl font-semibold sm:text-2xl">Confirmare</h2>
        <div className="mt-5 grid gap-3" role="radiogroup" aria-describedby={errors.conditionOk ? "conditionOk-error" : undefined}>
          <Choice name="conditionOk" value="da" checked={conditionOk === "da"} onChange={setConditionOk} title="Confirm primirea în condițiile promise" />
          <Choice name="conditionOk" value="nu" checked={conditionOk === "nu"} onChange={setConditionOk} title="Am o problemă cu comanda" />
        </div>
        {errors.conditionOk && <p id="conditionOk-error" className="mt-2 text-sm font-medium text-red-700">{errors.conditionOk}</p>}
        {conditionOk === "nu" && (
          <Field id="problem" label="Ce s-a întâmplat?" required error={errors.problem} className="mt-5">
            <textarea {...fieldA11y("problem", errors.problem)} defaultValue={v.problem} rows={4} maxLength={1500} placeholder="Descrie problema: ce lipsește, ce nu a fost în regulă" className={inputClasses} />
          </Field>
        )}
      </fieldset>

      <fieldset className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
        <legend className="sr-only">Note</legend>
        <h2 className="font-display text-xl font-semibold sm:text-2xl">Notează experiența</h2>
        <p className="mt-1 text-sm text-muted">Notele ne ajută să vedem unde putem face mai bine. Nu sunt publicate.</p>
        <div className="mt-5 space-y-6">
          {ratingTargets.map((t) => (
            <Stars key={t.key} name={t.key} label={t.label} hint={t.hint} error={errors[t.key]} defaultValue={v[t.key]} />
          ))}
          <Field id="comment" label="Comentariu" error={errors.comment}>
            <textarea {...fieldA11y("comment", errors.comment)} defaultValue={v.comment} rows={3} maxLength={1000} className={inputClasses} />
          </Field>
        </div>
      </fieldset>

      <div className="space-y-3">
        <p className="text-sm text-muted">După trimitere, confirmarea nu mai poate fi modificată.</p>
        <SubmitButton pendingText="Se trimite…">Trimite confirmarea</SubmitButton>
      </div>
    </form>
  );
}

function YesNo({ name, label, error, value }: { name: string; label: string; error?: string; value?: string }) {
  return (
    <div role="radiogroup" aria-label={label} aria-describedby={error ? `${name}-error` : undefined}>
      <p className="mb-2 text-sm font-semibold text-forest-900">
        {label} <span className="text-grain-600">*</span>
      </p>
      <div className="flex gap-2">
        {(["da", "nu"] as const).map((opt) => (
          <label key={opt} className="relative">
            <input type="radio" name={name} value={opt} defaultChecked={value === opt} className="peer sr-only" />
            <span className="inline-flex cursor-pointer items-center rounded-full border border-forest-900/15 bg-white px-5 py-2 text-sm font-semibold text-forest-800 peer-checked:border-forest-700 peer-checked:bg-forest-700 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-grain-500">
              {opt === "da" ? "Da" : "Nu"}
            </span>
          </label>
        ))}
      </div>
      {error && <p id={`${name}-error`} className="mt-1.5 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}

function Choice({ name, value, checked, onChange, title }: { name: string; value: string; checked: boolean; onChange: (v: string) => void; title: string }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition", checked ? "border-forest-700 bg-forest-50" : "border-forest-900/12 hover:border-forest-700/40")}>
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="h-4 w-4 accent-forest-700" />
      <span className="font-semibold text-forest-900">{title}</span>
    </label>
  );
}

function Stars({ name, label, hint, error, defaultValue }: { name: string; label: string; hint: string; error?: string; defaultValue?: string }) {
  const [value, setValue] = useState(Number(defaultValue) || 0);
  return (
    <div role="radiogroup" aria-label={`Nota pentru ${label}`} aria-describedby={error ? `${name}-error` : undefined}>
      <p className="text-sm font-semibold text-forest-900">
        {label} <span className="text-grain-600">*</span>
      </p>
      <p className="text-sm text-muted">{hint}</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => setValue(n)} className="peer sr-only" aria-label={`${n} din 5`} />
            <svg viewBox="0 0 24 24" aria-hidden className={cn("h-9 w-9 transition peer-focus-visible:rounded peer-focus-visible:outline-2 peer-focus-visible:outline-grain-500", n <= value ? "fill-grain-400 text-grain-500" : "fill-transparent text-forest-900/25")} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />
            </svg>
          </label>
        ))}
      </div>
      {error && <p id={`${name}-error`} className="mt-1.5 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
