"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

/** Comută între modul luminos și cel întunecat; alegerea se păstrează în browser. */
export function ThemeToggle({ className, label = false }: { className?: string; label?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tema e citită din DOM după hidratare
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("tema", next);
    } catch {
      /* browser fără localStorage: tema rămâne doar pe pagina curentă */
    }
    setTheme(next);
  }

  const dark = theme === "dark";
  const text = dark ? "Mod luminos" : "Mod întunecat";
  return (
    <button type="button" onClick={toggle} aria-label={text} title={text} className={cn("inline-flex items-center justify-center gap-2", className)}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        )}
      </svg>
      {label && <span>{text}</span>}
    </button>
  );
}

/** Rulează înainte de afișare: aplică tema salvată sau pe cea a sistemului (fără „clipire”). */
export const themeScript = `(function(){try{var t=localStorage.getItem('tema');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})();`;
