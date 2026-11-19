import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-28 text-center">
      <p className="font-display text-7xl font-semibold text-grain-500">404</p>
      <h1 className="mt-4 text-3xl font-semibold">Pagina nu a fost găsită</h1>
      <p className="mt-3 max-w-md text-muted">Se pare că puiul a ieșit din curte. Verifică adresa sau întoarce-te la prima pagină.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/">Prima pagină</ButtonLink>
        <ButtonLink href="/trasabilitate" variant="secondary">Caută un lot</ButtonLink>
      </div>
    </Container>
  );
}
