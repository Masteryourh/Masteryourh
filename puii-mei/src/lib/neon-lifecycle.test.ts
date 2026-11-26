import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, LIMITS, plan, stillSame, type NeonBranch } from "./neon-lifecycle.ts";

const now = new Date("2026-11-26T12:00:00Z");
const ago = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const br = (name: string, extra: Partial<NeonBranch> = {}): NeonBranch => ({ id: `br-${name}`, name, default: false, protected: false, created_at: ago(48), ...extra });

const MAIN = br("main", { default: true });

test("protecție: implicit, protejat, nume rezervat, părinte de alte branch-uri, orice nume necunoscut", () => {
  const parent = br("preview/feature-x");
  const child = br("tmp/copil", { parent_id: parent.id });
  const all = [MAIN, br("staging"), br("lucru-manual"), br("preview/p", { protected: true }), parent, child];
  assert.equal(classify(MAIN, all).kind, "protejat");
  assert.equal(classify(all[1], all).kind, "protejat");
  assert.equal(classify(all[2], all).kind, "protejat", "necunoscut ⇒ nu se atinge");
  assert.equal(classify(all[3], all).kind, "protejat");
  assert.equal(classify(parent, all).kind, "protejat", "are copil");
  assert.equal(classify(child, all).kind, "temporar");
});

test("ștergere doar pentru preview al cărui PR nu mai e deschis și are minimum 24 h", () => {
  const branches = [MAIN, br("preview/vechi"), br("preview/activ"), br("preview/nou", { created_at: ago(2) })];
  const p = plan(branches, { now, activeGitBranches: new Set(["activ"]) });
  const act = Object.fromEntries(p.items.map((i) => [i.branch.name, i.decision.action]));
  assert.equal(act["main"], "keep");
  assert.equal(act["preview/vechi"], "delete");
  assert.equal(act["preview/activ"], "set-ttl");
  assert.equal(act["preview/nou"], "set-ttl", "sub 24 h nu se șterge, chiar dacă PR-ul nu mai e deschis");
  const activ = p.items.find((i) => i.branch.name === "preview/activ")!.decision;
  assert.deepEqual(activ, { action: "set-ttl", expiresAt: "2026-11-29T12:00:00Z", reason: "PR deschis: TTL 72 h de acum" }, "PR deschis: TTL de la rulare, nu de la creare");
});

test("fail-safe: fără lista branch-urilor git nu se șterge nimic", () => {
  const p = plan([MAIN, br("preview/vechi")], { now, activeGitBranches: null });
  assert.ok(p.items.every((i) => i.decision.action !== "delete"));
  assert.ok(p.warnings.some((w) => w.includes("fail-safe")));
});

test("TTL: maximum 72 h de la creare, dar cel puțin o oră de acum; cele cu expirare existentă se păstrează", () => {
  const p = plan([br("tmp/a", { created_at: ago(10) }), br("tmp/b", { created_at: ago(100) }), br("tmp/c", { expires_at: "2026-11-27T00:00:00Z" })], { now, activeGitBranches: new Set() });
  const d = Object.fromEntries(p.items.map((i) => [i.branch.name, i.decision]));
  assert.deepEqual(d["tmp/a"], { action: "set-ttl", expiresAt: "2026-11-29T02:00:00Z", reason: "temporar fără expirare: TTL 72 h de la creare" });
  assert.equal((d["tmp/b"] as { expiresAt: string }).expiresAt, "2026-11-26T13:00:00Z");
  assert.equal(d["tmp/c"].action, "keep");
});

test("limita: peste ținta de 8 după plan ⇒ avertisment; branch-urile protejate nu sunt șterse ca să intre în limită", () => {
  const many = [MAIN, ...Array.from({ length: 9 }, (_, i) => br(`manual-${i}`))];
  const p = plan(many, { now, activeGitBranches: new Set() });
  assert.equal(p.count, 10);
  assert.equal(p.afterPlan, 10);
  assert.ok(p.overTarget);
  assert.ok(p.items.every((i) => i.decision.action === "keep"));
  assert.equal(LIMITS.target, 8);
});

test("concurență: înainte de execuție branch-ul trebuie să fie tot cel din plan", () => {
  const b = br("preview/x");
  assert.ok(stillSame(b, { ...b }));
  assert.equal(stillSame(b, null), false, "deja șters de alt rulaj ⇒ se sare");
  assert.equal(stillSame(b, { ...b, protected: true }), false, "protejat între timp ⇒ se sare");
  assert.equal(stillSame(b, { ...b, default: true }), false);
});
