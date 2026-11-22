import { NextResponse, type NextRequest } from "next/server";
import { clearOrderAccess } from "@/server/order-access";

/** Ieșirea clientului din „Comanda mea”: șterge accesul cu PIN și duce la căutarea comenzii. */
export async function POST(req: NextRequest) {
  await clearOrderAccess();
  return NextResponse.redirect(new URL("/comanda", req.url), 303);
}
