import { NextResponse, type NextRequest } from "next/server";
import { canViewDocument } from "@/server/documents-access";
import { documentRepository, fileRepository } from "@/server/repositories/documents";
import { getCurrentUser } from "@/server/session";

/** Descărcarea documentelor, doar pentru cei îndreptățiți. `?vezi=1` îl deschide în browser. */
export async function GET(req: NextRequest, ctx: RouteContext<"/fisiere/[id]">) {
  const { id } = await ctx.params;
  const doc = await documentRepository.get(id);
  if (!doc) return new NextResponse("Nu există", { status: 404 });
  if (!(await canViewDocument(await getCurrentUser(), doc))) return new NextResponse("Neautorizat", { status: 401 });
  const file = await fileRepository.get(doc.fileId);
  if (!file) return new NextResponse("Fișierul lipsește", { status: 404 });
  const inline = req.nextUrl.searchParams.get("vezi") === "1";
  return new NextResponse(Buffer.from(file.data, "base64"), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Document-SHA256": file.sha256,
    },
  });
}
