"use client";

import { useState } from "react";

/** Copiază un text (IBAN, referința plății, linkul comenzii). */
export function CopyButton({ value, label = "Copiază", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copiază manual:", value);
        }
      }}
      className={
        className ??
        "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-forest-800 ring-1 ring-forest-900/15 hover:bg-forest-50"
      }
    >
      {copied ? "Copiat ✓" : label}
    </button>
  );
}
