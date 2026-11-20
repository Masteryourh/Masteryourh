"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CourierState } from "@/app/(site)/livrare/actions";
import { checkPinRequest } from "@/app/(site)/livrare/actions";
import { PHOTO_SIDES, extensionReasons, vehicleTypes } from "@/lib/delivery";
import { prepareForm } from "@/lib/client-media";
import { buttonClasses } from "@/components/ui/Button";
import { inputClasses } from "@/components/forms/Field";
import { PhotoInput } from "./PhotoInput";
import { SignaturePad, type SignatureHandle } from "./SignaturePad";

type Action = (prev: CourierState, fd: FormData) => Promise<CourierState>;
const initial: CourierState = { status: "idle" };

function useCourierForm(action: Action) {
  const [state, dispatch] = useActionState(action, initial);
  const [pending, start] = useTransition();
  const [preparing, setPreparing] = useState(false);
  const errors = state.status === "error" ? state.errors : {};
  async function submit(e: React.FormEvent<HTMLFormElement>, extra?: Record<string, Blob | null>) {
    e.preventDefault();
    setPreparing(true);
    const fd = await prepareForm(e.currentTarget, extra);
    setPreparing(false);
    start(() => dispatch(fd));
  }
  return { state, errors, busy: pending || preparing, submit };
}

function Alert({ state }: { state: CourierState }) {
  if (state.status !== "error") return null;
  return (
    <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">
      {state.error ?? "Completează câmpurile marcate."}
    </p>
  );
}

function Input({ name, label, error, ...rest }: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-forest-900">{label}</label>
      <input id={name} name={name} aria-invalid={error ? true : undefined} className={inputClasses} {...rest} />
      {error && <p className="mt-1 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}

function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={busy} className={buttonClasses("primary", "lg", "w-full")}>
      {busy ? "Se trimite…" : children}
    </button>
  );
}

