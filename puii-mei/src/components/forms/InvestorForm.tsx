"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitInvestorApplication, type PartnerFormState } from "@/app/devino-partener/actions";
import { investmentRangeLabels, investorTypeLabels } from "@/lib/validation/partner";
import { Icon } from "@/components/ui/Icon";
import { Checkbox, Field, Honeypot, fieldA11y, inputClasses } from "./Field";
import { SubmitButton } from "./SubmitButton";

const initial: PartnerFormState = { status: "idle" };

export function InvestorForm() {
  const [state, formAction] = useActionState(submitInvestorApplication, initial);
  const [type, setType] = useState<string>("persoana-fizica");

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-3xl border border-forest-900/8 bg-white p-8 text-center sm:p-12">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-forest-700">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold">Mulțumim, {state.name}! Am primit solicitarea ta.</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">Te contactăm în câteva zile lucrătoare pentru o primă discuție.</p>
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
        <h3 className="font-display text-xl font-semibold sm:text-2xl">Despre tine</h3>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field id="inv-name" label="Nume și prenume" required error={errors.name} className="sm:col-span-2">
            <input {...fieldA11y("inv-name", errors.name)} name="name" defaultValue={v.name} autoComplete="name" className={inputClasses} />
          </Field>
          <Field id="inv-phone" label="Telefon" required error={errors.phone}>
            <input {...fieldA11y("inv-phone", errors.phone)} name="phone" defaultValue={v.phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="07xx xxx xxx" className={inputClasses} />
          </Field>
          <Field id="inv-email" label="Email" required error={errors.email}>
            <input {...fieldA11y("inv-email", errors.email)} name="email" defaultValue={v.email} type="email" autoComplete="email" className={inputClasses} />
          </Field>
          <Field id="inv-type" label="Investești ca" required error={errors.investorType}>
            <select {...fieldA11y("inv-type", errors.investorType)} name="investorType" value={type} onChange={(e) => setType(e.target.value)} className={inputClasses}>
              {Object.entries(investorTypeLabels).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </Field>
          {type === "companie" && (
            <Field id="inv-company" label="Numele companiei" required error={errors.company}>
              <input {...fieldA11y("inv-company", errors.company)} name="company" defaultValue={v.company} autoComplete="organization" className={inputClasses} />
            </Field>
          )}
        </div>
      </fieldset>

      <fieldset className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
        <legend className="sr-only">Interes de investiție</legend>
        <h3 className="font-display text-xl font-semibold sm:text-2xl">Ce te interesează</h3>
        <div className="mt-5 space-y-3" role="group" aria-describedby={errors.interests ? "interests-error" : undefined}>
          <Checkbox id="interestLots" defaultChecked={v.interestLots === "on"}>Finanțarea loturilor de producție</Checkbox>
          <Checkbox id="interestInfrastructure" defaultChecked={v.interestInfrastructure === "on"}>Adăposturi și echipamente pentru gospodăriile partenere</Checkbox>
          <Checkbox id="interestExpansion" defaultChecked={v.interestExpansion === "on"}>Extinderea Puii mei în regiuni noi</Checkbox>
          {errors.interests && <p id="interests-error" className="text-sm font-medium text-red-700">{errors.interests}</p>}
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field id="inv-amount" label="Interval orientativ" required error={errors.amountRange}>
            <select {...fieldA11y("inv-amount", errors.amountRange)} name="amountRange" defaultValue={v.amountRange ?? ""} className={inputClasses}>
              <option value="">Alege…</option>
              {Object.entries(investmentRangeLabels).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </Field>
          <Field id="inv-region" label="Regiune de interes" error={errors.region} hint="Ex. Bucovina, județul Suceava, toată țara.">
            <input {...fieldA11y("inv-region", errors.region, true)} name="region" defaultValue={v.region} className={inputClasses} />
          </Field>
          <Field id="inv-message" label="Mesaj" error={errors.message} className="sm:col-span-2">
            <textarea {...fieldA11y("inv-message", errors.message)} name="message" defaultValue={v.message} rows={4} maxLength={1500} placeholder="Ex. experiența ta, ce tip de colaborare cauți" className={inputClasses} />
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
