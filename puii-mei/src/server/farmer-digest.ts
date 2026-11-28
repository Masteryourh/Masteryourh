import "server-only";
import { DEFAULT_DIGEST, planDigests, type DigestConfig, type DigestFarm, type DigestMessage, type DigestSkip } from "@/lib/farmer-digest";
import { site } from "@/lib/site";
import { store } from "./db/store";
import { enqueue } from "./outbox";
import { farmerDayItems } from "./farmer-day";
import { farmRepository } from "./repositories/catalog";
import { userRepository } from "./repositories/users";

/**
 * Rezumatul de dimineață pentru gospodari (mandat #62, 28.11.2026): construit și testat, NEACTIVAT.
 * - Setarea (`settings/rezumat-gospodari`): canal, oră, fus orar, `enabled` — implicit dezactivat, fără interfață;
 * - deduplicarea: un rând `digest-log/<cheie>` blocat cu `FOR UPDATE` (store.transact) — două rulări simultane ale
 *   cron-ului nu pot pune același rezumat de două ori în outbox;
 * - trimiterea trece printr-un adaptor: `outboxSender` (real, folosit doar când `enabled`) sau `mockSender` (probă).
 */
export interface DigestSender {
  name: string;
  send(m: DigestMessage): Promise<void>;
}

/** Adaptorul de probă: doar ține mesajele în memorie (nimic nu pleacă). */
export function mockSender(): DigestSender & { sent: DigestMessage[] } {
  const sent: DigestMessage[] = [];
  return { name: "proba", sent, send: async (m) => void sent.push(m) };
}

/** Adaptorul real: outbox-ul existent (trimitere după commit, reîncercări, ștergerea conținutului după trimitere). */
export const outboxSender: DigestSender = {
  name: "outbox",
  send: async (m) => {
    await (m.channel === "sms" ? enqueue("sms", { to: m.to, text: m.text }) : enqueue("email", { to: m.to, subject: m.subject, html: m.html, text: m.text }));
  },
};

type DigestSettings = Partial<DigestConfig> & { id: string };
export async function digestConfig(): Promise<DigestConfig> {
  const s = await store.get<DigestSettings>("settings", "rezumat-gospodari");
  return { ...DEFAULT_DIGEST, ...(s ?? {}), enabled: s?.enabled === true };
}

type LogRow = { id: string; state: "nou" | "pus-in-coada"; at?: string; sender?: string };

/** Revendică cheia (o singură dată, chiar la apeluri simultane). */
async function claim(key: string, sender: string, now: Date) {
  return store.transact<LogRow, boolean>(
    "digest-log",
    key,
    (cur) => (cur?.state === "pus-in-coada" ? { result: false } : { patch: { state: "pus-in-coada", at: now.toISOString(), sender }, result: true }),
    { id: key, state: "nou" },
  );
}

/** Contactul gospodăriei: primul gospodar activ legat de ea. */
async function farmsWithItems(now: Date): Promise<DigestFarm[]> {
  const farms = await farmRepository.listAll();
  return Promise.all(
    farms.map(async (f) => {
      const users = (await userRepository.byFarm(f.slug)).filter((u) => u.role === "gospodar" && u.status === "activ");
      return { slug: f.slug, name: f.name, phone: users[0]?.phone, email: users[0]?.email, items: await farmerDayItems(f.slug, { now }) };
    }),
  );
}

export async function runDigests({ now = new Date(), config, sender, keyPrefix = "" }: { now?: Date; config: DigestConfig; sender: DigestSender; keyPrefix?: string }) {
  const plan = planDigests(await farmsWithItems(now), now, new Set(), config, site.url);
  const queued: DigestMessage[] = [];
  const skips: DigestSkip[] = [...plan.skips];
  for (const m of plan.messages) {
    if (await claim(`${keyPrefix}${m.key}`, sender.name, now)) {
      await sender.send(m);
      queued.push(m);
    } else skips.push({ farmSlug: m.farmSlug, reason: "deja-trimis" });
  }
  return { queued, skips };
}

/** Pentru răspunsuri și jurnale: destinatarul fără date personale complete. */
export const maskContact = (to: string) => (to.includes("@") ? `${to.slice(0, 2)}…@${to.split("@")[1]}` : `…${to.replace(/\D/g, "").slice(-3)}`);
