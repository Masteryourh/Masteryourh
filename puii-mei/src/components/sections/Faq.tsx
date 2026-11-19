import { faq } from "@/data/faq";
import { JsonLd } from "@/lib/seo";

export function Faq() {
  return (
    <div className="divide-y divide-forest-900/10 rounded-3xl border border-forest-900/8 bg-white">
      {faq.map((item) => (
        <details key={item.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-forest-900">
            {item.q}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700 transition group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          <p className="mt-3 leading-relaxed text-muted">{item.a}</p>
        </details>
      ))}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
    </div>
  );
}
