import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { digestConfig, maskContact, mockSender, outboxSender, runDigests } from "@/server/farmer-digest";

/**
 * Rezumatul de dimineață pentru gospodari. NU e programat (lipsește intenționat din vercel.json) și e dezactivat
 * implicit. Apel protejat cu `Authorization: Bearer <CRON_SECRET>`, ca celelalte joburi.
 * - fără parametri: setarea reală (dezactivată ⇒ nimic nu se trimite, răspunsul spune de ce);
 * - `?proba=1`: rulare de probă cu adaptorul de test, setarea forțată „activă”, chei separate („proba:”), nimic trimis.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (secret.length < 16 || got.length !== want.length || !timingSafeEqual(got, want)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }
  const proba = req.nextUrl.searchParams.get("proba") === "1";
  const config = await digestConfig();
  const sender = proba ? mockSender() : outboxSender;
  const r = await runDigests({ config: proba ? { ...config, enabled: true, hour: 0 } : config, sender, keyPrefix: proba ? "proba:" : "" });
  return NextResponse.json({
    mod: proba ? "proba" : config.enabled ? "activ" : "dezactivat",
    canal: config.channel,
    ora: config.hour,
    puse: r.queued.map((m) => ({ gospodarie: m.farmSlug, catre: maskContact(m.to), subiect: m.subject, text: m.text })),
    sarite: r.skips,
  });
}
