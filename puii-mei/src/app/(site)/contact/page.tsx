import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ContactForm } from "@/components/forms/ContactForm";
import { site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { contactSubjects } from "@/lib/validation/contact";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: "Scrie-ne pentru întrebări despre precomenzi, parteneriate cu gospodării sau colaborări. Puii mei – pui crescuți la comandă.",
  path: "/contact",
});

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const { subiect } = await searchParams;
  const defaultSubject = subiect === "partener" ? contactSubjects[1] : undefined;
  const items: { icon: IconName; label: string; value: string; href?: string }[] = [
    { icon: "phone", label: "Telefon", value: site.company.phone, href: `tel:${site.company.phone.replace(/\s/g, "")}` },
    { icon: "mail", label: "Email", value: site.company.email, href: `mailto:${site.company.email}` },
    { icon: "clipboard", label: "Program", value: site.company.schedule },
    { icon: "home", label: "Companie", value: site.company.legalName },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Hai să vorbim"
        intro="Întrebări despre precomenzi, vrei să devii gospodărie parteneră sau ai o idee de colaborare? Îți răspundem în cel mult o zi lucrătoare."
      />
      <Container className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <h2 className="text-2xl font-semibold">Datele companiei</h2>
          <ul className="mt-6 space-y-4">
            {items.map((i) => (
              <li key={i.label} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
                  <Icon name={i.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm text-muted">{i.label}</p>
                  {i.href ? (
                    <a href={i.href} className="font-semibold text-forest-900 hover:underline">{i.value}</a>
                  ) : (
                    <p className="font-semibold text-forest-900">{i.value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <dl className="mt-8 grid grid-cols-2 gap-4 rounded-2xl bg-cream-100 p-5 text-sm">
            <div><dt className="text-muted">CUI</dt><dd className="font-medium">{site.company.cui}</dd></div>
            <div><dt className="text-muted">Nr. Reg. Com.</dt><dd className="font-medium">{site.company.regCom}</dd></div>
          </dl>
        </div>
        <ContactForm defaultSubject={defaultSubject} />
      </Container>
    </>
  );
}