function DriverFields({ errors }: { errors: Record<string, string> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input name="name" label="Numele șoferului" autoComplete="name" error={errors.name} />
      <Input name="phone" label="Telefon" type="tel" inputMode="tel" autoComplete="tel" error={errors.phone} />
      <Input name="plate" label="Număr de înmatriculare" autoCapitalize="characters" placeholder="SV 12 ABC" error={errors.plate} />
      <div>
        <label htmlFor="vehicleType" className="mb-1.5 block text-sm font-semibold text-forest-900">Tipul mașinii</label>
        <select id="vehicleType" name="vehicleType" defaultValue="" className={inputClasses} aria-invalid={errors.vehicleType ? true : undefined}>
          <option value="">Alege…</option>
          {vehicleTypes.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        {errors.vehicleType && <p className="mt-1 text-xs font-medium text-red-700">{errors.vehicleType}</p>}
      </div>
      <div className="sm:col-span-2">
        <Input name="atp" label="Seria certificatului ATP (transport alimente)" error={errors.atp} />
      </div>
    </div>
  );
}

/* ------------------------------ acces ------------------------------ */

export function PairForms({ pairAction, requestAction }: { pairAction: Action; requestAction: Action }) {
  const [mode, setMode] = useState<"pin" | "cerere">("pin");
  const pair = useCourierForm(pairAction);
  const req = useCourierForm(requestAction);
  const f = mode === "pin" ? pair : req;
  return (
    <form onSubmit={(e) => f.submit(e)} className="space-y-6" noValidate>
      <Alert state={f.state} />
      <DriverFields errors={f.errors} />
      {mode === "pin" ? (
        <>
          <Input name="pin" label="PIN de ridicare (de la gospodar)" inputMode="numeric" maxLength={4} autoComplete="one-time-code" error={pair.errors.pin} className={`${inputClasses} text-center text-2xl tracking-[0.5em]`} />
          <Submit busy={pair.busy}>Confirm ridicarea</Submit>
          <button type="button" onClick={() => setMode("cerere")} className="w-full text-sm font-semibold text-forest-700 underline">
            Nu am PIN-ul – cer confirmarea gospodarului
          </button>
        </>
      ) : (
        <>
          <p className="rounded-2xl bg-cream-100 p-4 text-sm text-forest-900">
            Gospodarul primește cererea ta și o confirmă cu un buton. Pagina se deblochează singură după confirmare.
          </p>
          <Submit busy={req.busy}>Cere confirmarea gospodarului</Submit>
          <button type="button" onClick={() => setMode("pin")} className="w-full text-sm font-semibold text-forest-700 underline">
            Am PIN-ul
          </button>
        </>
      )}
    </form>
  );
}

/** Așteaptă confirmarea gospodarului (verifică la câteva secunde). */
export function WaitForApproval({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("asteapta");
  useEffect(() => {
    const id = setInterval(async () => {
      const s = await checkPinRequest(token);
      setStatus(s);
      if (s === "aprobata" || s === "respinsa") {
        clearInterval(id);
        router.refresh();
      }
    }, 4000);
    return () => clearInterval(id);
  }, [token, router]);
  return (
    <p role="status" className="flex items-center gap-3 rounded-2xl bg-grain-300/40 p-4 text-sm font-semibold text-forest-900">
      <span className="h-3 w-3 animate-pulse rounded-full bg-grain-500" aria-hidden />
      {status === "respinsa" ? "Gospodarul a respins cererea." : "Așteptăm confirmarea gospodarului…"}
    </p>
  );
}

export function SetPinForm({ action }: { action: Action }) {
  const f = useCourierForm(action);
  return (
    <form onSubmit={(e) => f.submit(e)} className="space-y-5" noValidate>
      <Alert state={f.state} />
      <Input name="pin" label="Alege PIN-ul tău (4 cifre)" type="password" inputMode="numeric" maxLength={4} error={f.errors.pin} />
      <Input name="confirm" label="Repetă PIN-ul" type="password" inputMode="numeric" maxLength={4} error={f.errors.confirm} />
      <Submit busy={f.busy}>Salvează PIN-ul</Submit>
    </form>
  );
}

export function PinLoginForm({ action }: { action: Action }) {
  const f = useCourierForm(action);
  return (
    <form onSubmit={(e) => f.submit(e)} className="space-y-5" noValidate>
      <Alert state={f.state} />
      <Input name="pin" label="PIN-ul tău personal" type="password" inputMode="numeric" maxLength={4} autoFocus className={`${inputClasses} text-center text-2xl tracking-[0.5em]`} />
      <Submit busy={f.busy}>Intră în tură</Submit>
    </form>
  );
}

/* ------------------------------ traseu ------------------------------ */

export function StartForm({ action }: { action: Action }) {
  const f = useCourierForm(action);
  return (
    <form onSubmit={(e) => f.submit(e)} className="space-y-5" noValidate>
      <Alert state={f.state} />
      <div className="grid grid-cols-2 gap-3">
        <PhotoInput name="platePhoto" label="Plăcuța de înmatriculare" error={f.errors.platePhoto} />
        <PhotoInput name="odometerPhoto" label="Bordul (kilometraj)" error={f.errors.odometerPhoto} />
      </div>
      <Input name="odometer" label="Kilometraj la pornire" inputMode="numeric" error={f.errors.odometer} />
      <div className="grid grid-cols-2 gap-3">
        <PhotoInput name="tempPhoto" label="Termometrul compartimentului" error={f.errors.tempPhoto} />
        <Input name="compartmentTemp" label="Temperatura (°C)" inputMode="decimal" error={f.errors.compartmentTemp} />
      </div>
      <label className="flex items-start gap-3 rounded-2xl border border-forest-900/12 p-4">
        <input type="checkbox" name="hygieneOk" className="mt-0.5 h-6 w-6 accent-forest-700" />
        <span className="font-semibold text-forest-900">Compartimentul de marfă este curat și igienizat</span>
      </label>
      {f.errors.hygieneOk && <p className="text-xs font-medium text-red-700">{f.errors.hygieneOk}</p>}
      <Submit busy={f.busy}>Pornește tura</Submit>
    </form>
  );
}

export function LoadForm({ action }: { action: Action }) {
  const f = useCourierForm(action);
  return (
    <form onSubmit={(e) => f.submit(e)} className="space-y-5" noValidate>
      <Alert state={f.state} />
      <p className="text-sm text-muted">Câte o fotografie pentru fiecare latură a coletului, apoi temperatura mărfii.</p>
      <div className="grid grid-cols-2 gap-3">
        {PHOTO_SIDES.map((side, i) => (
          <PhotoInput key={side} name={`photo${i + 1}`} label={side} error={f.errors[`photo${i + 1}`]} />
        ))}
      </div>
      <Input name="temp" label="Temperatura mărfii la încărcare (°C)" inputMode="decimal" error={f.errors.temp} />
      <Submit busy={f.busy}>Încărcat</Submit>
    </form>
  );
}

export function DeliverForm({ action }: { action: Action }) {
  const f = useCourierForm(action);
  const sig = useRef<SignatureHandle>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const blob = await sig.current?.toBlob();
        await f.submit({ ...e, preventDefault: () => {}, currentTarget: form } as React.FormEvent<HTMLFormElement>, { signature: blob ?? null });
      }}
      className="space-y-5"
      noValidate
    >
      <Alert state={f.state} />
      <div className="grid grid-cols-2 gap-3">
        <PhotoInput name="tempPhoto" label="Termometrul la predare" error={f.errors.tempPhoto} />
        <Input name="temp" label="Temperatura (°C)" inputMode="decimal" error={f.errors.temp} />
      </div>
      <div>
        <p className="mb-1.5 text-sm font-semibold text-forest-900">Semnătura clientului</p>
        <SignaturePad ref={sig} error={f.errors.signature} />
      </div>
      <p className="text-xs text-muted">La trimitere se salvează automat ora și poziția GPS.</p>
      <Submit busy={f.busy}>Predat clientului</Submit>
    </form>
  );
}

