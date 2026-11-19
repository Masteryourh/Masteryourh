"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitContact, type ContactFormState } from "@/app/(site)/contact/actions";
import { contactSubjects } from "@/lib/validation/contact";
import { Icon } from "@/components/ui/Icon";
import { Checkbox, Field, Honeypot, fieldA11y, inputClasses } from "./Field";
import { SubmitButton } from "./SubmitButton";

const initial: ContactFormState = { status: "idle" };

export function ContactForm({ defaultSubject }: { defaultSubject?: string }) {
  const [state, formAction] = useActionState(submitContact, initial);

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-3xl border border-forest-900/8 bg-white p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-forest-700">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold">Mulțumim, {state.name}!</h2>
        <p className="mt-2 text-muted">Am primit mesajul tău și îți răspundem în cel mult o zi lucrătoare.</p>
      </div>
    );
  }

  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : {};

  return (
    <form action={formAction} noValidate className="relative space-y-5 rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
      <Honeypot />
      {errors.form && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">{errors.form}</p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Nume" required error={errors.name}>
          <input {...fieldA11y("name", errors.name)} defaultValue={values.name} autoComplete="name" className={inputClasses} />
        </Field>
        <Field id="email" label="Email" required error={errors.email}>
          <input {...fieldA11y("email", errors.email)} defaultValue={values.email} type="email" autoComplete="email" className={inputClasses} />
        </Field>
        <Field id="phone" label="Telefon" error={errors.phone}>
          <input {...fieldA11y("phone", errors.phone)} defaultValue={values.phone} type="tel" autoComplete="tel" className={inputClasses} />
        </Field>
        <Field id="subject" label="Subiect" required error={errors.subject}>
          <select {...fieldA11y("subject", errors.subject)} defaultValue={values.subject ?? defaultSubject ?? contactSubjects[0]} className={inputClasses}>
            {contactSubjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field id="message" label="Mesaj" required error={errors.message}>
        <textarea {...fieldA11y("message", errors.message)} defaultValue={values.message} rows={5} maxLength={2000} className={inputClasses} />
      </Field>
      <Checkbox id="termsConsent" error={errors.termsConsent} defaultChecked={values.termsConsent === "on"}>
        Sunt de acord cu prelucrarea datelor pentru a primi un răspuns, conform{" "}
        <Link href="/confidentialitate" className="font-semibold text-forest-700 underline underline-offset-2">politicii de confidențialitate</Link>.
        <span className="text-grain-600"> *</span>
      </Checkbox>
      <SubmitButton pendingText="Se trimite…">Trimite mesajul</SubmitButton>
    </form>
  );
}
