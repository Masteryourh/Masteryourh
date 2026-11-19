"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { PartnerForm } from "./PartnerForm";
import { InvestorForm } from "./InvestorForm";

type Kind = "gospodarie" | "investitor";

const steps: Record<Kind, string[]> = {
  gospodarie: [
    "Trimiți formularul.",
    "Te sunăm ca să discutăm despre gospodărie.",
    "Venim în vizită și verificăm împreună spațiul.",
    "Semnăm parteneriatul și publicăm profilul gospodăriei.",
    "Primești primul lot, pe baza precomenzilor.",
  ],
  investitor: [
    "Trimiți formularul.",
    "Stabilim o primă discuție despre modelul Puii mei.",
    "Îți prezentăm cifrele și planul pentru zona care te interesează.",
    "Convenim împreună forma colaborării.",
  ],
};

export function PartnerChooser() {
  const [kind, setKind] = useState<Kind>("gospodarie");

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.slice(1);
      if (h === "gospodarie" || h === "investitor") {
        setKind(h);
        document.getElementById("aplica")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const choose = (k: Kind) => {
    setKind(k);
    history.replaceState(null, "", `#${k}`);
  };

  return (
    <div id="aplica" className="scroll-mt-24">
      <div role="tablist" aria-label="Tip de partener" className="inline-flex rounded-full bg-white p-1 ring-1 ring-forest-900/10">
        {(["gospodarie", "investitor"] as Kind[]).map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={kind === k}
            aria-controls="formular-partener"
            onClick={() => choose(k)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition sm:px-5",
              kind === k ? "bg-forest-800 text-white" : "text-forest-800 hover:bg-forest-50",
            )}
          >
            {k === "gospodarie" ? "Am o gospodărie" : "Vreau să investesc"}
          </button>
        ))}
      </div>

      <div id="formular-partener" role="tabpanel" className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <h2 className="text-3xl font-semibold">
            {kind === "gospodarie" ? "Cum devii gospodărie parteneră" : "Cum devii investitor partener"}
          </h2>
          <ol className="mt-6 space-y-4">
            {steps[kind].map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grain-300 text-sm font-semibold text-forest-900">
                  {i + 1}
                </span>
                <span className="pt-1 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 rounded-2xl bg-forest-50 p-4 text-sm leading-relaxed text-forest-800">
            {kind === "gospodarie"
              ? "Nu e nevoie să ai totul pregătit de la început. Dacă înregistrarea la DSV e în curs sau nu ai încă un adăpost potrivit, aplică oricum și discutăm ce e necesar."
              : "Informațiile de pe această pagină nu reprezintă o ofertă de investiție. Forma și condițiile colaborării se stabilesc individual, în urma discuțiilor."}
          </p>
        </div>
        {kind === "gospodarie" ? <PartnerForm key="g" /> : <InvestorForm key="i" />}
      </div>
    </div>
  );
}
