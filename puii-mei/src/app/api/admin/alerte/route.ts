import { NextResponse } from "next/server";
import { adminAlerts } from "@/server/admin-alerts";
import { getCurrentUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** Alertele care așteaptă decizia adminului (folosit de notificarea din panou). */
export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  return NextResponse.json({ alerts: await adminAlerts() }, { headers: { "Cache-Control": "no-store" } });
}
