import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Afișează o fotografie din /public dacă fișierul există; altfel un
 * placeholder elegant care indică ce fotografie trebuie adăugată.
 * Astfel, fotografiile reale ale gospodăriilor pot fi adăugate pur și simplu
 * în `public/images/...`, fără modificări de cod.
 */
export function Photo({
  src,
  alt,
  className,
  priority,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  tone = "light",
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  tone?: "light" | "dark";
}) {
  const exists = existsSync(path.join(process.cwd(), "public", src));

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {exists ? (
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className={cn(
            "absolute inset-0 flex items-start",
            tone === "dark"
              ? "bg-gradient-to-br from-forest-700 via-forest-800 to-forest-900"
              : "bg-gradient-to-br from-cream-200 via-cream-300 to-grain-300",
          )}
        >
          <svg
            aria-hidden
            className={cn("absolute inset-0 h-full w-full", tone === "dark" ? "opacity-[0.12]" : "opacity-40")}
            viewBox="0 0 400 300"
            preserveAspectRatio="xMidYMax slice"
          >
            <path d="M0 210 C 80 170, 160 190, 240 165 S 360 150, 400 160 L400 300 L0 300Z" fill={tone === "dark" ? "#f8f2e4" : "#8fb39a"} />
            <path d="M0 245 C 100 215, 190 240, 280 215 S 380 205, 400 212 L400 300 L0 300Z" fill={tone === "dark" ? "#e8bd55" : "#3f6b4d"} opacity="0.6" />
          </svg>
          <span
            className={cn(
              "relative m-3 rounded-full px-3 py-1 text-[11px] font-medium",
              tone === "dark" ? "bg-white/10 text-cream-100" : "bg-white/70 text-forest-800",
            )}
          >
            Fotografie: {alt}
          </span>
        </div>
      )}
    </div>
  );
}
