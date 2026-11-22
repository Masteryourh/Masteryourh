"use client";

/** Tipărire / salvare ca PDF din browser. */
export function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      Tipărește sau salvează PDF
    </button>
  );
}
