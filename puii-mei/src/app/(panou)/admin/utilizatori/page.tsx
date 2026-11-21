import type { Metadata } from "next";
import { headers } from "next/headers";
import { Container } from "@/components/ui/Container";
import { CopyLink } from "@/components/admin/CopyLink";
import { UserForm } from "@/components/admin/UserForm";
import { DemoAccounts } from "@/components/admin/DemoAccounts";
import type { User, UserStatus } from "@/lib/domain";
import { roleLabels } from "@/lib/roles";
import { formatDate } from "@/lib/format";
import { farmRepository } from "@/server/repositories/catalog";
import { setupLinkValid, userRepository } from "@/server/repositories/users";
import { getCurrentUser } from "@/server/session";
import { regenerateLink, toggleUserStatus } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Utilizatori", robots: { index: false, follow: false } };

const statusStyle: Record<UserStatus, string> = {
  invitat: "bg-grain-300/60 text-forest-900",
  activ: "bg-forest-100 text-forest-800",
  dezactivat: "bg-ink/5 text-muted",
};
const statusLabel: Record<UserStatus, string> = { invitat: "Invitat", activ: "Activ", dezactivat: "Dezactivat" };

function whatsapp(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0040/, "40").replace(/^0/, "40");
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

export default async function UsersPage() {
  const [users, farms, me, h] = await Promise.all([
    userRepository.list(),
    farmRepository.listAll(),
    getCurrentUser(),
    headers(),
  ]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "www.puiimei.ro";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  const farmName = new Map(farms.map((f) => [f.slug, f.name]));

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-semibold">Utilizatori</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Conturi pentru gospodari, investitori și administratori. Creezi contul, apoi trimiți persoanei linkul de activare;
        ea își alege parola. Curierii nu au cont: primesc acces temporar pe fiecare tură.
      </p>

      <div className="mt-6 max-w-3xl">
        <DemoAccounts />
      </div>

      <h2 className="mt-8 text-xl font-semibold">Cont nou</h2>
      <div className="mt-3">
        <UserForm farms={farms.map((f) => ({ slug: f.slug, name: `${f.name}, ${f.village}` }))} />
      </div>

      <h2 className="mt-10 text-xl font-semibold">Conturi ({users.length})</h2>
      <ul className="mt-3 space-y-3">
        {users.length === 0 && <li className="rounded-2xl bg-white p-5 text-muted ring-1 ring-forest-900/10">Niciun cont creat încă.</li>}
        {users.map((u) => (
          <UserRow key={u.id} u={u} origin={origin} farm={u.farmSlug ? farmName.get(u.farmSlug) : undefined} isMe={me?.id === u.id} />
        ))}
      </ul>
    </Container>
  );
}

function UserRow({ u, origin, farm, isMe }: { u: User; origin: string; farm?: string; isMe: boolean }) {
  const link = u.setupToken ? `${origin}/cont/activare/${u.setupToken}` : null;
  const linkValid = link && setupLinkValid(u);
  const wa =
    linkValid && u.phone
      ? whatsapp(u.phone, `Bună, ${u.name.split(" ")[0]}! Contul tău Puii mei e gata. Setează-ți parola aici: ${link}`)
      : null;
  return (
    <li className="rounded-3xl bg-white p-5 ring-1 ring-forest-900/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-forest-900">{u.name}</p>
          <p className="text-sm text-muted">
            {u.email}
            {u.phone ? ` · ${u.phone}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-semibold">{roleLabels[u.role]}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[u.status]}`}>{statusLabel[u.status]}</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        {farm ? `Gospodăria: ${farm} · ` : ""}Creat {formatDate(u.createdAt)}
        {u.lastLoginAt ? ` · ultima intrare ${formatDate(u.lastLoginAt)}` : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {linkValid ? (
          <>
            <span className="text-xs text-muted">
              Link de {u.status === "invitat" ? "activare" : "resetare a parolei"}, valabil până la {formatDate(u.setupExpiresAt!)}:
            </span>
            <CopyLink url={link!} />
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#25D366]/15 px-2.5 py-1 text-xs font-semibold text-forest-900 ring-1 ring-[#25D366]/40">
                Trimite pe WhatsApp
              </a>
            )}
          </>
        ) : (
          u.status !== "dezactivat" && (
            <form action={regenerateLink}>
              <input type="hidden" name="id" value={u.id} />
              <button className="rounded-lg px-2.5 py-1 text-xs font-semibold text-forest-800 ring-1 ring-forest-900/15 hover:bg-forest-50">
                {u.status === "invitat" ? "Link nou de activare" : "Link de resetare a parolei"}
              </button>
            </form>
          )
        )}
        {!isMe && (
          <form action={toggleUserStatus}>
            <input type="hidden" name="id" value={u.id} />
            <button className="rounded-lg px-2.5 py-1 text-xs font-semibold text-forest-800 ring-1 ring-forest-900/15 hover:bg-forest-50">
              {u.status === "dezactivat" ? "Reactivează" : "Dezactivează"}
            </button>
          </form>
        )}
      </div>
    </li>
  );
}
