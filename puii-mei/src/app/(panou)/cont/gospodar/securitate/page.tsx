import type { Metadata } from "next";
import QRCode from "qrcode";
import { inputClasses } from "@/components/forms/Field";
import { Container } from "@/components/ui/Container";
import { mfaEnabled, pendingSecret } from "@/server/mfa";
import { ENV_ADMIN_ID, requireUser } from "@/server/session";
import { otpauthUri } from "@/server/totp";
import { confirmMfaAction, disableMfaAction, startMfaAction } from "../securitate-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Securitate", robots: { index: false, follow: false } };

export default async function SecurityPage({ searchParams }: PageProps<"/cont/gospodar/securitate">) {
  const sp = await searchParams;
  const user = await requireUser(["gospodar"], "/cont/gospodar/securitate");
  const active = mfaEnabled(user);
  const secret = user.id !== ENV_ADMIN_ID ? pendingSecret(user) : null;
  const qr = secret ? await QRCode.toString(otpauthUri(secret, user.email), { type: "svg", margin: 1, errorCorrectionLevel: "M" }) : null;
  const btn = "rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white";

  return (
    <Container className="max-w-2xl py-8">
      <h1 className="text-3xl font-semibold">Securitate</h1>
      <h2 className="mt-6 text-xl font-semibold">Cod de confirmare (aplicație pe telefon)</h2>
      <p className="mt-1 text-sm text-muted">
        Pentru operațiunile cu bani, ca schimbarea contului bancar în care plătesc clienții, îți cerem pe lângă parolă un cod
        de 6 cifre dintr-o aplicație de pe telefon (de exemplu Google Authenticator sau Microsoft Authenticator). Așa, chiar
        dacă cineva îți află parola, nu poate redirecționa banii.
      </p>
      {typeof sp.eroare === "string" && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{sp.eroare}</p>}
      {sp.activat && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-900">Codul de confirmare e activ.</p>}
      {sp.dezactivat && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-900">Codul de confirmare a fost dezactivat.</p>}

      {active ? (
        <div className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-forest-900/10">
          <p className="font-semibold text-forest-800">Activ din {new Date(user.mfa!.enabledAt!).toLocaleDateString("ro-RO")}.</p>
          <form action={disableMfaAction} className="mt-4 flex flex-wrap items-end gap-2">
            <label className="text-sm font-semibold">
              Cod din aplicație (pentru dezactivare)
              <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className={`${inputClasses} mt-1 w-40 text-center tracking-[0.3em]`} />
            </label>
            <button className="rounded-lg px-4 py-2 text-sm font-semibold text-red-800 ring-1 ring-red-300">Dezactivează</button>
          </form>
          <p className="mt-3 text-xs text-muted">Ai pierdut telefonul? Sună echipa PUII MEI: după verificare, codul se resetează din administrare.</p>
        </div>
      ) : secret && sp.pas === "scanare" ? (
        <div className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-forest-900/10">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Deschide aplicația de autentificare pe telefon și adaugă un cont nou („scanează un cod QR”).</li>
            <li>Scanează codul de mai jos (sau scrie manual cheia).</li>
            <li>Introdu codul de 6 cifre afișat acum în aplicație.</li>
          </ol>
          <div className="mt-4 w-48 rounded-lg bg-white p-2 ring-1 ring-forest-900/10" aria-label="Cod QR pentru aplicația de autentificare" dangerouslySetInnerHTML={{ __html: qr! }} />
          <p className="mt-2 text-xs text-muted">Cheia: <span className="font-mono select-all" data-mfa-secret>{secret.replace(/(.{4})/g, "$1 ").trim()}</span></p>
          <form action={confirmMfaAction} className="mt-4 flex flex-wrap items-end gap-2">
            <label className="text-sm font-semibold">
              Codul din aplicație
              <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className={`${inputClasses} mt-1 w-40 text-center tracking-[0.3em]`} />
            </label>
            <button className={btn}>Confirmă și activează</button>
          </form>
        </div>
      ) : (
        <form action={startMfaAction} className="mt-4">
          <button className={btn}>Activează codul de confirmare</button>
        </form>
      )}
    </Container>
  );
}
