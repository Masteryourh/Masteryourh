/**
 * „Under construction live”: site-ul rămâne public, dar e încadrat de o bandă de
 * construcție (negru-galben) și are peste el un text uriaș, aproape transparent.
 * Nu blochează nimic (pointer-events: none). Se scoate cu UNDER_CONSTRUCTION=0 în Vercel.
 */
export function constructionFrameEnabled() {
  return process.env.UNDER_CONSTRUCTION !== "0";
}

const tape = "repeating-linear-gradient(-45deg, #141414 0 14px, #f5c400 14px 28px)";

export function ConstructionFrame() {
  if (!constructionFrameEnabled()) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] print:hidden">
      {/* Banda pe cele patru laturi */}
      <div className="absolute inset-x-0 top-0 h-2.5 sm:h-3.5" style={{ background: tape }} />
      <div className="absolute inset-x-0 bottom-0 h-2.5 sm:h-3.5" style={{ background: tape }} />
      <div className="absolute inset-y-0 left-0 w-2.5 sm:w-3.5" style={{ background: tape }} />
      <div className="absolute inset-y-0 right-0 w-2.5 sm:w-3.5" style={{ background: tape }} />

      {/* Textul uriaș, aproape transparent */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <p className="-rotate-[18deg] text-center font-display text-[clamp(3.5rem,13vw,13rem)] leading-[0.9] font-bold tracking-tight whitespace-nowrap text-black/[0.045] [-webkit-text-stroke:2px_rgba(20,20,20,0.07)]">
          UNDER
          <br />
          CONSTRUCTION
        </p>
      </div>

      {/* Eticheta din colț */}
      <p
        className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-md px-3 py-1 text-[11px] font-bold tracking-[0.18em] whitespace-nowrap text-black uppercase shadow-lg sm:bottom-7"
        style={{ background: "#f5c400" }}
      >
        Site în construcție · lansăm curând
      </p>
    </div>
  );
}
