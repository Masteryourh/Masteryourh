"use client";

import { useActionState } from "react";
import { submitRating, type RatingFormState } from "@/app/(site)/evaluare/[token]/actions";
import { ratingTargets } from "@/lib/delivery";
import { Field, fieldA11y, inputClasses } from "./Field";
import { Stars } from "./Stars";
import { SubmitButton } from "./SubmitButton";

const initial: RatingFormState = { status: "idle" };

export function RatingForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(submitRating.bind(null, token), initial);
  const errors = state.status === "error" ? state.errors : {};
  const v = state.status === "error" ? state.values : {};
  return (
    <form action={formAction} noValidate className="space-y-6 rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
      {(errors.form || Object.keys(errors).length > 0) && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">
          {errors.form ?? "Te rugăm să alegi o notă pentru fiecare."}
        </p>
      )}
      {ratingTargets.map((t) => (
        <Stars key={t.key} name={t.key} label={t.label} hint={t.hint} error={errors[t.key]} defaultValue={v[t.key]} />
      ))}
      <Field id="comment" label="Ce am putea face mai bine?" error={errors.comment}>
        <textarea {...fieldA11y("comment", errors.comment)} defaultValue={v.comment} rows={3} maxLength={1000} className={inputClasses} />
      </Field>
      <SubmitButton pendingText="Se trimite…">Trimite notele</SubmitButton>
    </form>
  );
}
