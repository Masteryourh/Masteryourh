"use client";

import { useActionState } from "react";
import { resetTestDataAction, type ResetState } from "@/app/(panou)/admin/utilizatori/reset-actions";

/** Ștergerea tuturor datelor de test (cu confirmare scrisă). */
export function ResetTestData() {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetTestDataAction, { status: "idle" });
  if (state.status === "done") {
    return (
      <div className="rounded-xl bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-200">
        <p className="font-semibold">Gata: {state.total} înregistrări șterse.</p>
        {state.relinked > 0 && <p className="mt-1">{state.relinked} conturi de gospodar au fost mutate pe gospodăriile demo noi.</p>}
      </div>
    );
  }
  return (
    <form action={action} className="rounded-xl bg-red-50 p-4 text-sm ring-1 ring-red-200">
      <p className="font-semibold text-red-900">Șterge datele de test</p>
      <p className="mt-1 text-slate-700">
        Șterge definitiv toate precomenzile, loturile, pozele, documentele, registrele, jurnalele de creștere, livrările,
        plățile, investițiile, mesajele și legislația adăugată din admin. Rămân conturile de utilizator și gospodăriile create
        din admin. <strong>Nu se poate anula.</strong>
      </p>
      <label className="mt-3 block font-semibold" htmlFor="confirm-reset">Scrie STERG ca să confirmi</label>
      <div className="mt-1 flex flex-wrap gap-2">
        <input id="confirm-reset" name="confirm" autoComplete="off" className="rounded-lg border border-slate-300 bg-white px-3 py-2" />
        <button disabled={pending} className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-60">
          {pending ? "Se șterge…" : "Șterge toate datele de test"}
        </button>
      </div>
      {state.status === "error" && <p className="mt-2 text-red-800">{state.error}</p>}
    </form>
  );
}
