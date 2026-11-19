import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ActivateForm } from "@/components/forms/AuthForms";
import { roleLabels } from "@/lib/roles";
import { setupLinkValid, userRepository } from "@/server/repositories/users";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Setează parola", robots: { index: false, follow: false } };

export default async function ActivatePage({ params }: PageProps<"/cont/activare/[token]">) {
  const { token } = await params;
  const user = await userRepository.bySetupToken(token);
  const valid = user && setupLinkValid(user);

  return (
    <Container className="flex max-w-md flex-col py-16 sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Contul meu</p>
      {valid ? (
        <>
          <h1 className="mt-3 text-3xl font-semibold">Bun venit, {user.name.split(" ")[0]}!</h1>
          <p className="mt-2 text-muted">
            Contul tău de <strong className="text-forest-900">{roleLabels[user.role].toLowerCase()}</strong> pentru{" "}
            <span className="font-medium text-forest-900">{user.email}</span> e pregătit. Alege o parolă ca să intri.
          </p>
          <div className="mt-8 rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
            <ActivateForm token={token} />
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-3 text-3xl font-semibold">Linkul nu mai este valid</h1>
          <p className="mt-2 text-muted">
            Linkurile de activare sunt valabile câteva zile și pot fi folosite o singură dată. Cere un link nou echipei
            Puii mei.
          </p>
        </>
      )}
    </Container>
  );
}
