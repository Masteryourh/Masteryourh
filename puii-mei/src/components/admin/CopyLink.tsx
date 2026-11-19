"use client";

import { useState } from "react";

export function CopyLink({ url, label = "Copiază linkul" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copiază linkul:", url);
        }
      }}
      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-forest-800 ring-1 ring-forest-900/15 hover:bg-forest-50"
    >
      {copied ? "Copiat ✓" : label}
    </button>
  );
}
