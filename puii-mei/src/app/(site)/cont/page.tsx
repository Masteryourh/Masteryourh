import { redirect } from "next/navigation";
import { roleHome } from "@/lib/roles";
import { getCurrentUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** /cont → dashboard-ul rolului, sau autentificare. */
export default async function AccountRedirect() {
  const user = await getCurrentUser();
  redirect(user ? roleHome[user.role] : "/cont/autentificare");
}
