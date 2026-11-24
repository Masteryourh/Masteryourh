import "server-only";

/**
 * Trimitere de emailuri prin Resend (https://resend.com), activă doar dacă sunt
 * setate RESEND_API_KEY și EMAIL_FROM (ex. „Puii mei <comenzi@puiimei.ro>”).
 * Fără ele, emailul nu se trimite, iar linkurile rămân disponibile în conturi.
 */
export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

type Email = { to: string; subject: string; html: string; text: string };

/**
 * Trimite un e-mail prin outbox (outbox.ts): se înregistrează în tranzacția curentă și pleacă după commit; dacă
 * tranzacția se anulează, nu pleacă. `immediate`: trimitere directă, cu rezultat (doar unde răspunsul depinde de el,
 * ex. PIN-ul, care altfel trece pe trimitere manuală).
 */
export async function sendEmail(email: Email, { immediate = false } = {}) {
  if (!email.to) return false;
  if (immediate) return emailEnabled() && (await deliverEmail(email)).ok;
  const { enqueue } = await import("./outbox");
  return enqueue("email", email);
}

/** Livrarea efectivă (Resend). `id`: cheia de idempotență (mesajul din outbox nu se trimite de două ori). */
export async function deliverEmail({ to, subject, html, text }: Email, id?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(id ? { "Idempotency-Key": id } : {}),
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, text }),
    });
    if (!res.ok) {
      const error = `${res.status} ${(await res.text()).slice(0, 200)}`;
      console.error("[puii-mei] Emailul nu a putut fi trimis:", error);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    console.error("[puii-mei] Eroare la trimiterea emailului", err);
    return { ok: false, error: err instanceof Error ? err.message : "eroare de rețea" };
  }
}
