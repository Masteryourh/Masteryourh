"use client";

import { useActionState } from "react";
import { findOrder, type FindOrderState } from "@/app/(site)/comanda/actions";
import { buttonClasses } from "@/components/ui/Button";
import { Field, inputClasses } from "./Field";

export function FindOrderForm() {
  const [state, action, pending] = useActionState<FindOrderState, FormData>(findOrder, { status: "idle" });
  return (
    <form action={action} className="grid gap-5 rounded-3xl bg-white p-6 ring-1 ring-forest-900/10 sm:p-8">
      {state.status === "error" && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">{state.error}</p>
      )}
      <Field id="number" label="Numărul precomenzii" required>
        <input id="number" name="number" required defaultValue={state.status === "error" ? state.number : ""} placeholder="PM2611-AB12C" autoCapitalize="characters" className={`${inputClasses} font-mono uppercase`} />
      </Field>
      <Field id="phone" label="Telefonul folosit la precomandă" required>
        <input id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="07xx xxx xxx" className={inputClasses} />
      </Field>
      <button disabled={pending} className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
        {pending ? "Se caută…" : "Deschide comanda"}
      </button>
    </form>
  );
}
