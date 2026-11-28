"use client";

import { useActionState } from "react";
import { activateAccount, login, type AuthFormState } from "@/app/(site)/cont/actions";
import { inputClasses } from "./Field";
import { SubmitButton } from "./SubmitButton";

const initial: AuthFormState = { status: "idle" };

function ErrorBox({ state }: { state: AuthFormState }) {
  return state.status === "error" ? (
    <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">
      {state.message}
    </p>
  ) : null;
}

export function LoginForm({ returnTo }: { returnTo?: string }) {
  const [state, formAction] = useActionState(login, initial);
  return (
    <form action={formAction} className="space-y-5">
      <ErrorBox state={state} />
      {returnTo && <input type="hidden" name="inapoi" value={returnTo} />}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-forest-900">Email sau nume de utilizator</label>
        <input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          required
          defaultValue={state.status === "error" ? state.email : undefined}
          className={inputClasses}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-forest-900">Parolă</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClasses} />
      </div>
      <SubmitButton pendingText="Se verifică…">Intră în cont</SubmitButton>
    </form>
  );
}

export function ActivateForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(activateAccount.bind(null, token), initial);
  return (
    <form action={formAction} className="space-y-5">
      <ErrorBox state={state} />
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-forest-900">Parolă nouă</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} className={inputClasses} aria-describedby="password-hint" />
        <p id="password-hint" className="mt-1.5 text-sm text-muted">Cel puțin 10 caractere, cu litere și cifre.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-semibold text-forest-900">Repetă parola</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={inputClasses} />
      </div>
      <SubmitButton pendingText="Se salvează…">Salvează parola și intră</SubmitButton>
    </form>
  );
}
