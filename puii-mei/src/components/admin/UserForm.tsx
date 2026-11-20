"use client";

import { useActionState, useState } from "react";
import { createUser, type UserFormState } from "@/app/(panou)/admin/utilizatori/actions";
import { roleLabels } from "@/lib/roles";
import { Field, fieldA11y, inputClasses } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";

const initial: UserFormState = { status: "idle" };

export function UserForm({ farms }: { farms: { slug: string; name: string }[] }) {
  const [state, formAction] = useActionState(createUser, initial);
  const errors = state.status === "error" ? state.errors : {};
  const v = state.status === "error" ? state.values : {};
  const [role, setRole] = useState(v.role ?? "gospodar");

  return (
    <form action={formAction} className="grid gap-4 rounded-3xl bg-white p-6 ring-1 ring-forest-900/10 sm:grid-cols-2">
      {state.status === "success" && (
        <p role="status" className="rounded-2xl bg-forest-50 p-3 text-sm font-medium text-forest-800 sm:col-span-2">
          Contul pentru {state.name} a fost creat. Trimite-i linkul de activare din lista de mai jos.
        </p>
      )}
      <Field id="name" label="Nume" required error={errors.name}>
        <input {...fieldA11y("name", errors.name)} defaultValue={v.name} className={inputClasses} />
      </Field>
      <Field id="email" label="Email" required error={errors.email}>
        <input {...fieldA11y("email", errors.email)} defaultValue={v.email} type="email" className={inputClasses} />
      </Field>
      <Field id="phone" label="Telefon" error={errors.phone} hint="Pentru trimiterea linkului pe WhatsApp.">
        <input {...fieldA11y("phone", errors.phone, true)} defaultValue={v.phone} type="tel" className={inputClasses} />
      </Field>
      <Field id="role" label="Rol" required error={errors.role}>
        <select {...fieldA11y("role", errors.role)} value={role} onChange={(e) => setRole(e.target.value)} className={inputClasses}>
          {Object.entries(roleLabels).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </Field>
      {role === "gospodar" && (
        <Field id="farmSlug" label="Gospodăria administrată" required error={errors.farmSlug} className="sm:col-span-2">
          <select {...fieldA11y("farmSlug", errors.farmSlug)} defaultValue={v.farmSlug ?? ""} className={inputClasses}>
            <option value="">Alege gospodăria…</option>
            {farms.map((f) => (
              <option key={f.slug} value={f.slug}>{f.name}</option>
            ))}
          </select>
        </Field>
      )}
      <div className="sm:col-span-2">
        <SubmitButton pendingText="Se creează…">Creează contul</SubmitButton>
      </div>
    </form>
  );
}
