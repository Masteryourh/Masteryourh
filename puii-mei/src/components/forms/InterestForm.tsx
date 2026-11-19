"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitInterest, type InterestFormState } from "@/app/(site)/in-curand/actions";
import { upcomingProducts } from "@/lib/products";
import { romanianCounties } from "@/lib/validation/partner";
import { Icon } from "@/components/ui/Icon";
import { Checkbox, Field, Honeypot, fieldA11y, inputClasses } from "./Field";
import { SubmitButton } from "./SubmitButton";

const initial: InterestFormState = { status: "idle" };

export function InterestForm() {
  const [state, formAction] = useActionState(submitInterest, initial);

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-3xl border border-forest-900/8 bg-white p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-forest-700">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold">Mulțumim, {state.name}!</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">Te anunțăm când produsele alese sunt disponibile în zona ta.</p>
      </div>
    );
  }

  const errors = state.status === "error" ? state.errors : {};
  const v = state.status === "error" ? state.values : {};

  return (
    <form action={formAction} noValidate className="relative space-y-6 rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
      <Honeypot />
      {(errors.form || Object.keys(errors).length > 0) && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">
          {errors.form ?? "Te rugăm să verifici câmpurile marcate mai jos."}
        </p>
      )}
      <div>
        <p className="text-sm font-semibold text-forest-900">
          Ce te interesează? <span className="text-grain-600">*</span>
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2" role="group" aria-describedby={errors.products ? "products-error" : undefined}>
          {upcomingProducts.map((p) => (
            <Checkbox key={p.id} id={p.id} defaultChecked={v[p.id] === "on"}>
              {p.name}
            </Checkbox>
          ))}
        </div>
        {errors.products && <p id="products-error" className="mt-2 text-sm font-medium text-red-700">{errors.products}</p>}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Nume" required error={errors.name}>
          <input {...fieldA11y("name", errors.name)} defaultValue={v.name} autoComplete="name" className={inputClasses} />
        </Field>
        <Field id="county" label="Județul tău" required error={errors.county}>
          <select {...fieldA11y("county", errors.county)} defaultValue={v.county ?? ""} className={inputClasses}>
            <option value="">Alege județul…</option>
            {romanianCounties.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field id="email" label="Email" required error={errors.email}>
          <input {...fieldA11y("email", errors.email)} defaultValue={v.email} type="email" autoComplete="email" className={inputClasses} />
        </Field>
        <Field id="phone" label="Telefon" error={errors.phone}>
          <input {...fieldA11y("phone", errors.phone)} defaultValue={v.phone} type="tel" autoComplete="tel" className={inputClasses} />
        </Field>
      </div>
      <Checkbox id="termsConsent" error={errors.termsConsent} defaultChecked={v.termsConsent === "on"}>
        Sunt de acord să fiu contactat despre aceste produse, conform{" "}
        <Link href="/confidentialitate" className="font-semibold text-forest-700 underline underline-offset-2">politicii de confidențialitate</Link>.
        <span className="text-grain-600"> *</span>
      </Checkbox>
      <SubmitButton pendingText="Se trimite…">Anunță-mă</SubmitButton>
    </form>
  );
}
