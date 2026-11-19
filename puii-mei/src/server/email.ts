import "server-only";

/**
 * Trimitere de emailuri prin Resend (https://resend.com), activă doar dacă sunt
 * setate RESEND_API_KEY și EMAIL_FROM (ex. „Puii mei <comenzi@puiimei.ro>”).
 * Fără ele, emailul nu se trimite, iar linkul rămâne disponibil în admin.
 */
export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  if (!emailEnabled()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, text }),
    });
    if (!res.ok) {
      console.error("[puii-mei] Emailul nu a putut fi trimis:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[puii-mei] Eroare la trimiterea emailului", err);
    return false;
  }
}
