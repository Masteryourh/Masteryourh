# Review independent Claude: capitolele ChatGPT 12–20 (PR #50)

Data: 28.11.2026. Mandat: #62, 28.11 („review independent 12–16 și 17–20, toate publicate PR50”).

**Sursa.** Branch-ul `docs/chatgpt-technical-architecture-v1`, commit `fc14abd`, fișierele `CHATGPT-12` … `CHATGPT-20`. Nu am modificat fișierele `CHATGPT-*`.

**Baza de cod confruntată.** `main`, la commit-ul `e8b229c` (după #94 și #95).

**Etichete:**
- **CONFIRMAT-COD**: verificat în cod, cu fișierul indicat.
- **STATIC**: deducție din text, fără execuție.
- **EXECUTAT**: rulat de mine (local, PG16).

## 0. Verdict pe scurt

Capitolele 12–20 sunt **consecvente între ele și cu 01–11**. Principiile corecte apar peste tot:
- default deny;
- intersecția scope-urilor;
- propunere → aprobare legată de hash → execuție idempotentă;
- outbox după commit;
- „unknown” în loc de valori inventate;
- biologic înregistrat întotdeauna, economic versionat.

Nu am găsit contradicții de principiu. Problemele reale sunt de trei feluri:

1. **Distanța față de as-built nu e numită**: valori în lei cu zecimale, coduri umane ca identificatori, DDL la runtime cu rolul owner, „azi” calculat în UTC.
2. **Câteva cerințe se ciocnesc cu mandatele operaționale curente**: offline vs PWA fără service worker, „no region commitment” vs fra1 / eu-central-1 deja ales.
3. **Lipsesc criteriile de măsurare** pentru afirmațiile de performanță și pentru fixture-urile de test.

| Severitate | Câte | Unde |
|---|---|---|
| P0 (blochează G1) | 2 | 17-F3 (DDL la runtime cu owner), 17-F1 (pipeline-ul de preview e rupt) |
| P1 | 9 | 13-B1, 13-B2, 14-C2, 15-D2, 16-E1, 16-E4, 12-A2, 12-A5, 18-G3 |
| P2 | 6 | 13-B5, 14-C1, 16-E3, 17-F4, 19-X1, 20-H3 |

## 1. Capitolul 12, AI Agent Ecosystem

Puncte tari: catalogul de 9 agenți cu ieșiri **doar ca propuneri**, clasele R0–R5 cu R5 interzis, aprobarea legată de payload hash, versiune de politică și versiuni de resurse, plus testele AI-T01…T28 (bine țintite: injection, self-approval, kill switch, handoff fără lărgire de scope).

- **12-A1 (informativ, CONFIRMAT-COD).** Nu există cod AI în as-built: nu există `ai.*`, rute `/api/v1/ai` sau provider. Capitolul o spune corect („target contracts, not verified existing AI implementation”).
- **12-A2 (P1, STATIC).** **Mecanismul de distribuție a sarcinilor** decis de fondator (gospodar → manager local = comună → manager zonal = câteva comune → admin; justificare de la gospodar care ajunge ca notificare la managerul local; zonalul vede justificările și rezolvările; adminul vede tot) apare doar implicit, ca „Administrative agent” + „territory”.
  - Propun ca **distribuția și escaladarea să fie deterministe**: reguli versionate, scope teritorial, termene. Agentul doar redactează.
  - Exemplu as-built pe aceeași linie:
    - `farmerToday` (#95) și rezumatul de dimineață (#98) sunt **fără AI**: funcții pure cu deduplicare;
    - sunt exact „Phase A deterministic reports” din 12.10.
  - Recomand ca 12.2 să numească explicit „Task Distribution (Bibliotecarul)” ca serviciu determinist, nu ca agent LLM. DEC-009 (autoritate / SLA) rămâne deschis.
- **12-A3 (P2, STATIC).** `ai.runs.cost_minor` presupune unități minore; as-built folosește lei cu zecimale (vezi 13-B1). E de aliniat odată cu migrarea monedei.
- **12-A4 (informativ).** „No raw chain-of-thought storage” + loguri cu PII minim: corect. De adăugat retenția concretă a `ai.tool_calls.result_ref`; acum e „open”.
- **12-A5 (P1, STATIC).** 12.8 „Household mobile: offline draft” și 16 „Offline queue encrypted” intră în conflict cu mandatul din 28.11: „PWA fără cache de date autentificate sau scrieri offline necontrolate”.
  - Implementarea curentă (#97) **nu are service worker**.
  - Propun ca offline-ul jurnalului să devină **gate explicit în G2**, cu design separat:
    - `clientEventId`;
    - criptarea cozii;
    - ce se întâmplă la logout sau la schimbarea utilizatorului pe telefon;
    - conflict cu versiunea de pe server.
  - Până atunci, doar online.

## 2. Capitolul 13, API Communication

Puncte tari: Idempotency-Key cu hash canonic și 409 la conflict, autoritate niciodată din body, cursor semnat, RFC 9457, webhook-uri semnate pe octeții bruți, „no event substitutes for synchronous compliance gate”.

- **13-B1 (P1, CONFIRMAT-COD).** „Integer minor currency units” vs as-built: `amount: number` în lei cu zecimale (`src/lib/domain.ts`: Expense, FeedPayment, Investment; `estimate.total`), formatat cu `formatLei`.
  - Migrarea cere o regulă de rotunjire documentată: la fiecare linie sau la total, plus cine plătește diferența de 1 ban.
  - Cere și un test de echivalență pe datele existente.
  - Fără această regulă, decontul (`economic-policy`, #87) poate da sume diferite cu un ban.
- **13-B2 (P1, CONFIRMAT-COD).** „UUID resource IDs” vs as-built: comenzile sunt adresate după `number` (`/admin/comenzi/[number]`), loturile după `code` (`XT-2099-…`, `/api/loturi/[cod]`).
  - Propun **cheie internă UUID + cod uman ca cheie naturală unică** (indexat).
  - URL-urile pot folosi codul doar unde autorizarea nu depinde de el. Codul e ghicibil, deci nu servește drept capabilitate.
- **13-B3 (informativ, CONFIRMAT-COD).** „Never accept tenant authority from body”: as-built respectă regula.
  - Ex.: `?gospodarie=` e citit doar pentru `role === "admin"` (`cont/gospodar/page.tsx`).
  - Gospodarul primește `user.farmSlug` din sesiune.
- **13-B4 (P2, STATIC).** Idempotency-Key pe toate mutațiile: server actions-urile as-built nu au chei de idempotență, cu excepția fluxurilor cu PIN sau token. Pentru jurnalul offline (12-A5) e obligatoriu.
- **13-B5 (P2, CONFIRMAT-COD).** Inventarul țintă nu menționează rutele as-built care nu se mapează 1:1:
  - `/api/cron/*` (alerte-documente, rezumat-gospodari din #98);
  - `/acces/*` (curier cu PIN);
  - `/fisiere/*` (descărcare autorizată).

  Recomand o anexă „as-built → țintă”. Capitolul o lasă ca „implementation deliverable”, dar fără ea reconcilierea G0 nu se poate verifica.

## 3. Capitolul 14, Technical Architecture

Puncte tari: monolit modular, fără microservicii implicite, outbox cu lease și dead letter, apeluri externe în afara tranzacțiilor, „no full collection scan in hot paths”.

- **14-C1 (P2, EXECUTAT).** „Read model /cifre rebuildable, watermark and freshness displayed”.
  - **Implementat în #99**: instantaneu precalculat, recalculare în fundal cu lease, iar pagina afișează „Calculat: …”.
  - Măsurat pe 200k precomenzi + 100k cheltuieli: **1.007 ms → 0,4 ms** p50, ~142 MB heap → un document de 591 B.
  - **Watermark-ul** (până la ce înregistrare sunt incluse datele) nu e implementat; există doar `computedAt`. De decis dacă watermark-ul e cerut pentru cifrele publice.
- **14-C2 (P1, CONFIRMAT-COD).** „No full collection scan in hot paths” e **încălcat azi** în layout-ul Admin.
  - Problema: la **fiecare** cerere în Admin se citesc integral trei colecții (`src/app/(panou)/admin/layout.tsx:14–16`):
    - `applicationRepository.list()`;
    - `investorRepository.list()`;
    - `lotRepository.list({ all: true })`.
  - Pentru contoarele din bară se citesc și alerte și mesaje.
  - Propunere: contoare prin `store.aggregate` / `findBy` pe status (indexate), după modelul C1 (#83).
  - Pas cerut: benchmark înainte / după, ca la #86 și #99.
- **14-C3 (informativ, CONFIRMAT-COD).** Outbox-ul as-built: preluare per mesaj cu `store.transact` (`FOR UPDATE`) și lease, plus listă după status indexat (`src/server/outbox.ts`). Nu e un batch `SKIP LOCKED`. Corect la volumul actual; la scară, batch-ul `SKIP LOCKED` din capitol e pasul firesc.

## 4. Capitolul 15, Security

Puncte tari: threat model complet, inclusiv prompt injection și insider; IBAN niciodată autonom; separarea cheilor de criptare de secretul de sesiune; „no claim of tamper-proof before anchor”.

- **15-D1 (informativ, CONFIRMAT-COD).** Ce e deja implementat:
  - TOTP cu cheia **criptată** (AES-256-GCM, `src/server/mfa.ts`);
  - revocarea sesiunilor prin `sessionVersion` (`src/server/session.ts:32`);
  - limite de rată pe IP pentru PIN (SEC-007).
- **15-D2 (P1, CONFIRMAT-COD).** **CSP lipsește**: nu există niciun `Content-Security-Policy` în `next.config.ts` sau `src/proxy.ts`.
  - Capitolul o cere. Cu scripturi inline (tema) e nevoie de nonce sau hash.
  - Propun un PR separat:
    - CSP strictă cu nonce;
    - `frame-ancestors 'none'`;
    - `Referrer-Policy`;
    - test E2E că pagina se încarcă fără erori CSP.
- **15-D3 (P2, STATIC).** „Rotation after privilege change”: as-built invalidează sesiunea dacă se schimbă rolul (`user.role !== payload.role`). E bine. De verificat și la schimbarea gospodăriei asociate (`farmSlug`), care intră în scope.

## 5. Capitolul 16, UX Design

Puncte tari: drafturile, ce e trimis și ce e aprobat se disting; nicio confirmare optimistă pentru plăți, alocări sau hold-uri; WCAG 2.2 AA; „no hidden defaults for unknown mortality”.

- **16-E1 (P1, CONFIRMAT-COD).** Navigarea gospodarului diferă între țintă și as-built (#95):

  | | Secțiuni |
  |---|---|
  | Țintă (cap. 16) | Astăzi, loturi, jurnal, materiale, cheltuieli, documente, istoric |
  | As-built (#95) | Azi, Jurnal, Documente (cu cheltuieli), Reguli, Securitate |

  - Loturile stau în „Azi”.
  - „Materiale” și „istoric” lipsesc.
  - Propun reconcilierea în cap. 16, cu bara de jos de 5 taburi ca limită.
- **16-E2 (P1, EXECUTAT parțial).** Accesibilitate:
  - în #96, axe-core `color-contrast` dă 0 încălcări pe bara de navigare, în modurile luminos și întunecat;
  - lipsește un **audit axe pe pagini întregi** în E2E: Astăzi, gospodar, comandă client.
  - Propun un spec `a11y.spec.ts` cu regulile WCAG 2.2 AA pe paginile principale.
- **16-E3 (P2, STATIC).** „Responsive 320px upward”: testele de telefon rulează la 390 px (iPhone 13). Trebuie adăugat un viewport de 320 px pentru Astăzi și pentru foaia „Meniu”.
- **16-E4 (P1, CONFIRMAT-COD).** „Time zone Europe/Bucharest display, UTC storage”.
  - As-built calculează „azi” în **UTC** în **20 de locuri** (`toISOString().slice(0, 10)`): formularul jurnalului (`GrowthEntryForm.tsx:31`), alerte (`admin-alerts.ts:23`), loturi, investiții, acces la comenzi (`order-access.ts:46`) etc.
  - Între 00:00 și 02:00 / 03:00, ora României, „azi” e ziua de ieri. Se cer:
    - data jurnalului;
    - termenele;
    - alertele.
  - Rezumatul de dimineață (#98) și `farmer-day` folosesc deja data locală.
  - Propun un PR: o funcție `todayRo()` comună, cu test la granița de miezul nopții.

## 6. Capitolul 17, Infrastructure & Deployment

Puncte tari: pipeline-ul cu gate-uri, migrări expand / contract, „never assume rollback undoes data writes”, feature flags cu fail-closed.

- **17-F1 (P0 operațional, CONFIRMAT, EXECUTAT).** **Pipeline-ul de preview e rupt în prezent.**
  - Proiectul Neon are **10/10 branch-uri** (limita planului Free), verificat prin API Neon la 28.11.
  - Toate previzualizările Vercel eșuează (#94, #95 și PR-urile #82, #84–#90), pentru că integrarea nu poate crea branch-ul de preview.
  - Producția nu e afectată (`e8b229c`: „Deployment has completed”).
  - Unul dintre branch-uri (`preview/claude/neon-cleanup-action`) aparține unui PR unit (#93). Acțiunea de curățare (#93) nu rulează fiindcă **lipsește secretul `NEON_API_KEY` în GitHub**.
  - Capitolul presupune „CI ephemeral isolated DB”, ceea ce în CI e adevărat (postgres:16 în job). Pentru previzualizări, însă, dependența de Neon trebuie scrisă explicit, împreună cu limita și curățarea.
- **17-F2 (P2, CONFIRMAT-COD).** „Environment schema validates required variables at startup”: as-built verifică variabilele leneș, la locul folosirii (ex. `CRON_SECRET` ≥ 16 caractere în fiecare rută cron). Recomand o validare centrală la pornire, care să refuze explicit lipsa `SESSION_SECRET` sau a `DATABASE_URL` în producție.
- **17-F3 (P0 pentru G1, CONFIRMAT-COD).** „Separate runtime/migration identities” intră în conflict cu as-built.
  - As-built: aplicația execută **DDL la runtime** (`CREATE TABLE` / `CREATE INDEX` în `init()`, `src/server/db/pg-store.ts:28`, `src/server/db/indexes.ts:54–59`) cu același `DATABASE_URL`, deci rolul runtime e **owner**.
  - Consecințe: rolul nu poate fi non-owner `NOBYPASSRLS`, iar R01 (FORCE RLS) e ineficient la nivel de proces.
  - Propun: un pas de migrare separat, la deploy, cu un rol dedicat; runtime-ul ar rula fără drept de DDL.
  - Pas cerut: test că pornirea aplicației cu un rol fără DDL funcționează pe o bază deja migrată.
- **17-F4 (P2, CONFIRMAT).** „No region/provider commitment”: în fapt, fondatorul a ales Vercel **fra1** + Neon **eu-central-1** (26.11; RTT 93 ms → 2,3 ms). Capitolul trebuie actualizat cu decizia luată.

## 7. Capitolul 18, QA & Testing

Puncte tari: matricea de trasabilitate, „executed vs proposed, never infer pass from file existence”, fixture-urile A/B + local / zonal / admin + runtime non-owner.

- **18-G1 (informativ, EXECUTAT).** Starea as-built, la 28.11 (pe ramuri):

  | Suită | Rezultat |
  |---|---|
  | Teste unitare | 94–97 pass |
  | E2E Playwright + PG16 | 82 pass, inclusiv bara „glassy” cu axe |
  | Harness SQL țintă (#84 / #85) | 27 defecte reproduse → 0 după patch-uri; reverificat azi pe combinația #82 + #84–#90 |

- **18-G2 (P2, STATIC).** Matricea de trasabilitate nu există încă, ca artefact. Propun `docs/qa/TRACEABILITY.md`, generat din ID-urile din titlurile testelor: `AUD-T02`, `NAV-T01`, `SEC-007` etc. Ele există deja în spec-uri.
- **18-G3 (P1, EXECUTAT).** **Fixture-uri dependente de ordinea suitei.**
  - Câteva spec-uri depind de date create de spec-urile anterioare.
  - Exemple: `paginare.spec.ts` sare peste test fără o comandă de pornire; testele care inserează direct au nevoie de tabelul creat de o cerere anterioară.
  - Rulate izolat sau repetat pe aceeași bază, dau eșecuri false (reproduse azi).
  - Capitolul cere „synthetic tenants A/B”. Propun fixture-uri **autonome per spec**, cu seed propriu și curățare, plus un job CI care rulează spec-urile în ordine aleatorie.

## 8. Capitolul 19, Extensibility

- **19-X1 (P2, CONFIRMAT-COD).** `ProgramDefinition` / `ProgramVersion` versionate vs as-built: parametrii de creștere sunt constante în cod (`src/lib/growth.ts` `GROWTH`, `src/lib/pricing.ts`). Un lot nu păstrează versiunea programului cu care a pornit, deci o schimbare de constante modifică retroactiv calculele loturilor vechi. EXT-T02 („old lot retains version”) ar pica azi.
  - Pas minim reversibil: un câmp `programVersion` pe lot, plus un snapshot al parametrilor la pornirea primului țarc.
- Restul capitolului e corect și prudent („no arbitrary executable expressions in database”).

## 9. Capitolul 20, Implementation Roadmap

- **20-H1 (informativ).** Secvența G0–G8 și dependențele G1 → G2 → G3/G4 → G6 sunt coerente cu review-urile 01–11.
- **20-H2.** „Independent reviews 12–20 pending”: închis de acest document.
- **20-H3 (P2, CONFIRMAT).** Roadmap-ul nu mapează ce e deja livrat pe gate-uri:
  - Admin › Astăzi și navigarea de aplicație (#94);
  - „De făcut azi” (#95);
  - rezumatul neactivat (#98);
  - PWA (#97);
  - read-model `/cifre` (#99);
  - bara „glassy” (#96).

  Toate sunt G5 / G8 „parțial, reversibil”. Propun o coloană „as-built / PR”, ca procentul să nu fie dedus din drafturi („draft count not implementation percentage”, corect spus în capitol).
- **20-H4.** Ordinea de integrare pentru PR-urile deschise (verificată azi, EXECUTAT): #82 → #84 → #85 → #86 → #87 → #88 → #89 → #90.
  - Toate se unesc curat, după ce am rezolvat conflictul `package.json` din #84. Am păstrat ambele scripturi, prin merge, fără force-push.
  - Pe combinația lor:
    - 97 de teste unitare trec;
    - `tsc` 0 erori;
    - lint ok;
    - harness SQL: 27 defecte → 0.
  - CI e verde pe toate (Lint/TS/build și E2E). Singurul roșu e Vercel, din cauza 17-F1.

## 10. Ce propun ca PR-uri separate (reversibile, fără decizii de business)

1. **14-C2**: contoarele din layout-ul Admin fără citiri integrale, cu benchmark.
2. **16-E4**: `todayRo()` în cele 20 de locuri, cu test la miezul nopții.
3. **15-D2**: CSP cu nonce + headere de securitate, cu test E2E.
4. **18-G3**: fixture-uri autonome per spec și rulare în ordine aleatorie în CI.
5. **16-E2 / E3**: audit axe pe pagini întregi și viewport de 320 px.
6. **17-F2**: validarea centrală a variabilelor de mediu la pornire.
7. **17-F3**: design (nu implementare) pentru separarea rolului de migrare de cel de runtime, cu test pe un rol fără DDL. Implementarea e gate G1.

## 11. Blocaje reale (nu decizii de business)

- **17-F1**: secretul `NEON_API_KEY` în GitHub (+ `NEON_PROJECT_ID`), sau ștergerea aprobată a branch-ului de preview al PR-ului #93, deja unit. Fără una dintre ele nu există previzualizări și nici branch izolat pentru POC-ul Neon Object Storage.
- **Token-ul Vercel** din mediul Claude e invalid („forbidden”). Jurnalele de build Vercel nu pot fi citite de aici.
