import "server-only";

/**
 * Trimitere SMS prin Twilio (https://www.twilio.com), activă doar dacă sunt setate
 * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN și TWILIO_FROM (numărul sau numele expeditorului).
 */
export function smsEnabled() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

/** Numărul în format internațional (+40…) pentru numerele românești scrise 07xx… */
export function toE164(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("40")) return `+${d}`;
  if (d.startsWith("0")) return `+4${d}`;
  return `+${d}`;
}

/** SMS prin outbox (vezi sendEmail): pleacă după commit. `immediate`: direct, cu rezultat (ex. PIN-ul). */
export async function sendSms(to: string, text: string, { immediate = false } = {}) {
  if (!to) return false;
  if (immediate) return smsEnabled() && (await deliverSms({ to, text })).ok;
  const { enqueue } = await import("./outbox");
  return enqueue("sms", { to, text });
}

export async function deliverSms({ to, text }: { to: string; text: string }): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toE164(to), From: process.env.TWILIO_FROM!, Body: text }),
    });
    if (!res.ok) {
      const error = `${res.status} ${(await res.text()).slice(0, 200)}`;
      console.error("[puii-mei] SMS-ul nu a putut fi trimis:", error);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    console.error("[puii-mei] Eroare la trimiterea SMS-ului", err);
    return { ok: false, error: err instanceof Error ? err.message : "eroare de rețea" };
  }
}
