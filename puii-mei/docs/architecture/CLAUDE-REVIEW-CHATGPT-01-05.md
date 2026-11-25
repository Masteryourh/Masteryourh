# Review independent Claude — capitolele ChatGPT 01–05, addendumurile și SQL-ul PR60

Data: 24.11.2026. Mandatul: PR #62, comentariul 7145113298, aprobat de fondator. Acest document e **review**, nu
aprobare. Drafturile ChatGPT rămân drafturi.

**Marcaje.** Fiecare constatare e marcată cu una dintre:
- **EXECUTAT**: rulat în PostgreSQL 16 izolat, cu rezultatul copiat mai jos;
- **CONFIRMAT-COD**: văzut în cod, cu fișierul și linia;
- **STATIC**: citire a documentului sau a SQL-ului, fără execuție;
- **IPOTEZĂ**: nemăsurat.

Severitate: P0 blochează baseline-ul sau implementarea; P1 trebuie rezolvat înainte de capitolul respectiv; P2 e o
îmbunătățire.

**Surse.**
- PR #50 (branch `docs/chatgpt-technical-architecture-v1`): `CHATGPT-01-GENERAL-ARCHITECTURE.md`,
  `CHATGPT-02-APPLICATION-ARCHITECTURE.md`, `CHATGPT-03-DATABASE-ARCHITECTURE.md`,
  `CHATGPT-04-IDENTITY-ACCESS-MANAGEMENT.md`, `CHATGPT-05-HOUSEHOLD-MODULE.md`, inclusiv addendumurile v0.2.
- PR #60 (branch `docs/chatgpt-database-architecture-v1`): `chatgpt-04-core-schema.draft.sql`,
  `chatgpt-04-extensions.draft.sql`, `chatgpt-04-tenant-hardening.draft.sql`.
