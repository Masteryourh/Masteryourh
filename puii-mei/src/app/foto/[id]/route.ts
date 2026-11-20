import { NextResponse, type NextRequest } from "next/server";
import { courierAuthorized } from "@/server/courier-session";
import { canManageFarm } from "@/server/delivery";
import { parcelRepository, photoRepository, tourRepository } from "@/server/repositories/delivery";
import { getCurrentUser } from "@/server/session";

/**
 * Fotografiile din livrări. Acces: admin; gospodarul gospodăriei; curierul turei;
 * clientul pentru coletul lui (?c=<codul QR „Client”).
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/foto/[id]">) {
  const { id } = await ctx.params;
  const photo = await photoRepository.get(id);
  if (!photo) return new NextResponse("Nu există", { status: 404 });
  const [kind, ownerId] = photo.owner.split(":");
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

  return new NextResponse(Buffer.from(photo.data, "base64"), {
    headers: { "Content-Type": photo.mime, "Cache-Control": "private, max-age=3600" },
  });
}
