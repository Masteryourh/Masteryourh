import { NextResponse, type NextRequest } from "next/server";
import type { StoredPhoto } from "@/lib/domain";
import { courierAuthorized } from "@/server/courier-session";
import { canManageFarm } from "@/server/delivery";
import { parcelRepository, photoRepository, tourRepository } from "@/server/repositories/delivery";
import { getCurrentUser } from "@/server/session";
import { lotRepository } from "@/server/repositories/catalog";
import { preorderRepository } from "@/server/repositories/preorders";

/**
 * Fotografiile din livrări. Acces: admin; gospodarul gospodăriei; curierul turei;
 * clientul pentru coletul lui (?c=<codul QR „Client”).
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/foto/[id]">) {
  const { id } = await ctx.params;
  const photo = await photoRepository.get(id);
  if (!photo) return new NextResponse("Nu există", { status: 404 });
  const [kind, ownerId] = photo.owner.split(":");
  if (kind === "lot") {
    // Pozele din jurnalul de creștere: admin, gospodarul lotului, clienții cu comandă pe lot (?o=<cod comandă>).
    const lot = await lotRepository.byCode(ownerId, { all: true });
    const viewer = await getCurrentUser();
    const order = req.nextUrl.searchParams.get("o");
    const okLot =
      (viewer && lot && canManageFarm(viewer, lot.farmSlug)) ||
      (order && lot && (await preorderRepository.byTrackingToken(order))?.lotCode === lot.code);
    if (!okLot) return new NextResponse("Neautorizat", { status: 401 });
    return serve(photo);
  }
  const parcel = kind === "parcel" ? await parcelRepository.byId(ownerId) : null;
  const tour = kind === "tour" ? await tourRepository.byId(ownerId) : parcel?.tourId ? await tourRepository.byId(parcel.tourId) : null;
  const farmSlug = parcel?.farmSlug ?? tour?.farmSlug;

  const user = await getCurrentUser();
  const clientToken = req.nextUrl.searchParams.get("c");
  const allowed =
    (user && farmSlug && canManageFarm(user, farmSlug)) ||
    (parcel && clientToken && clientToken === parcel.clientToken) ||
    (tour && (await courierAuthorized(tour)));
  if (!allowed) return new NextResponse("Neautorizat", { status: 401 });

  return serve(photo);
}

async function serve(photo: StoredPhoto) {
  const body = await photoRepository.content(photo);
  if (!body) return new NextResponse("Fotografia nu poate fi citită", { status: 502 });
  return new NextResponse(new Uint8Array(body), {
    headers: { "Content-Type": photo.mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
