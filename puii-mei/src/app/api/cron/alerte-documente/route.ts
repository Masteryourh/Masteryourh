import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendDocumentReminders } from "@/server/document-alerts";

/**
 * Jobul zilnic al alertelor de expirare (Vercel Cron, vezi vercel.json). Vercel trimite `Authorization: Bearer
 * <CRON_SECRET>`; fără CRON_SECRET configurat (minimum 16 caractere) ruta refuză orice apel.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (secret.length < 16 || got.length !== want.length || !timingSafeEqual(got, want)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }
  return NextResponse.json(await sendDocumentReminders());
}
