/**
 * Branch Lifecycle Manager (Neon Free) — implicit DRY-RUN: inventar + plan, fără nicio modificare.
 *
 *   node --experimental-strip-types scripts/neon/branch-lifecycle.ts            # inventar + plan (citire)
 *   node --experimental-strip-types scripts/neon/branch-lifecycle.ts --apply    # execută DOAR set-ttl / delete planificate
 *   opțional: --project <id>
 *
 * Autentificare: NEON_API_KEY (sau antetul injectat de proxy-ul mediului cloud). Cheia nu se afișează și nu se scrie
 * nicăieri. PR-urile deschise: `gh api` (dacă există) — altfel nicio ștergere (fail-safe).
 * Logica: src/lib/neon-lifecycle.ts (testată).
 */
import { execFileSync } from "node:child_process";
import { plan, stillSame, type NeonBranch } from "../../src/lib/neon-lifecycle.ts";

const API = "https://console.neon.tech/api/v2";
const apply = process.argv.includes("--apply");
const onlyProject = process.argv.includes("--project") ? process.argv[process.argv.indexOf("--project") + 1] : null;
const key = process.env.NEON_API_KEY ?? "injectat-de-proxy";

async function neon<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${key}`, Accept: "application/json", "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (!res.ok) throw Object.assign(new Error(`Neon API ${init.method ?? "GET"} ${path}: ${res.status}`), { status: res.status });
  return (await res.json()) as T;
}

function activeGitBranches(): Set<string> | null {
  try {
    // Ownership PR: doar branch-urile cu PR DESCHIS țin în viață branch-ul de bază preview/<git>.
    const out = execFileSync("gh", ["api", "--paginate", "repos/Masteryourh/Masteryourh/pulls?state=open&per_page=100", "--jq", ".[].head.ref"], { encoding: "utf8" });
    return new Set(out.split("\n").filter(Boolean));
  } catch {
    return null;
  }
}

// O cheie personală dintr-o organizație cere org_id: se parcurg organizațiile utilizatorului.
const orgs = (await neon<{ organizations: { id: string; name: string }[] }>("/users/me/organizations")).organizations;
const projects: { id: string; name: string; region_id: string; org: string }[] = [];
for (const o of orgs) {
  for (const p of (await neon<{ projects: { id: string; name: string; region_id: string }[] }>(`/projects?org_id=${encodeURIComponent(o.id)}&limit=100`)).projects) {
    if (!onlyProject || p.id === onlyProject) projects.push({ ...p, org: o.name });
  }
}
const git = activeGitBranches();
const now = new Date();
console.log(`${apply ? "EXECUȚIE (--apply)" : "DRY-RUN (nicio modificare)"} · ${projects.length} proiect(e) · PR-uri deschise: ${git ? git.size : "indisponibile ⇒ fără ștergeri"}\n`);

for (const p of projects) {
  const branches = (await neon<{ branches: NeonBranch[] }>(`/projects/${p.id}/branches`)).branches;
  const pl = plan(branches, { now, activeGitBranches: git });
  console.log(`## ${p.name} (${p.id}, ${p.region_id}, organizația „${p.org}”) — ${pl.count} branch-uri, după plan ${pl.afterPlan} (țintă 8, limită 10)`);
  console.log("| Branch | Creat | Expiră | Tip | Acțiune | Motiv |\n|---|---|---|---|---|---|");
  for (const i of pl.items) {
    const d = i.decision;
    console.log(`| ${i.branch.name} | ${i.branch.created_at.slice(0, 16)} | ${i.branch.expires_at ?? "—"} | ${i.kind} | ${d.action}${d.action === "set-ttl" ? ` → ${d.expiresAt}` : ""} | ${d.reason} |`);
  }
  for (const w of pl.warnings) console.log(`> ${w}`);
  if (!apply) {
    console.log("");
    continue;
  }
  for (const i of pl.items) {
    if (i.decision.action === "keep") continue;
    // Concurență: branch-ul se recitește chiar înainte de acțiune; dacă s-a schimbat sau a dispărut, se sare.
    let current: NeonBranch | null = null;
    try {
      current = (await neon<{ branch: NeonBranch }>(`/projects/${p.id}/branches/${i.branch.id}`)).branch;
    } catch (e) {
      if ((e as { status?: number }).status !== 404) throw e;
    }
    if (!stillSame(i.branch, current)) {
      console.log(`  sărit: ${i.branch.name} (schimbat sau deja șters)`);
      continue;
    }
    if (i.decision.action === "set-ttl") {
      await neon(`/projects/${p.id}/branches/${i.branch.id}`, { method: "PATCH", body: JSON.stringify({ branch: { expires_at: i.decision.expiresAt } }) });
      console.log(`  TTL setat: ${i.branch.name} → ${i.decision.expiresAt}`);
    } else {
      await neon(`/projects/${p.id}/branches/${i.branch.id}`, { method: "DELETE" });
      console.log(`  șters: ${i.branch.name}`);
    }
  }
  console.log("");
}
