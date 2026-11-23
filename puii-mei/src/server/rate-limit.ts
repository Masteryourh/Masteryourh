import "server-only";
import { headers } from "next/headers";
import { store } from "@/server/db/store";

/**
 * Limite de rată persistente, comune tuturor instanțelor serverului (contor atomic în baza de date).
 * Fereastră fixă: `key` + începutul ferestrei; la expirare contorul se resetează.
 */
const COLLECTION = "rate-limits";

interface Counter {
  id: string;
  count: number;
  windowStart: number; // ms
}

export async function hitRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  return store.transact<Counter, { allowed: boolean; remaining: number }>(
    COLLECTION,
    key,
    (cur) => {
      const fresh = !cur || now - cur.windowStart >= windowSeconds * 1000;
      const count = fresh ? 1 : cur!.count + 1;
      const patch: Partial<Counter> = fresh ? { count, windowStart: now } : { count };
      return { patch, result: { allowed: count <= limit, remaining: Math.max(0, limit - count) } };
    },
    { id: key, count: 0, windowStart: now },
  );
}

/** IP-ul clientului (primul din X-Forwarded-For, setat de Vercel). */
export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "necunoscut").trim();
}
