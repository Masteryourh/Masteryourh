"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitPartnerApplication, type PartnerFormState } from "@/app/devino-partener/actions";
import { dsvLabels, romanianCounties } from "@/lib/validation/partner";
import { Icon } from "@/components/ui/Icon";
import { Checkbox, Field, Honeypot, fieldA11y, inputClasses } from "./Field";
import { SubmitButton } from "./SubmitButton";

const initial: PartnerFormState = { status: "idle" };

export function PartnerForm() {
  const [state, formAction] = useActionState(submitPartnerApplication, initial);

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-3xl border border-forest-900/8 bg-white p-8 text-center sm:p-12">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-forest-700">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold">Mulțumim, {state.name}! Am primit solicitarea ta.</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Te sunăm în câteva zile lucrătoare ca să discutăm despre gospodărie și să stabilim o vizită.
        </p>
      </div>
    );
  }

  const errors = state.status === "error" ? state.errors : {};
  const v = state.status === "error" ? state.values : {};

  return (
    <form action={formAction} noValidate className="relative space-y-8">
      <Honeypot />
      {(errors.form || Object.keys(errors).length > 0) && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">
          {errors.form ?? "Te rugăm să verifici câmpurile marcate mai jos."}
        </p>
      )}

      <fieldset className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
        <legend className="sr-only">Date de contact</legend>
        <h2 className="font-display text-xl font-semibold sm:text-2xl">Despre tine</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field id="name" label="Nume și prenume" required error={errors.name} className="sm:col-span-2">
            <input {...fieldA11y("name", errors.name)} defaultValue={v.name} autoComplete="name" className={inputClasses} />
          </Field>
          <Field id="phone" label="Telefon" required error={errors.phone}>
            <input {...fieldA11y("phone", errors.phone)} defaultValue={v.phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="07xx xxx xxx" className={inputClasses} />
          </Field>
          <Field id="email" label="Email" required error={errors.email}>
            <input {...fieldA11y("email", errors.email)} defaultValue={v.email} type="email" autoComplete="email" className={inputClasses} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
        <legend className="sr-only">Gospodăria</legend>
        <h2 className="font-display text-xl font-semibold sm:text-2xl">Despre gospodărie</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field id="farmName" label="Numele gospodăriei" error={errors.farmName} className="sm:col-span-2" hint="Ex. Gospodăria Popescu. Dacă nu are un nume, lasă gol.">
            <input {...fieldA11y("farmName", errors.farmName, true)} defaultValue={v.farmName} className={inputClasses} />
          </Field>
          <Field id="village" label="Localitate" required error={errors.village}>
            <input {...fieldA11y("village", errors.village)} defaultValue={v.village} autoComplete="address-level2" className={inputClasses} />
          </Field>
          <Field id="county" label="Județ" required error={errors.county}>
            <select {...fieldA11y("county", errors.county)} defaultValue={v.county ?? ""} className={inputClasses}>
              <option value="">Alege județul…</option>
              {romanianCounties.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field id="capacity" label="Câți pui poți crește pe lot?" required error={errors.capacity} hint="Estimare, în funcție de spațiul disponibil.">
            <input {...fieldA11y("capacity", errors.capacity, true)} defaultValue={v.capacity} type="number" inputMode="numeric" min={20} placeholder="ex. 150" className={inputClasses} />
          </Field>
          <Field id="experienceYears" label="Ani de experiență cu păsări" required error={errors.experienceYears}>
            <input {...fieldA11y("experienceYears", errors.experienceYears)} defaultValue={v.experienceYears} type="number" inputMode="numeric" min={0} placeholder="ex. 5" className={inputClasses} />
          </Field>
          <Field id="dsvStatus" label="Înregistrare sanitar-veterinară (DSV)" required error={errors.dsvStatus} className="sm:col-span-2">
            <select {...fieldA11y("dsvStatus", errors.dsvStatus)} defaultValue={v.dsvStatus ?? ""} className={inputClasses}>
              <option value="">Alege…</option>
              {Object.entries(dsvLabels).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </Field>
          <div className="space-y-3 sm:col-span-2">
            <p className="text-sm font-semibold text-forest-900">Ce ai deja în gospodărie?</p>
            <Checkbox id="hasShelter" defaultChecked={v.hasShelter === "on"}>Adăpost pentru păsări (hală, grajd amenajat, șopron închis)</Checkbox>
            <Checkbox id="hasOutdoorArea" defaultChecked={v.hasOutdoorArea === "on"}>Padoc sau teren unde puii pot ieși afară</Checkbox>
          </div>
          <div className="space-y-3 sm:col-span-2">
            <p className="text-sm font-semibold text-forest-900">
              Ai putea produce și altceva? <span className="font-normal text-muted">(pentru etapele următoare)</span>
            </p>
            <Checkbox id="canTurkeys" defaultChecked={v.canTurkeys === "on"}>Curcani</Checkbox>
            <Checkbox id="canDucks" defaultChecked={v.canDucks === "on"}>Rațe</Checkbox>
            <Checkbox id="canPheasants" defaultChecked={v.canPheasants === "on"}>Fazani</Checkbox>
            <Checkbox id="hasGreenhouse" defaultChecked={v.hasGreenhouse === "on"}>Am seră (legume)</Checkbox>
          </div>
          <Field id="message" label="Spune-ne mai multe" error={errors.message} className="sm:col-span-2">
            <textarea {...fieldA11y("message", errors.message)} defaultValue={v.message} rows={4} maxLength={1500} placeholder="Ex. ce păsări ai crescut până acum, cum arată spațiul, când ai putea începe" className={inputClasses} />
          </Field>
        </div>
      </fieldset>

      <div className="space-y-6">
        <Checkbox id="termsConsent" error={errors.termsConsent} defaultChecked={v.termsConsent === "on"}>
          Sunt de acord cu prelucrarea datelor pentru evaluarea solicitării, conform{" "}
          <Link href="/confidentialitate" className="font-semibold text-forest-700 underline underline-offset-2">politicii de confidențialitate</Link>.
          <span className="text-grain-600"> *</span>
        </Checkbox>
        <SubmitButton pendingText="Se trimite…">Trimite solicitarea</SubmitButton>
      </div>
    </form>
  );
}
