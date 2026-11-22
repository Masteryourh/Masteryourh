"use client";

import { useActionState } from "react";
import { requestPinAction, verifyPinAction, type FindOrderState } from "@/app/(site)/comanda/actions";
import { buttonClasses } from "@/components/ui/Button";
import { Field, inputClasses } from "./Field";

const channelText = {
  sms: "prin SMS",
  email: "pe email",
  manual: "de echipa Puii mei (pe WhatsApp sau SMS), în cel mai scurt timp",
} as const;

/** „Comanda mea”: numărul precomenzii → PIN trimis clientului (valabil 24 de ore) → panoul comenzii. */
export function FindOrderForm({ number: initialNumber }: { number?: string }) {
  const [reqState, request, requesting] = useActionState<FindOrderState, FormData>(requestPinAction, { status: "idle", number: initialNumber });
  const [verState, verify, verifying] = useActionState<FindOrderState, FormData>(verifyPinAction, { status: "idle" });
  const pinStep = reqState.status === "pin" ? reqState : null;
  const verifyError = verState.status === "pin" ? verState.error : verState.status === "error" ? verState.error : undefined;

  if (pinStep) {
    return (
      <div className="grid gap-5 rounded-3xl bg-white p-6 ring-1 ring-forest-900/10 sm:p-8">
        <p role="status" className="rounded-2xl bg-forest-50 p-4 text-sm text-forest-800">
          PIN-ul pentru precomanda <strong className="font-mono">{pinStep.number}</strong> pleacă spre telefonul care se termină în{" "}
          <strong>{pinStep.masked}</strong>, {channelText[pinStep.channel]}. E valabil 24 de ore.
        </p>
        <form action={verify} className="grid gap-5">
          <input type="hidden" name="number" value={pinStep.number} />
          {verifyError && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">{verifyError}</p>}
          <Field id="pin" label="PIN (6 cifre)" required>
            <input id="pin" name="pin" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="123456" className={`${inputClasses} font-mono tracking-[0.3em]`} />
          </Field>
          <button disabled={verifying} className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
            {verifying ? "Se verifică…" : "Deschide comanda"}
          </button>
        </form>
        <form action={request}>
          <input type="hidden" name="number" value={pinStep.number} />
          <button disabled={requesting} className="text-sm font-semibold text-forest-700 underline">Nu a venit? Trimite din nou (după un minut)</button>
        </form>
      </div>
    );
  }

  return (
    <form action={request} className="grid gap-5 rounded-3xl bg-white p-6 ring-1 ring-forest-900/10 sm:p-8">
      {reqState.status === "error" && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">{reqState.error}</p>}
      <Field id="number" label="Numărul precomenzii" required>
        <input id="number" name="number" required defaultValue={reqState.number ?? ""} placeholder="PM2611-AB12C" autoCapitalize="characters" className={`${inputClasses} font-mono uppercase`} />
      </Field>
      <button disabled={requesting} className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
        {requesting ? "Se trimite…" : "Trimite-mi PIN-ul pe telefon"}
      </button>
      <p className="text-sm text-muted">Primești un PIN de 6 cifre pe telefonul folosit la precomandă. Cu el vezi comanda 24 de ore.</p>
    </form>
  );
}
