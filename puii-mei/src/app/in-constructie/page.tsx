import type { Metadata } from "next";
import { LogoMark } from "@/components/layout/Logo";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "În construcție",
  description: "Puii mei – pui crescuți la comandă în gospodării locale. Lansăm în curând.",
  robots: { index: false, follow: false },
};

export default function UnderConstructionPage() {
  return (
    <main id="continut" className="relative flex flex-1 items-center justify-center overflow-hidden bg-cream-100 px-4 py-16">
      <svg aria-hidden viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-40 w-full">
        <path d="M0 70 C 80 40, 160 60, 240 45 S 360 35, 400 40 L400 120 L0 120Z" fill="#d5e4d8" />
        <path d="M0 95 C 100 70, 190 92, 280 72 S 380 66, 400 70 L400 120 L0 120Z" fill="#8fb39a" opacity="0.5" />
      </svg>
      <div className="relative w-full max-w-xl animate-fade-up text-center">
        <LogoMark className="mx-auto h-20 w-[116px] sm:h-24 sm:w-[140px]" />
        <p className="mt-4 font-display text-4xl font-semibold text-forest-900">
          Puii <span className="text-grain-600">mei</span>
        </p>
        <p className="mt-1 text-sm font-medium text-muted">{site.slogan}</p>

        <span className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-forest-800 ring-1 ring-forest-900/10">
          <span className="h-2 w-2 animate-pulse rounded-full bg-grain-500" aria-hidden />
          Site în construcție
        </span>
        <h1 className="mt-5 text-3xl font-semibold sm:text-4xl">Pregătim lansarea în Bucovina</h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted">
          Pui de carne crescuți la comandă, în gospodării locale partenere. Revino curând.
        </p>

        <div className="mx-auto mt-10 max-w-sm rounded-3xl bg-white/90 p-6 text-sm ring-1 ring-forest-900/8">
          <p className="font-semibold text-forest-900">Ești gospodar, investitor sau vrei să comanzi?</p>
          <p className="mt-1 text-muted">Scrie-ne și te contactăm noi.</p>
          <a href={`mailto:${site.company.email}`} className="mt-3 inline-block font-semibold text-forest-700 underline underline-offset-4">
            {site.company.email}
          </a>
        </div>
      </div>
    </main>
  );
}
