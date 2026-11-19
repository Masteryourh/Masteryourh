import { NextResponse } from "next/server";
import { confirmationRepository } from "@/server/repositories/confirmations";
import { requireAdmin } from "@/server/auth";

/** Fotografiile coletului (doar pentru admin; protejat și de proxy). */
export async function GET(_req: Request, ctx: RouteContext<"/admin/foto/[id]">) {
  try {
    await requireAdmin();
  } catch {
    return new NextResponse("Neautorizat", { status: 401 });
  }
  const { id } = await ctx.params;
  const photo = await confirmationRepository.photo(id);
  if (!photo) return new NextResponse("Nu există", { status: 404 });
  return new NextResponse(Buffer.from(photo.data, "base64"), {
    headers: { "Content-Type": photo.mime, "Cache-Control": "private, max-age=3600" },
  });
}
