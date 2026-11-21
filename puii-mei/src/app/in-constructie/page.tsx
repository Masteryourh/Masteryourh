import type { Metadata } from "next";
import { LogoMark } from "@/components/layout/Logo";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "În construcție",
  description: "Puii mei – pui crescuți la comandă în gospodării din Bucovina. Lansăm în curând.",
  robots: { index: false, follow: false },
};

const tape = "repeating-linear-gradient(-45deg, #141414 0 14px, #f5c400 14px 28px)";

/** Pagina afișată când site-ul e ascuns complet (MAINTENANCE_MODE=1). */
export default function UnderConstructionPage() {
  return (
    <main id="continut" className="relative isolate flex min-h-[100svh] flex-1 items-center justify-center overflow-hidden px-4 py-16 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/poveste/hero.webp" alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover object-[55%_62%]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(28,58,87,0.55),rgba(28,58,87,0.25)_45%,rgba(20,40,22,0.6))]" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-3.5" style={{ background: tape }} />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-3.5" style={{ background: tape }} />

      <div className="w-full max-w-xl animate-fade-up text-center">
        <LogoMark className="mx-auto h-20 w-20 sm:h-24 sm:w-24" />
        <p className="mt-4 font-display text-5xl font-bold [text-shadow:0_4px_20px_rgba(28,70,120,0.4)]">Puii mei</p>
        <p className="mt-1 text-lg font-medium text-white/90">{site.slogan}</p>

        <span className="mt-10 inline-block rounded-md px-3 py-1 text-xs font-bold tracking-[0.18em] text-black uppercase" style={{ background: "#f5c400" }}>
          Site în construcție
        </span>
        <h1 className="mt-5 text-title text-white [text-shadow:0_4px_20px_rgba(0,0,0,0.3)]">Pregătim lansarea în Bucovina</h1>
        <p className="mx-auto mt-4 max-w-md text-lead text-white/90">
          Pui crescuți la comandă, fără grabă, în gospodării de la munte. Revino curând.
        </p>

        <div className="mx-auto mt-10 max-w-sm rounded-3xl bg-white/90 p-6 text-sm text-ink backdrop-blur">
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
