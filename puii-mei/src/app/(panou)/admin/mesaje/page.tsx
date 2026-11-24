import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { formatDate } from "@/lib/format";
import { unsentMessages } from "@/server/outbox";
import { emailEnabled } from "@/server/email";
import { smsEnabled } from "@/server/sms";
import type { OutboxStatus } from "@/server/outbox-core";
import { retryMessageAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mesaje netrimise", robots: { index: false, follow: false } };

const statusLabel: Record<OutboxStatus, string> = {
  pending: "În așteptare (se reîncearcă)",
  sending: "Se trimite",
  dead: "Eșuat definitiv",
  skipped: "Netrimis: canal neconfigurat",
  sent: "Trimis",
};

/**
 * Mesajele (e-mail / SMS) care nu au plecat: Admin vede ce nu a ajuns la oameni și poate retrimite un mesaj eșuat.
 * Se afișează doar rezumatul (subiectul), nu destinatarul sau conținutul.
 */
export default async function UnsentMessagesPage() {
  const messages = await unsentMessages();
  const count = (s: OutboxStatus) => messages.filter((m) => m.status === s).length;
  return (
    <Container className="py-8">
      <h1>Mesaje netrimise</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        E-mailurile și SMS-urile pleacă după ce operația s-a salvat. Aici apar cele care nu au ajuns: cele care se reîncearcă
        automat, cele eșuate definitiv (după 6 încercări) și cele netrimise pentru că e-mailul sau SMS-ul nu e configurat.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2 text-sm">
        <li className="rounded-lg bg-white px-3 py-1 ring-1 ring-slate-200">E-mail: {emailEnabled() ? "configurat" : "neconfigurat"}</li>
        <li className="rounded-lg bg-white px-3 py-1 ring-1 ring-slate-200">SMS: {smsEnabled() ? "configurat" : "neconfigurat"}</li>
        <li className="rounded-lg bg-white px-3 py-1 ring-1 ring-slate-200">Eșuate definitiv: {count("dead")}</li>
        <li className="rounded-lg bg-white px-3 py-1 ring-1 ring-slate-200">În așteptare: {count("pending") + count("sending")}</li>
        <li className="rounded-lg bg-white px-3 py-1 ring-1 ring-slate-200">Canal neconfigurat: {count("skipped")}</li>
      </ul>
      {messages.length === 0 ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">Toate mesajele au plecat.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Creat</th>
                <th className="px-4 py-3">Mesaj</th>
                <th className="px-4 py-3">Stare</th>
                <th className="px-4 py-3">Încercări</th>
                <th className="px-4 py-3">Ultima eroare</th>
                <th className="px-4 py-3"><span className="sr-only">Acțiuni</span></th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} id={`mesaj-${m.id}`} data-status={m.status} className="border-t border-slate-100 align-top">
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-3">{m.summary}</td>
                  <td className="px-4 py-3">{statusLabel[m.status]}</td>
                  <td className="px-4 py-3">{m.attempts}</td>
                  <td className="px-4 py-3 text-slate-600">{m.lastError ?? "—"}</td>
                  <td className="px-4 py-3">
                    {m.status === "dead" && m.payload && (
                      <form action={retryMessageAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <button className="rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-slate-300">Retrimite</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}