export function FinishForm({ action, undelivered }: { action: Action; undelivered: number }) {
  const f = useCourierForm(action);
  return (
    <form onSubmit={(e) => f.submit(e)} className="space-y-5" noValidate>
      <Alert state={f.state} />
      <div className="grid grid-cols-2 gap-3">
        <PhotoInput name="odometerPhoto" label="Bordul (kilometraj final)" error={f.errors.odometerPhoto} />
        <Input name="odometer" label="Kilometraj la final" inputMode="numeric" error={f.errors.odometer} />
      </div>
      <div>
        <label htmlFor="note" className="mb-1.5 block text-sm font-semibold text-forest-900">
          Observații{undelivered ? " (obligatoriu: de ce nu s-au predat toate coletele)" : ""}
        </label>
        <textarea id="note" name="note" rows={3} className={inputClasses} />
        {f.errors.note && <p className="mt-1 text-xs font-medium text-red-700">{f.errors.note}</p>}
      </div>
      <Submit busy={f.busy}>Închei tura</Submit>
    </form>
  );
}

export function ExtensionForm({ action }: { action: Action }) {
  const f = useCourierForm(action);
  return (
    <form onSubmit={(e) => f.submit(e)} className="space-y-4" noValidate>
      <Alert state={f.state} />
      {f.state.status === "ok" && <p role="status" className="rounded-2xl bg-forest-50 p-3 text-sm font-semibold text-forest-800">Cererea a fost trimisă. Așteaptă decizia administratorului.</p>}
      <div>
        <label htmlFor="reason" className="mb-1.5 block text-sm font-semibold text-forest-900">Motivul</label>
        <select id="reason" name="reason" defaultValue="" className={inputClasses}>
          <option value="">Alege…</option>
          {extensionReasons.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {f.errors.reason && <p className="mt-1 text-xs font-medium text-red-700">{f.errors.reason}</p>}
      </div>
      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-semibold text-forest-900">Ce s-a întâmplat</label>
        <textarea id="description" name="description" rows={3} className={inputClasses} />
        {f.errors.description && <p className="mt-1 text-xs font-medium text-red-700">{f.errors.description}</p>}
      </div>
      <PhotoInput name="proof" label="Fotografie doveditoare" error={f.errors.proof} />
      <p className="text-xs text-muted">Ora și poziția GPS se salvează automat.</p>
      <Submit busy={f.busy}>Cere prelungire</Submit>
    </form>
  );
}
