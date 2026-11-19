"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { submitPreorder } from "@/app/precomanda/actions";
import { initialPreorderState } from "@/app/precomanda/form-state";
import type { DeliveryZone } from "@/lib/domain";
import { estimatePrice, pricing } from "@/lib/pricing";
import { formatDate, formatLei, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Checkbox, Field, Honeypot, fieldA11y, inputClasses } from "./Field";
import { SubmitButton } from "./SubmitButton";

export interface LotOption {
  code: string;
  farmName: string;
  village: string;
  availableFrom: string;
  free: number;
}

const NO_ADDRESS_ZONES = ["ridicare-personala", "alta-zona"];

export function PreorderForm({
  zones,
  lots,
  initialBirds,
  initialLot,
}: {
  zones: DeliveryZone[];
  lots: LotOption[];
  initialBirds?: number;
  initialLot?: string;
}) {
  const [state, formAction] = useActionState(submitPreorder, initialPreorderState);
  const [birds, setBirds] = useState(initialBirds ?? 8);
  const [zoneId, setZoneId] = useState("");
  const [lotCode, setLotCode] = useState(lots.some((l) => l.code === initialLot) ? initialLot! : "");
  const topRef = useRef<HTMLDivElement>(null);

  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : {};
  const zone = zones.find((z) => z.id === zoneId) ?? null;
  const lot = lots.find((l) => l.code === lotCode) ?? null;
  const estimate = estimatePrice(birds, zone);
  const needsAddress = zoneId !== "" && !NO_ADDRESS_ZONES.includes(zoneId);
  const maxBirds = lot ? Math.min(lot.free, pricing.maxBirds) : pricing.maxBirds;

  useEffect(() => {
    if (state.status !== "idle") topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state]);

  if (state.status === "success") {
    const r = state.result;
    return (
      <div ref={topRef} className="scroll-mt-28 rounded-[2rem] border border-forest-900/8 bg-white p-8 text-center sm:p-12" role="status">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest-50 text-forest-700">
          <Icon name="check" className="h-8 w-8" />
        </span>
        <h2 className="mt-6 text-3xl font-semibold">Mulțumim! Precomanda ta a fost înregistrată.</h2>
        <p className="mx-auto mt-3 max-w-lg text-lg text-muted">
          Te vom contacta telefonic în cel mult o zi lucrătoare pentru confirmare. Păstrează numărul precomenzii.
        </p>
        <dl className="mx-auto mt-8 grid max-w-xl gap-4 rounded-3xl bg-cream-100 p-6 text-left sm:grid-cols-2">
          <Summary label="Număr precomandă" value={<span className="font-mono">{r.number}</span>} />
          <Summary label="Cantitate" value={`${r.birds} pui (~${formatNumber(r.estimatedKg)} kg)`} />
          <Summary label="Lot" value={r.lotCode ?? "Primul lot disponibil"} />
          <Summary label="Disponibil estimat" value={r.availableFrom ? formatDate(r.availableFrom) : "Se comunică la alocare"} />
          <Summary label="Livrare" value={r.zoneName} />
          <Summary label="Valoare estimativă" value={formatLei(r.total)} />
        </dl>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {r.lotCode && (
            <Link href={`/trasabilitate/${r.lotCode}`} className={buttonClasses("primary", "lg")}>
              Urmărește lotul {r.lotCode}
            </Link>
          )}
          <Link href="/" className={buttonClasses("secondary", "lg")}>
            Înapoi la prima pagină
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} className="scroll-mt-28">
      <form action={formAction} noValidate className="relative grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <Honeypot />
        <div className="space-y-8">
          {errors.form && (
            <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">
              {errors.form}
            </p>
          )}
          {Object.keys(errors).length > 0 && !errors.form && (
            <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">
              Te rugăm să verifici câmpurile marcate mai jos.
            </p>
          )}

          {/* 1. Cantitate */}
          <fieldset className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
            <legend className="sr-only">Cantitate</legend>
            <StepTitle n={1} title="Câți pui dorești?" />
            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Cantități rapide">
              {pricing.presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setBirds(Math.min(p, maxBirds))}
                  aria-pressed={birds === p}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    birds === p ? "border-forest-700 bg-forest-700 text-white" : "border-forest-900/15 bg-white text-forest-800 hover:border-forest-700/40",
                  )}
                >
                  {p} pui
                </button>
              ))}
            </div>
            <Field id="birds" label="Număr de pui" required error={errors.birds} className="mt-5" hint={`Între ${pricing.minBirds} și ${maxBirds} pui. Greutate medie estimată: ${formatNumber(pricing.avgWeightKg)} kg/pui.`}>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setBirds((b) => Math.max(pricing.minBirds, b - 1))} className="h-12 w-12 shrink-0 rounded-2xl border border-forest-900/15 bg-white text-xl font-semibold text-forest-800 hover:bg-forest-50" aria-label="Scade un pui">
                  −
                </button>
                <input
                  {...fieldA11y("birds", errors.birds, true)}
                  type="number"
                  inputMode="numeric"
                  min={pricing.minBirds}
                  max={maxBirds}
                  value={Number.isNaN(birds) ? "" : birds}
                  onChange={(e) => setBirds(e.target.valueAsNumber)}
                  className={cn(inputClasses, "text-center text-lg font-semibold")}
                />
                <button type="button" onClick={() => setBirds((b) => Math.min(maxBirds, (Number.isNaN(b) ? 0 : b) + 1))} className="h-12 w-12 shrink-0 rounded-2xl border border-forest-900/15 bg-white text-xl font-semibold text-forest-800 hover:bg-forest-50" aria-label="Adaugă un pui">
                  +
                </button>
              </div>
            </Field>
          </fieldset>

          {/* 2. Lot */}
          <fieldset className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
            <legend className="sr-only">Lot de producție</legend>
            <StepTitle n={2} title="Din ce lot?" />
            <p className="mt-2 text-sm text-muted">Alegerea lotului stabilește gospodăria și data estimată a livrării.</p>
            <div className="mt-5 grid gap-3">
              <LotRadio checked={lotCode === ""} onChange={() => setLotCode("")} title="Primul lot disponibil" subtitle="Te alocăm în cel mai apropiat lot cu locuri libere." />
              {lots.map((l) => (
                <LotRadio
                  key={l.code}
                  checked={lotCode === l.code}
                  onChange={() => {
                    setLotCode(l.code);
                    setBirds((b) => Math.min(b, l.free));
                  }}
                  title={
                    <>
                      <span className="font-mono">{l.code}</span> · {l.farmName}
                    </>
                  }
                  subtitle={`${l.village} · disponibil estimat ${formatDate(l.availableFrom)} · ${l.free} locuri libere`}
                />
              ))}
            </div>
            <input type="hidden" name="lotCode" value={lotCode} />
            {errors.lotCode && <p className="mt-2 text-sm font-medium text-red-700">{errors.lotCode}</p>}
          </fieldset>

          {/* 3. Livrare */}
          <fieldset className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
            <legend className="sr-only">Livrare</legend>
            <StepTitle n={3} title="Unde livrăm?" />
            <div className="mt-5 grid gap-5">
              <Field id="zoneId" label="Zona de livrare" required error={errors.zoneId} hint={zone ? `${zone.localities}. Zi de livrare: ${zone.deliveryDay}.` : undefined}>
                <select {...fieldA11y("zoneId", errors.zoneId, !!zone)} value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={inputClasses}>
                  <option value="">Alege zona…</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                      {z.fee > 0 ? ` – livrare ${formatLei(z.fee)}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {needsAddress && (
                <Field id="address" label="Adresa de livrare" required error={errors.address}>
                  <input {...fieldA11y("address", errors.address)} defaultValue={values.address} autoComplete="street-address" placeholder="Strada, număr, bloc, apartament, localitate" className={inputClasses} />
                </Field>
              )}
            </div>
          </fieldset>

          {/* 4. Date de contact */}
          <fieldset className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
            <legend className="sr-only">Date de contact</legend>
            <StepTitle n={4} title="Datele tale" />
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field id="name" label="Nume și prenume" required error={errors.name} className="sm:col-span-2">
                <input {...fieldA11y("name", errors.name)} defaultValue={values.name} autoComplete="name" className={inputClasses} />
              </Field>
              <Field id="phone" label="Telefon" required error={errors.phone}>
                <input {...fieldA11y("phone", errors.phone)} defaultValue={values.phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="07xx xxx xxx" className={inputClasses} />
              </Field>
              <Field id="email" label="Email" required error={errors.email}>
                <input {...fieldA11y("email", errors.email)} defaultValue={values.email} type="email" autoComplete="email" placeholder="nume@exemplu.ro" className={inputClasses} />
              </Field>
              <Field id="notes" label="Observații" error={errors.notes} className="sm:col-span-2">
                <textarea {...fieldA11y("notes", errors.notes)} defaultValue={values.notes} rows={3} maxLength={500} placeholder="Ex. preferințe de livrare, porționare, interval orar" className={inputClasses} />
              </Field>
            </div>
            <div className="mt-6 space-y-4">
              <Checkbox id="termsConsent" error={errors.termsConsent} defaultChecked={values.termsConsent === "on"}>
                Sunt de acord cu prelucrarea datelor personale pentru gestionarea precomenzii, conform{" "}
                <Link href="/confidentialitate" className="font-semibold text-forest-700 underline underline-offset-2" target="_blank">
                  politicii de confidențialitate
                </Link>
                . <span className="text-grain-600">*</span>
              </Checkbox>
              <Checkbox id="marketingConsent" defaultChecked={values.marketingConsent === "on"}>
                Vreau să primesc noutăți despre loturile noi și gospodăriile partenere.
              </Checkbox>
            </div>
          </fieldset>
        </div>

        {/* Sumar */}
        <aside className="lg:sticky lg:top-28" aria-label="Sumarul precomenzii">
          <div className="rounded-3xl bg-forest-900 p-6 text-cream-50 sm:p-8">
            <h2 className="font-display text-2xl font-semibold text-cream-50">Sumar precomandă</h2>
            <dl className="mt-6 space-y-3 text-sm" aria-live="polite">
              <Row label="Cantitate" value={`${estimate.birds} pui`} />
              <Row label="Greutate estimată" value={`~${formatNumber(estimate.estimatedKg)} kg`} />
              <Row label="Preț estimativ" value={`${formatLei(estimate.pricePerKg)} / kg`} />
              <Row label="Valoare produse" value={formatLei(estimate.productValue)} />
              <Row
                label="Livrare"
                value={!zone ? "—" : estimate.deliveryFee === 0 ? "Gratuită" : formatLei(estimate.deliveryFee)}
              />
              <Row label="Lot" value={lot ? lot.code : "Primul disponibil"} />
              {lot && <Row label="Disponibil estimat" value={formatDate(lot.availableFrom)} />}
            </dl>
            <div className="mt-6 flex items-baseline justify-between border-t border-white/15 pt-5">
              <span className="text-sm text-cream-100/80">Valoare estimativă</span>
              <span className="font-display text-3xl font-semibold text-grain-300">{formatLei(estimate.total)}</span>
            </div>
            {zone && zone.fee > 0 && estimate.deliveryFee > 0 && (
              <p className="mt-2 text-xs text-cream-100/60">
                Livrare gratuită pentru comenzi de peste {formatLei(pricing.freeDeliveryFrom)}.
              </p>
            )}
            <div className="mt-6">
              <SubmitButton pendingText="Se trimite…">Trimite precomanda</SubmitButton>
            </div>
            <ul className="mt-6 space-y-2 text-xs text-cream-100/70">
              <li className="flex gap-2"><Icon name="check" className="h-4 w-4 shrink-0 text-grain-300" /> Fără plată online acum</li>
              <li className="flex gap-2"><Icon name="check" className="h-4 w-4 shrink-0 text-grain-300" /> Prețul final se stabilește la cântărire</li>
              <li className="flex gap-2"><Icon name="check" className="h-4 w-4 shrink-0 text-grain-300" /> Anulare gratuită până la începutul lotului</li>
            </ul>
          </div>
        </aside>
      </form>
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center gap-3 font-display text-xl font-semibold sm:text-2xl">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-grain-300 font-sans text-sm text-forest-900">{n}</span>
      {title}
    </h2>
  );
}

function LotRadio({ checked, onChange, title, subtitle }: { checked: boolean; onChange: () => void; title: React.ReactNode; subtitle: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition",
        checked ? "border-forest-700 bg-forest-50" : "border-forest-900/12 hover:border-forest-700/40",
      )}
    >
      <input type="radio" name="lotChoice" checked={checked} onChange={onChange} className="mt-1 h-4 w-4 accent-forest-700" />
      <span>
        <span className="block font-semibold text-forest-900">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{subtitle}</span>
      </span>
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-cream-100/70">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-forest-900">{value}</dd>
    </div>
  );
}
