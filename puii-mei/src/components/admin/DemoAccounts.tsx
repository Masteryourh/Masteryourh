"use client";

import { useActionState } from "react";
import { createDemoAccounts, type DemoAccountsState } from "@/app/(panou)/admin/utilizatori/demo-actions";

/** Butonul care creează conturile de test și le afișează parolele o singură dată. */
export function DemoAccounts() {
  const [state, action, pending] = useActionState<DemoAccountsState>(createDemoAccounts, { status: "idle" });
  return (
    <div className="rounded-xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200">
      <p className="font-semibold">Conturi de test</p>
      <p className="mt-1 text-slate-700">
        Creează câte un cont de gospodar pentru fiecare gospodărie care nu are încă unul și un cont de investitor (cu o
        investiție demonstrativă). Conturile sunt active imediat; parolele apar o singură dată, aici.
      </p>
      {state.status === "idle" && (
        <form action={action} className="mt-3">
          <button disabled={pending} className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white disabled:opacity-60">
            {pending ? "Se creează…" : "Creează conturile de test"}
          </button>
        </form>
      )}
      {state.status === "done" && (
        <div className="mt-3">
          {state.accounts.length ? (
            <>
              <p className="font-semibold text-red-800">Copiază parolele acum: nu se mai afișează.</p>
              <table className="mt-2 w-full text-left">
                <thead className="text-xs text-slate-500 uppercase">
                  <tr><th className="py-1 pr-3">Cont</th><th className="py-1 pr-3">Email</th><th className="py-1">Parolă</th></tr>
                </thead>
                <tbody>
                  {state.accounts.map((a) => (
                    <tr key={a.email}>
                      <td className="py-1 pr-3">{a.name} <span className="text-slate-500">({a.role})</span></td>
                      <td className="py-1 pr-3 font-mono text-xs">{a.email}</td>
                      <td className="py-1 font-mono text-xs font-semibold">{a.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-slate-600">Intră cu ele din „Contul meu” (www.puiimei.ro/cont), de preferat într-o fereastră privată.</p>
            </>
          ) : (
            <p>Nu a fost nevoie de conturi noi.</p>
          )}
          {state.skipped.length > 0 && <p className="mt-2 text-xs text-slate-500">Sărite: {state.skipped.join(", ")}.</p>}
        </div>
      )}
    </div>
  );
}
