/**
 * Branch Lifecycle Manager pentru Neon Free (decizia fondatorului, 26.11.2026, #62): maximum 8 branch-uri simultane pe
 * proiect (2 rezervă din limita de 10), branch-uri temporare cu TTL 24–72 h, protecția branch-urilor importante.
 * Logica de decizie e PURĂ și testată (neon-lifecycle.test.ts); scriptul scripts/neon/branch-lifecycle.ts doar citește
 * inventarul și, numai cu --apply, execută acțiunile permise. Implicit: dry-run.
 *
 * Reguli (fail-safe): orice branch care NU e explicit temporar e protejat și nu se atinge — inclusiv cele necunoscute.
 */
export type NeonBranch = {
  id: string;
  name: string;
  default: boolean;
  protected: boolean;
  created_at: string;
  expires_at?: string | null;
  parent_id?: string | null;
};

export const LIMITS = { planMax: 10, target: 8, minAgeHours: 24, maxTtlHours: 72 } as const;

/** Nume protejate explicit (nu se ating niciodată, chiar dacă par temporare). */
const PROTECTED_NAMES = new Set(["main", "production", "prod", "staging", "development", "dev"]);
/** Doar aceste prefixe pot fi temporare (allowlist explicită). `preview/` = integrarea Vercel (un branch pe git branch). */
const TEMP_PREFIXES = ["preview/", "tmp/", "ci/"] as const;

export type Decision =
  | { action: "keep"; reason: string }
  | { action: "set-ttl"; expiresAt: string; reason: string }
  | { action: "delete"; reason: string };

export type BranchPlan = { branch: NeonBranch; kind: "protejat" | "temporar"; decision: Decision };

export type Context = {
  now: Date;
  /**
   * Branch-urile git cu PR DESCHIS (ownership PR: mandatul din 26.11). Un preview al cărui PR s-a închis / unit se curăță;
   * cât PR-ul e deschis, branch-ul de bază primește TTL de la momentul rulării. Dacă e null, nu se șterge nimic.
   */
  activeGitBranches: Set<string> | null;
};

const hours = (from: string, to: Date) => (to.getTime() - Date.parse(from)) / 3_600_000;

export function classify(b: NeonBranch, all: NeonBranch[]): { kind: "protejat" | "temporar"; why: string } {
  if (b.default) return { kind: "protejat", why: "branch-ul implicit al proiectului" };
  if (b.protected) return { kind: "protejat", why: "marcat protejat în Neon" };
  if (PROTECTED_NAMES.has(b.name)) return { kind: "protejat", why: `nume protejat (${b.name})` };
  if (all.some((c) => c.parent_id === b.id)) return { kind: "protejat", why: "are branch-uri copil (dependență)" };
  if (!TEMP_PREFIXES.some((p) => b.name.startsWith(p))) return { kind: "protejat", why: "nu e în allowlist-ul temporar (necunoscut ⇒ nu se atinge)" };
  return { kind: "temporar", why: "prefix temporar" };
}

export function decide(b: NeonBranch, all: NeonBranch[], ctx: Context): BranchPlan {
  const c = classify(b, all);
  if (c.kind === "protejat") return { branch: b, kind: c.kind, decision: { action: "keep", reason: c.why } };
  const age = hours(b.created_at, ctx.now);
  const git = b.name.startsWith("preview/") ? b.name.slice("preview/".length) : null;
  // Ștergere: doar branch-urile preview al căror branch git nu mai e activ, după vârsta minimă (nu în timpul unui test).
  if (git && ctx.activeGitBranches && !ctx.activeGitBranches.has(git) && age >= LIMITS.minAgeHours) {
    return { branch: b, kind: c.kind, decision: { action: "delete", reason: `PR-ul pentru „${git}” nu mai e deschis (unit / închis), vârstă ${Math.floor(age)} h` } };
  }
  // TTL nativ Neon (expires_at, max 30 de zile). Preview cu PR deschis: 72 h de acum (un deploy nou îl recreează dacă
  // expiră); alte temporare (tmp/, ci/): 72 h de la creare, dar cel puțin o oră de acum.
  if (!b.expires_at) {
    const openPr = Boolean(git && ctx.activeGitBranches?.has(git));
    const target = openPr
      ? ctx.now.getTime() + LIMITS.maxTtlHours * 3_600_000
      : Math.max(Date.parse(b.created_at) + LIMITS.maxTtlHours * 3_600_000, ctx.now.getTime() + 3_600_000);
    const iso = new Date(target).toISOString().replace(/\.\d{3}Z$/, "Z");
    return { branch: b, kind: c.kind, decision: { action: "set-ttl", expiresAt: iso, reason: openPr ? "PR deschis: TTL 72 h de acum" : "temporar fără expirare: TTL 72 h de la creare" } };
  }
  return { branch: b, kind: c.kind, decision: { action: "keep", reason: `temporar, expiră la ${b.expires_at}` } };
}

export type Plan = {
  items: BranchPlan[];
  count: number;
  afterPlan: number;
  overTarget: boolean;
  warnings: string[];
};

export function plan(branches: NeonBranch[], ctx: Context): Plan {
  const items = branches.map((b) => decide(b, branches, ctx));
  const deletions = items.filter((i) => i.decision.action === "delete").length;
  const afterPlan = branches.length - deletions;
  const warnings: string[] = [];
  if (ctx.activeGitBranches === null) warnings.push("lista branch-urilor git nu e disponibilă: nicio ștergere planificată (fail-safe)");
  if (afterPlan > LIMITS.target) {
    warnings.push(`după plan rămân ${afterPlan} branch-uri, peste ținta de ${LIMITS.target} (limita planului: ${LIMITS.planMax}); cele protejate / necunoscute se curăță doar manual, cu aprobare`);
  }
  return { items, count: branches.length, afterPlan, overTarget: afterPlan > LIMITS.target, warnings };
}

/** Înainte de execuție: branch-ul e tot cel din plan (nu s-a schimbat între timp)? Altfel se sare (concurență). */
export function stillSame(planned: NeonBranch, current: NeonBranch | null): boolean {
  return Boolean(current && current.id === planned.id && current.name === planned.name && !current.default && !current.protected);
}