- Codul: `main` (până la #68) și stiva deschisă #69 → #70 → #73 → #74.

## 1. Verificări executate pe SQL-ul PR60 (PostgreSQL 16.x, bază nouă)

**Reproducere.**
- scriptul SQL: `docs/architecture/verification/pr60-ddl-validate.sql`;
- testul de concurență: `scripts/verify/pr60-allocate-concurrency.mjs`;
- rolul de test `app_rt`: nu e owner, are `NOBYPASSRLS`, are drepturi DML pe toate tabelele.

| ID | Verificare | Rezultat obținut | Concluzie |
|---|---|---|---|
| V00 | Aplicarea core → extensions → hardening pe o bază goală | 0 erori; **53 de tabele**; RLS activ pe **30 de tabele**, 30 de politici; **0 tabele cu FORCE** | Sintaxă validă. Cap. 03 addendum spune 28 de politici; în realitate sunt 30 |
| V00b | Rularea a doua oară a acelorași fișiere | 60 + 28 + 64 de erori („already exists”) | Nu e idempotent: e nevoie de un instrument de migrări versionate (P1) |
| V01 | Rolul runtime cu tenant A citește `production.lots` | 1 rând (doar A) | RLS funcționează pe tabelele acoperite |
| V02 | Rolul runtime fără context | 0 rânduri | Fail-closed corect (`current_setting(...,true)` → NULL) |
| V03 | Tenant A inserează un lot pentru B | `ERROR: new row violates row-level security policy` | WITH CHECK corect |
| V04 | Tenant A citește tabelele fără RLS | `platform.documents` 1 rând (al lui B), `commerce.customers` 2 (toți clienții), `ai.runs` 1 (al lui B) | **P0: date personale și documente vizibile între tenanți** |
| V05 | Mandatul lui A cu `document_id` al lui B | **ACCEPTAT** | **P0, confirmă DB-G01** |
| V06 | Dovada de plată a lui A cu `bank_account_id` al lui B | **ACCEPTAT** | **P0, confirmă DB-G02** |
| V07 | Aceeași inserare cu un cont inexistent | `ERROR … violates foreign key constraint` | **P0 nou: oracol de existență.** Verificarea FK ignoră RLS, deci un tenant poate afla ce id-uri există la alt tenant |
| V08 | Propunere AI cu `household_id` NULL pe rularea lui B | **ACCEPTAT** | **P0, confirmă DB-G03** (MATCH SIMPLE) |
| V09 | Două alocări de 30 pe un lot de 40, fără contract | Alocat activ **60**; `reserved_units` = 0 | **P0, confirmă DB-G04**: baza singură nu protejează capacitatea |
| V10 | `SET` (fără `LOCAL`) urmat de `COMMIT`, apoi o tranzacție nouă pe aceeași conexiune | Tranzacția nouă vede tenantul B și lotul lui B | **P0: scurgere între cereri la pool.** Contextul se setează exclusiv cu `SET LOCAL` |
| V11 | Rol **owner** al tabelului (non-superuser, NOBYPASSRLS), context A | Vede **2** loturi (A și B). Cu `FORCE ROW LEVEL SECURITY`: 1 | **P0: fără FORCE, owner-ul ocolește RLS.** Pe Neon aplicația se conectează implicit ca owner |
| V12 | Contractul AllocateOrderLine (cap. 03 §6): 10 alocări simultane de 8 pe lotul de 40, `UPDATE … SET reserved = reserved + n WHERE reserved + n <= capacity` + insert, în aceeași tranzacție | `{"alocat":5,"refuzat (plin)":5}`, alocat 40, `reserved_units` 40 | Contractul propus e corect dacă e aplicat atomic. Aceeași regulă e implementată deja în cod (#59, `seats-core.ts`) |

## 2. Matrice de contradicții și lacune

| # | Sev. | Unde (draft) | Constatare și dovadă | Soluție propusă | Test | Decizie deschisă |
|---|---|---|---|---|---|---|
| R01 | P0 | 03 §9, DB-G05; SQL hardening | Fără `FORCE ROW LEVEL SECURITY`; conexiunea ca owner ocolește RLS (**EXECUTAT V11**) | Rol owner doar pentru migrări; rol runtime separat `NOBYPASSRLS`, non-owner; `FORCE` pe toate tabelele tenant; test în CI cu rolul real | V11 + IAM-T15 | Rolurile SQL pe Neon (cost 0, dar e nevoie de acces la consolă) |
| R02 | P0 | 03 §9 („SET LOCAL numai în tranzacție”) | Corect în document. Riscul real e în implementare (**EXECUTAT V10**) | Un singur helper (`withScope(ctx, fn)`) care face `BEGIN; SET LOCAL …`; interdicție statică pe `SET app.` în cod; test de reutilizare a conexiunii | V10 în CI | — |
| R03 | P0 | 03 §2, DB-G05 | 23 de tabele fără RLS, între ele `platform.documents`, `commerce.customers` (date personale), `identity.users`, `ai.*`, `notifications.deliveries`, `platform.outbox`, `idempotency_keys` (**EXECUTAT V04**) | Clasificare pe tabel: tenant / participant (client) / global / sistem. Politică sau grant explicit pentru fiecare; clienții prin ownership. Tabelele de sistem doar pentru rolul worker | IAM-T01/T02, DB-T03 | Modelul identității client (cap. 04 §7) |
| R04 | P0 | 03 DB-G01/G02 | FK simple acceptă referințe la obiectele altui tenant (**EXECUTAT V05, V06**). În plus, **oracol de existență** (V07), nesemnalat în draft | FK compuse `(id, household_id)` pentru tot ce e tenant. Documentele globale într-o tabelă separată sau o legătură tipizată. Erorile FK mapate la 404 generic în API | DB-T02 + V07 negativ | — |
| R05 | P0 | 03 DB-G03 | `ai.proposals.household_id` NULL ocolește FK-ul compus (**EXECUTAT V08**); `ai.*` fără RLS | `MATCH FULL` sau `CHECK (scope_kind='global' AND household_id IS NULL OR scope_kind='tenant' AND household_id IS NOT NULL)`; RLS pe `ai.*` | DB-T07 | Ce date AI sunt globale |
| R06 | P0 | 03 DB-G04, §6 | Capacitatea nu e protejată de bază (**EXECUTAT V09**); contractul din §6 funcționează (**EXECUTAT V12**) | `reserved_units` actualizat atomic în aceeași tranzacție cu alocarea + CHECK existent. Opțional, trigger de reconciliere. Portarea regulilor din `seats-core.ts` (#59), deja testate (E2E `overbooking.spec.ts`: 10 și 30 de cereri simultane) | DB-T04 cu 100 de cereri | — |
| R07 | P0 | 03 SQL politici; 04 §5; 05 §3; addendum teritorial | Toate politicile folosesc **un singur** `app.household_id`. Managerul local (toate gospodăriile unei comune), cel zonal și adminul național **nu se pot exprima** fără `BYPASSRLS`, ceea ce contrazice „Admin nu e superuser SQL” (01 §2) (**STATIC**, deductibil din V01) | Context `app.scope` = listă de gospodării (`uuid[]`) calculată pe server din atribuirile teritoriale active, sau o funcție `STABLE` `app.can_read(household_id)` peste `territorial_assignments`. Scrierile rămân pe un singur tenant | IAM-T04/T05, HH-T04/T05 | Volumul unei zone (dimensiunea listei); cache-ul scope-ului |
| R08 | P1 | 03 §1 vs addendum | „53 de tabele în 15 scheme” e corect; „28 de politici” e greșit, sunt 30 (**EXECUTAT V00**) | Corectarea inventarului | — | — |
| R09 | P1 | 01 §5, 03 DB-G06 vs PR #70 | Două modele de audit: `platform.audit_events` (PR60) și `audit_events` din #70 (lanț de amprente, trigger doar-adăugare, **lock global** `pg_advisory_xact_lock(424242)` în `pg-store.ts:auditAppend`, **CONFIRMAT-COD**, prezent și în #73/#74). Draftul nu tratează lock-ul | Schema canonică = #70 (are deja actorType, rezultat, lanț, protecție). Lock-ul global se înlocuiește după benchmark-ul de scriere (vezi §3, C3) | Benchmark de scriere înainte/după | Ancorarea externă (01 §5 o lasă deschisă) |
| R10 | P1 | 04 §1 | `requireRole` acceptă admin pentru orice rol: **CONFIRMAT-COD** `src/server/auth.ts:11`, `src/server/session.ts:60`. Există și adminul din variabile de mediu (`session.ts`, `ENV_ADMIN_ID`) fără MFA | De acord cu ținta (capabilități explicite). **Nu schimb acum**: ar fi o schimbare de comportament fără matricea IAM aprobată | IAM-T07 | Matricea IAM finală |
| R11 | P1 | 01 §1, 03 addendum, 04 §1 | Stare depășită: „main pg-store list integral, optimizarea nu e verificată”. #74 e deschis, cu CI verde și măsurătoare (200.000 de comenzi: p50 377 ms → 0,2 ms). „PR65–68 închise”: sunt **unite** în main (`git log origin/main`: dfd0585, aef2a72, 350c7e3, 3fe0c38) | Actualizarea addendumurilor după merge | — | — |
| R12 | P1 | 01 §5 vs 05 §10 | Offline: 01 permite „numai observații de producție”; 05 permite „observații / justificări” | O singură regulă. Propun observații + justificări (decizia fondatorului despre justificare per sarcină, gospodării rurale), fără documente și plăți | HH-T13 | Fondator |
| R13 | P1 | 05 §6 vs propunerea mea de pe #62 | Modelul ChatGPT (`status` + `review_status` separat, `overdue` derivat) e **mai bun** decât lista mea unică de stări | Adopt modelul din 05 §6 | HH-T11/T12 | — |
| R14 | P1 | 01 §6 vs propunerea mea E0 | Corect: un backup zilnic extern înseamnă RPO de până la 24 h. Propunerea E0 avea PITR (RPO de secunde) ca primă linie și copia zilnică doar ca a doua | De clarificat în ADR-012: PITR (Neon) = RPO de secunde; copia externă = protecție la pierderea furnizorului. Restore izolat, niciodată peste producție | DB-T10 / ARCH-T07 | Furnizor, buget (neaprobat) |
| R15 | P1 | 04 §6–7 (`sessions` server-side, token_digest) | As-built: cookie semnat fără stare + `sessionVersion` (`src/server/session-token.ts`, **CONFIRMAT-COD**). Migrarea nu e descrisă | ADR de migrare: păstrăm cookie + `sessionVersion` până la decizie; tabelul `sessions` e necesar doar pentru revocare per sesiune | IAM-T11 | Fondator |
| R16 | P1 | 03 §8 (migrare) | As-built: tenantul e `farmSlug` (text), id-urile sunt text (slug, cod de lot). Ținta folosește uuid. Mapping-ul e prevăzut (M2), dar lipsește regula pentru **slug folosit ca cheie** în 40+ locuri | Tabel `legacy_map(collection, legacy_id, uuid)` + `households.slug` imutabil după activare (05 §3 spune deja „nu modificare liberă de slug”) | DB-T09 | — |
| R17 | P1 | SQL V00b | Fișierele nu sunt migrări (nu pot fi rerulate, fără versiune) | Instrument de migrări versionate (fișiere numerotate + tabel de versiuni), `CREATE INDEX CONCURRENTLY` pe tabele mari | DB-T01 rerulabil | Alegerea instrumentului (fără cost) |
| R18 | P2 | 03 SQL `households.county/locality` text | Dublează nomenclatorul SIRUTA propus în addendum | Elimin coloanele text în favoarea `household_locations` | — | Sursa oficială SIRUTA |
| R19 | P2 | 02 §4 | Inventarul Admin „OBSERVAT în PR73” e corect. Completitudinea e verificată automat în #73 (scanare statică + E2E pe 22 de pagini, 0 treceri nepermise) | Referință în APP-T01 la `src/lib/nav-policy.test.ts` și `e2e/admin-command-center.spec.ts` | — | — |

**Puncte de acord** (nu sunt contradicții):
- monolitul modular și bibliotecarul logic fără hop de rețea (01 §2);
- `AccessContext` construit pe server (01 §3);
- erorile comune, cu 404 fără să dezvăluie existența obiectului (01 §3);
- efectele externe după commit (01 §5);
- managerul fără impersonare și fără drepturi de plată (04 §3);
- separarea „justificare ≠ executare” (05 §6);
- default deny pentru AI (02 addendum).

## 3. Consolidarea în paralel: starea PR-urilor și ordinea propusă (fără merge automat)

**Stare verificată acum**
- `main` conține #56, #59, #61, #64–#68.
- Cod deschis, în stivă:
  - #69 (NAV-001) → main;
  - #70 (AUD-001) → #69;
  - #73 (Command Center) → #70;
  - #74 (citiri țintite) → #73.
  - Toate au CI verde la ultimul commit.
- #71 (text pe pagina „Cum funcționează”) → main, independent.
- #72 a fost înlocuit de #73 și trebuie **închis, nu unit**.
- Documentație deschisă: #49, #50, #55, #57, #58, #60, #62, #63.

**Ordine de integrare propusă**
1. Codul, unul câte unul, cu baza mutată pe main înainte de fiecare merge: #69 → #70 → #73 → #74. Apoi #71.
2. Documentația: #58 (mandatul) → #62 / #63 (specificațiile implementate de #69 / #70 / #73) → #50 / #60, marcate DRAFT → #55.

**PR-uri de consolidare propuse** (separate, fără schimbări de business, fiecare cu teste și rollback):

| PR | Conținut | Măsurare |
|---|---|---|
| C1 | #74: indexuri + citiri țintite | **Făcut**: p50 377 → 0,2 ms la 200.000 de comenzi |
| C2 | **Outbox**: e-mail / SMS / notificări scrise în tranzacție, trimise după commit (worker + cron existent); retry, dead-letter, cheie `event+recipient+channel` | Test: rollback ⇒ 0 mesaje trimise (ARCH-T03); timpul de ținere a conexiunii înainte / după |
| C3 | **Benchmark de scriere** (precomenzi concurente: 10 / 100 / 500), întâi doar măsurare cu lock-ul global de audit | Baseline p50 / p95 / p99, erori `lock_timeout`. Schimbarea lock-ului vine doar după măsurare și decizie (ancorarea e deschisă) |
| C4 | **Backup și restore verificat, fără furnizor nou**: script `pg_dump` (format custom) → restore într-o bază goală → verificarea numărului de documente pe colecție, a lanțului de audit și a amprentelor fișierelor; rulat în CI pe date sintetice | Timpul de restore măsurat (ARCH-T07). **Destinația copiilor de producție rămâne DESCHISĂ** (furnizor / buget neaprobat). Până atunci se folosește PITR-ul inclus în Neon |
| C5 | Paginare cursor în listele Admin + agregate pentru `/cifre` + locurile lotului din registrul `lot-seats` în locul tuturor comenzilor | Benchmark de pagină înainte / după |

**Nu fac:**
- schimbări IAM sau de roluri (R10, R15);
- RLS pe as-built JSONB (se face la E1, pe schema relațională);
- migrarea producției;
- SLA, reguli zootehnice, fiscalitate, aprobări AI, mandat juridic. Rămân deschise.

## 4. Decizii deschise, rezultate din review
1. R07: forma scope-ului multi-gospodărie în RLS (listă sau funcție) și dimensiunea maximă a unei zone.
2. R12: offline pentru justificări (da / nu).
3. R15: sesiuni server-side sau cookie + `sessionVersion`.
4. R01 / R17: acces la consola Neon pentru roluri SQL separate; instrumentul de migrări.
5. C4: destinația copiilor de producție (furnizor, buget).
