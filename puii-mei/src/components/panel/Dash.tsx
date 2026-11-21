import { cn } from "@/lib/cn";

/**
 * Piese de dashboard pentru panourile închise (gospodar, investitor): imagine aeriană
 * cu pini, carduri de sticlă, cadran de progres, bare și inel. Animate discret.
 */

export function Glass({ className, children, delay = 0 }: { className?: string; children: React.ReactNode; delay?: number }) {
  return (
    <div className={cn("dash-glass dash-rise p-4 sm:p-5", className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function GlassTitle({ title, hint, right }: { title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-base font-medium text-[var(--pd-text)]">{title}</p>
        {hint && <p className="text-xs text-[var(--pd-muted)]">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function Pill({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "green" | "muted" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tone === "gold" && "bg-[rgba(230,192,104,0.16)] text-[var(--pd-gold)]",
        tone === "green" && "bg-[rgba(143,194,122,0.16)] text-[var(--pd-green)]",
        tone === "muted" && "bg-white/10 text-[var(--pd-muted)]",
      )}
    >
      {children}
    </span>
  );
}

/** Cifră mare, subțire, cu unitate și eticheta. */
export function Metric({ label, value, unit, pill, delay }: { label: string; value: string; unit?: string; pill?: React.ReactNode; delay?: number }) {
  return (
    <Glass delay={delay} className="flex flex-col justify-between gap-3">
      <p className="text-sm text-[var(--pd-muted)]">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-light tracking-tight text-[var(--pd-text)] tabular-nums sm:text-4xl">
          {value}
          {unit && <span className="ml-1 text-base text-[var(--pd-muted)]">{unit}</span>}
        </p>
        {pill}
      </div>
    </Glass>
  );
}

export interface MapPin {
  x: number;
  y: number;
  label: string;
  note?: string;
  active?: boolean;
}

/** Imaginea aeriană a gospodăriei, cu pini (poziții în procente). */
export function AerialMap({ src, pins, className, children }: { src: string; pins: MapPin[]; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("dash-rise relative isolate overflow-hidden rounded-[1.25rem] border border-white/10", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Gospodăria văzută de sus" className="dash-aerial absolute inset-0 -z-10 h-full w-full object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,20,14,0.35),rgba(11,20,14,0.05)_40%,rgba(11,20,14,0.7))]" />
      {pins.map((p, i) => (
        <div key={i} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          <div
            className={cn(
              "mb-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs whitespace-nowrap shadow-lg backdrop-blur-md",
              p.active ? "bg-[var(--pd-gold)] font-semibold text-[#1b2a1d]" : "bg-black/45 text-white",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", p.active ? "bg-[#1b2a1d]" : "bg-[var(--pd-green)]")} />
            {p.label}
            {p.note && <span className={cn("hidden sm:inline", p.active ? "opacity-70" : "text-white/60")}>· {p.note}</span>}
          </div>
          <span className="mx-auto block h-4 w-px bg-white/60" />
          <span className={cn("dash-pin relative mx-auto block h-3 w-3 rounded-full border-2 border-white", p.active ? "bg-[var(--pd-gold)] text-[var(--pd-gold)]" : "bg-white text-white")} />
        </div>
      ))}
      {children}
    </div>
  );
}

/** Cadran semicircular (0–100%). */
export function Gauge({ percent, label, sub }: { percent: number; label: string; sub?: string }) {
  const p = Math.max(0, Math.min(100, percent));
  const r = 52;
  const len = Math.PI * r;
  return (
    <div className="relative mx-auto w-full max-w-[220px]">
      <svg viewBox="0 0 130 74" className="w-full" aria-hidden>
        {Array.from({ length: 29 }, (_, i) => {
          const a = Math.PI * (1 - i / 28);
          return (
            <line key={i} x1={65 + 60 * Math.cos(a)} y1={68 - 60 * Math.sin(a)} x2={65 + 64 * Math.cos(a)} y2={68 - 64 * Math.sin(a)} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          );
        })}
        <path d={`M13 68A${r} ${r} 0 0 1 117 68`} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="9" strokeLinecap="round" />
        <path
          d={`M13 68A${r} ${r} 0 0 1 117 68`}
          fill="none"
          stroke="var(--pd-gold)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - p / 100)}
          className="dash-arc"
          style={{ ["--dash-len" as string]: len }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-3xl font-light text-[var(--pd-text)] tabular-nums">{label}</p>
        {sub && <p className="text-[10px] tracking-[0.2em] text-[var(--pd-muted)] uppercase">{sub}</p>}
      </div>
    </div>
  );
}

/** Bare verticale; cea marcată „highlight” e aurie. */
export function Bars({ data, max, unit = "" }: { data: { label: string; value: number; highlight?: boolean; title?: string }[]; max?: number; unit?: string }) {
  const top = Math.max(1, max ?? Math.max(...data.map((d) => d.value), 1));
  return (
    <div className="flex h-40 items-end gap-2 sm:gap-3">
      {data.map((d, i) => (
        <div key={d.label + i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={d.title ?? `${d.value}${unit}`}>
          <div className="relative flex h-full w-full max-w-7 items-end overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn("dash-bar w-full rounded-full", d.highlight ? "bg-[var(--pd-gold)]" : "bg-gradient-to-t from-white/40 to-white/90")}
              style={{ height: `${Math.max(4, (d.value / top) * 100)}%`, animationDelay: `${150 + i * 70}ms` }}
            />
          </div>
          <span className="w-full truncate text-center text-[10px] text-[var(--pd-muted)]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const RING_COLORS = ["#e6c068", "#8fc27a", "#5f95c7", "#d98c5f", "#b7a6e0", "#7fd0c4", "#e0e0e0"];

/** Inel cu segmente (ex. cheltuieli pe categorii) + legendă. */
export function Ring({ data, center, sub }: { data: { label: string; value: number }[]; center: string; sub?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 40;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          {total > 0 &&
            data.map((d, i) => {
              const part = (d.value / total) * c;
              const el = (
                <circle
                  key={d.label}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={RING_COLORS[i % RING_COLORS.length]}
                  strokeWidth="10"
                  strokeDasharray={`${Math.max(0, part - 1.5)} ${c}`}
                  strokeDashoffset={-acc}
                  className="dash-arc"
                  style={{ ["--dash-len" as string]: c, animationDelay: `${i * 120}ms` }}
                />
              );
              acc += part;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-light text-[var(--pd-text)]">{center}</span>
          {sub && <span className="text-[9px] tracking-[0.18em] text-[var(--pd-muted)] uppercase">{sub}</span>}
        </div>
      </div>
      <ul className="min-w-0 space-y-1.5 text-sm">
        {data.slice(0, 5).map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: RING_COLORS[i % RING_COLORS.length] }} />
            <span className="truncate text-[var(--pd-muted)]">{d.label}</span>
            <span className="ml-auto pl-2 text-[var(--pd-text)] tabular-nums">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
        {!data.length && <li className="text-[var(--pd-muted)]">Încă nimic înregistrat.</li>}
      </ul>
    </div>
  );
}

/** Pozițiile pinilor pe imaginea aeriană a gospodăriei (procente). */
export const FARM_SPOTS = [
  { x: 42, y: 66 }, // ocolul cu găini
  { x: 26, y: 38 }, // adăpostul mic
  { x: 72, y: 30 }, // lângă drum
  { x: 78, y: 70 }, // pajiștea din dreapta
];
