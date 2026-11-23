# CLAUDE — PUII MEI · Raport de verificare V1

**Autor:** Claude Code · **Data:** 23 noiembrie 2026 · **Statut:** dovezi pentru comparația ChatGPT–Claude; doar
documentare și validare, fără implementare.
**Cerut de:** mesajul de coordonare ChatGPT pe PR #54 (23.11.2026, punctele 1–6), transmis de Product Owner.
**Fișiere de verificare (reproductibile):** `docs/architecture/verification/` — `extract-ddl.py`, `verify-ddl.sh`,
`stats.sql`, `invariants.sql`, `concurrency-and-rls.mjs`.

---

## 0. Rezumat

| # | Cerința ChatGPT | Rezultat |
|---|---|---|
| 1 | Reconciliere ADR-001 | deja făcută în ADR-001 și în CLAUDE-V1 / CLAUDE-02 (10% × max(0, venituri − cheltuieli); definițiile [DESCHIS]; fără formulă executabilă); `01-BUSINESS-ARCHITECTURE.md` neatins |
| 2 | Fluxurile operaționale cap-coadă | `CLAUDE-04-OPERATIONAL-FLOWS.md` (același PR) |
| 3 | Verificarea independentă a DDL v0.2 | **DDL compilează** (exit 0): 14 scheme, 76 tabele, 110 FK, 33 UNIQUE, 83 CHECK, 135 indexuri. **9 reguli dovedite** de schemă; **INV-01 și RLS dovedite** cu teste de concurență / rol; restul doar specificate (§1.3) |
| 4 | Modelul de amenințări prioritar | **o vulnerabilitate confirmată în codul din producție**: limita de 5 încercări la PIN-ul clientului **nu rezistă la cereri simultane** (20 / 20 PIN-uri greșite evaluate, contor = 4). Alte 4 constatări pe cod (§2) |
| 5 | Parametrii de producție | „9,8 kg furaj / pui” și „asimilare 70%” scoși din valorile considerate valide; randamentul la sacrificare și FCR devin parametri separați, versionați, cu statut; **FCR-ul implicit actual (≈1,43) e foarte probabil subestimat** (§3) |
| 6 | Matrice cerință → modul → tabele → API → permisiune → test → status; ADR-uri deschise; diferențe față de CHATGPT-* | §4, §5, §6 |

---

## 1. Verificarea DDL (CLAUDE-02 v0.2)

### 1.1 Cum se reproduce
```bash
cd puii-mei/docs/architecture/verification
PGURL=postgresql://postgres@localhost:5432/postgres ./verify-ddl.sh                         # DDL + statistici + invariante SQL
DBURL=postgresql://postgres@localhost:5432/puii_ddl_verify node concurrency-and-rls.mjs     # concurență + RLS (rulat din folderul repo-ului, ca să găsească `pg`)
```

### 1.2 Rezultat (PostgreSQL 16.15 local, 23.11.2026)
```
DDL: exit 0
scheme|14   tabele|76   chei_straine|110   unique|33   check_explicite|83   indexuri|135   tabele_cu_household_id|23
OK  pret client = 36 lei/kg (coloana generata)
OK  INV-02 cheie de idempotenta duplicata respinsa
OK  INV-03 al doilea avans activ respins
OK  INV-04 confirmare fara referinta bancara respinsa
OK  INV-05 inregistrare confirmata fara document respinsa
OK  INV-07 al doilea blocaj activ pe acelasi lot respins
OK  INV-11 a doua inchidere a aceluiasi lot respinsa; diferenta = 3.000 lei
OK  FK alocare pe tarc inexistent respinsa
OK  IBAN invalid respins
Invariante SQL: exit 0

OK  fără FOR UPDATE: 10 cereri simultane pentru ultimele 5 locuri → 10 rezervate, total 85/40 (supra-vânzare reprodusă: testul e relevant)
OK  cu FOR UPDATE (INV-01): 10 cereri simultane → 1 rezervată, total 40/40
OK  RLS: gospodăria MS vede doar loturile ei (MS-2026-01)
OK  RLS: fără context de gospodărie nu se vede niciun lot (interzis implicit)
Toate verificările au trecut (exit 0)
```

### 1.3 „DDL compilează” ≠ „regulile de business sunt dovedite”

| Nivel | Ce e dovedit | Invariante |
|---|---|---|
| **A. Schema compilează** | toate tabelele, tipurile, FK, CHECK, indexurile se creează fără erori | toată schema |
| **B. Regula e impusă de baza de date** (test SQL negativ trecut) | inserarea care încalcă regula e respinsă de PostgreSQL | INV-02, INV-03, INV-04, INV-05, INV-07, INV-11 (unicitate), FK, IBAN, preț generat |
| **C. Mecanismul de aplicație e dovedit** (test de concurență / rol) | tiparul `SELECT … FOR UPDATE` previne supra-vânzarea; politica RLS izolează gospodăriile | INV-01, izolarea (§6 din CLAUDE-02) |
| **D. Doar specificat, nedovedit** | depinde de cod încă nescris | INV-06 (append-only prin GRANT), INV-08 (Compliance Gate), INV-09 (fereastra de 7 zile), INV-10 (preț înghețat), INV-12 (conflict de idempotență), INV-13 (fișiere scanate), INV-14 (lanț de amprente), formula onorariului |

**Limite:** testul de concurență e făcut direct în SQL, nu prin aplicație; RLS a fost testat pe un singur tabel
(`production.lots`); migrarea JSONB (CLAUDE-02 §12) **nu** a fost rulată (nu există încă scriptul de migrare).

---

## 2. Modelul de amenințări, validat pe codul actual

| ID | Amenințare | Ce am verificat | Rezultat | Dovadă |
|---|---|---|---|---|
| V-01 | **Ghicirea PIN-ului clientului prin cereri simultane** | 20 de PIN-uri greșite trimise simultan pe aceeași comandă (Playwright, server local) | **VULNERABIL.** Toate 20 au fost evaluate („PIN greșit”), 0 blocate; contorul a rămas la **4** (actualizări pierdute). Cererile în paralel ocolesc limita de 5 încercări. | `src/server/order-access.ts` r. 68–73: citire → verificare → `update(attempts + 1)` fără operație atomică |
| V-02 | Același tipar la PIN-ul curierului | citirea codului | **Probabil vulnerabil** (netestat): `failedPins + 1` citit-modificat-scris; PIN-ul de ridicare păstrat în clar și comparat cu `!==` | `src/server/delivery.ts` r. 177–180, 232 |
| V-03 | Cereri de PIN în rafală | citirea codului | limită doar 1 / minut / comandă; fără limită pe zi sau pe IP | `order-access.ts` (RESEND_SECONDS) |
| V-04 | Schimbarea IBAN-ului gospodăriei pentru a deturna avansurile | citirea codului | **Fără protecții:** IBAN-ul se schimbă imediat, fără MFA, fără întârziere, fără notificare | `app/(panou)/cont/gospodar/plati-actions.ts` |
| V-05 | IDOR între gospodării | citirea tuturor acțiunilor (auditul V1 §5) | **OK în cod:** fiecare acțiune a gospodarului verifică `canManageFarm` pe obiect; adminul are acces total (de restrâns după CLAUDE-03) | auditul V1 §5.2 |
| V-06 | Documente private | citirea codului | **OK:** `/fisiere/[id]` cere sesiune + `canViewDocument`; **de îmbunătățit:** pozele acceptă `?o=<token comandă>` valabil cât trăiește comanda | `app/fisiere/[id]/route.ts`, `app/foto/[id]/route.ts` |
| V-07 | PIN manual (SMS neconfigurat) | citirea codului | PIN-ul în clar e vizibil în panoul admin cât e valabil (asumat ca soluție temporară) | `order-access.ts` (`manual`) |
| V-08 | Mandat revocat | — | **Nu există în cod** (nici mandat, nici revocare); doar în spec (CLAUDE-02 `household.mandates`) | — |
| V-09 | Injecție în prompturile agenților AI, aprobări AI | — | **Nu există AI în cod**; doar în spec (CLAUDE-03 §9) | — |

**Reparația propusă pentru V-01 / V-02** (de implementat doar cu aprobarea PO, ca reparație de securitate):
incrementarea și verificarea într-o singură operație atomică. Pe stocarea actuală: o actualizare condiționată
(`UPDATE … SET data = jsonb_set(…, attempts + 1) WHERE … AND (data->'accessPin'->>'attempts')::int < 5 RETURNING …`),
iar dacă nu se întoarce niciun rând → „prea multe încercări”, **înainte** de a compara PIN-ul. Pe schema nouă: `UPDATE
identity.access_pins SET attempts = attempts + 1 WHERE id = $1 AND attempts < 5 RETURNING attempts`. Plus limită pe IP și
pe zi (V-03). Test de regresie: exact scenariul de mai sus trebuie să dea maximum 5 evaluări.

### 2.1 Teste negative automate de adăugat (definite; neimplementate)
1. PIN client: 20 cereri simultane greșite → maximum 5 evaluate, restul „prea multe încercări”.
2. PIN curier: idem pentru PIN-ul de ridicare și PIN-ul personal.
3. Cerere PIN: a 6-a cerere / zi / comandă → 429; a 21-a / zi / IP → 429.
4. IDOR: gospodarul A, pentru fiecare acțiune din `cont/gospodar/*`, cu ID-uri ale gospodăriei B → refuz, fără efect.
5. Curier: sesiunea turei A nu poate încărca / preda colete din tura B.
6. Fișiere: `/fisiere/<id>` al altei gospodării → 401 / 404; `/foto/<id>?o=<alt token>` → 401.
7. IBAN: schimbarea fără MFA / fără perioada de așteptare → refuzată (după implementarea CLAUDE-03 §6).
8. Mandat revocat: acțiunile PUII MEI în numele gospodăriei → `ACCESS_DENIED` (după implementarea mandatelor).
9. AI: cheia unui agent pe `finance.payment.confirm` / `quality.lot_hold.release` → 403; scrierile devin propuneri.

---

## 3. Parametrii de producție: randament la sacrificare vs. conversia furajului

**Ce spune codul / planul azi:** pui curățat 4,8 kg = 70% din viu → **6,86 kg în viu**; „asimilare 70%” → furaj =
6,86 / 0,70 = **9,8 kg / pui** (`src/lib/pricing.ts`). README-ul spune încă ~6 kg (neactualizat).

**Problema:** aceeași cifră (70%) e folosită pentru două lucruri diferite:
1. **randamentul la sacrificare** (carcasă / greutate în viu) — 70% e plauzibil ca ordin de mărime;
2. **conversia furajului (FCR)** = kg furaj consumat / kg greutate vie câștigată. „Asimilare 70%” înseamnă un FCR de
   **≈ 1,43**.

**Indicație (de verificat de un zootehnist, nu o valoare validată):** un FCR de 1,43 e mai bun decât al puilor de
broiler industriali la vârsta de sacrificare. Pentru pui cu creștere lentă, ținuți 60 de zile, parțial pe pășune,
valorile întâlnite de obicei sunt **în jur de 2,5–3,5**, adică **≈ 17–24 kg furaj / pui** pentru 6,86 kg în viu
(de 1,7–2,5 ori mai mult decât 9,8 kg). Dacă se confirmă, **avansul pentru furaj este subestimat**, iar costul real al
lotului e mai mare decât arată estimările de azi.

**Ce schimb în specificație:** în CLAUDE-02 (exemplul de parametri ai programului) randamentul la sacrificare și FCR-ul
devin parametri separați, fiecare cu statutul validării; furajul / pui se **calculează** din ele; „9,8 kg” și
„asimilare 70%” nu mai apar ca valori. Costul standard al furajului (`program.cost_standards`) rămâne gol până la
validarea zootehnică. **Codul actual nu e modificat** (calculul avansului din site rămâne cum e până la decizia PO).

---

## 4. Matricea de trasabilitate (cerință → modul → date → API → permisiune → test → status)

API = rutele propuse pentru `/api/v1` (în UI, aceleași comenzi de domeniu se apelează din server actions).
Status: **COD** = există azi · **SPEC** = doar specificat · **DESCHIS** = cere decizie.

| ID | Cerință | Modul | Tabele / coloane | API (propus) | Permisiune (CLAUDE-03) | Test | Status |
|---|---|---|---|---|---|---|---|
| R-01 | Autentificare cu parolă, blocare după 5 eșecuri | identity | users, login_attempts | POST /auth/login | — | E2E „parola greșită” | COD (blocare în memorie) |
| R-02 | MFA pentru roluri interne | identity | mfa_factors | POST /auth/mfa/verify | toate cu „MFA” | MFA lipsă → refuz | SPEC |
| R-03 | Client: număr + PIN 24 h | identity, commerce | access_pins, orders | POST /orders/{nr}/pin, POST /orders/{nr}/pin/verify | commerce.order.read (O) | E2E PIN + V-01 | COD (V-01 vulnerabil) |
| R-04 | Curier: link + PIN pe tură | logistics, identity | tours, access_pins | POST /tours/{token}/pair | logistics.parcel.* (O) | test V-02 | COD |
| R-05 | Gospodăria ca entitate economică + profil public | household | households, farm_profiles | POST /households, PATCH /households/{id}/profile | household.create, household.profile.edit | IDOR | SPEC (azi profil) |
| R-06 | Suprafața declarată + verificată → nr. țarcuri | household, program | land_parcels, program_versions.params | POST /households/{id}/land, POST /land/{id}/verify | household.land.declare / verify | unitar pensForArea | COD |
| R-07 | Compliance Gate înainte de activitate comercială | household | compliance_requirements, compliance_checks | POST /households/{id}/compliance/{req} | household.compliance.check | INV-08 | SPEC |
| R-08 | Mandat PUII MEI cu limite și revocare | household | mandates | POST/DELETE /households/{id}/mandates | household.mandate.manage | V-08 | DESCHIS (BA-002) |
| R-09 | Regim gospodărie (avertizată / suspendată / exclusă) | household | households.standing, standing_events | POST /households/{id}/standing | household.standing.change (A) | refuz lot nou | COD |
| R-10 | Program cu parametri versionați | program | programs, program_versions | POST /programs/{id}/versions | program.version.approve | — | SPEC |
| R-11 | Costuri standard + abateri | program, finance | cost_standards, cost_variances | GET /lots/{id}/variances | finance.lot.close | — | SPEC (valori DESCHIS) |
| R-12 | Lot propus de gospodar, aprobat de admin; cod MS-2026-01 | production | lots | POST /lots, POST /lots/{id}/approve | production.lot.propose / approve | E2E | COD |
| R-13 | Țarcuri de 40, pornire la plin, fereastră 7 zile | production | pens | POST /pens/{id}/start | production.pen.start | INV-09 | COD |
| R-14 | Efectiv cu evenimente (intrare, mortalitate) | production | flock_events | POST /pens/{id}/flock-events | production.flock_event.record | append-only | SPEC (azi doar în jurnal) |
| R-15 | Jurnal de creștere: mutare cu GPS, poză la 7 zile, veterinar | production | growth_entries | POST /lots/{id}/growth-entries | production.growth_entry.add | E2E jurnal | COD |
| R-16 | Alerte de monitorizare | production | monitoring_alerts | GET /alerts | production.alert.resolve | unitar growthAlerts | COD |
| R-17 | Cântăriri, randament | production | weighings | POST /pens/{id}/weighings | production.weighing.add | — | SPEC |
| R-18 | Precomandă fără alegerea lotului; alocare automată | commerce | orders, order_lines, allocations | POST /orders (Idempotency-Key) | public | E2E precomandă | COD |
| R-19 | Ultimul loc din țarc nu se vinde de două ori | commerce, production | allocations, pens (FOR UPDATE) | POST /orders | — | INV-01 concurență | SPEC (dovedit în SQL) |
| R-20 | Împărțire sau așteptare când nu încape | commerce | orders.parent_order_id, status | POST /orders/{nr}/choice | commerce.order.choose_split_or_wait (O) | E2E | COD |
| R-21 | Preț = piață + adaos, înghețat la comandă | commerce | price_lists, orders.price_list_id | PUT /price-lists | commerce.price_list.change (MFA) | INV-10 | COD (fără înghețare formală) |
| R-22 | Contractul clientului | contracts | contract_templates, contracts, signatures | GET /orders/{nr}/contract | contracts.contract.read (O) | — | COD (CX-01 DESCHIS) |
| R-23 | Avans în contul gospodăriei; declarare client, confirmare cu dovadă | finance | payments, payment_confirmations | POST /payments/{id}/declare, POST /payments/{id}/confirm | finance.payment.declare (O) / confirm (H, MFA) | INV-03, INV-04 | COD (fără dovadă: CX-04) |
| R-24 | Anulare și rambursare | commerce, finance | orders.cancelled_at, refunds | POST /orders/{nr}/cancel, POST /refunds | commerce.order.cancel, finance.refund.* | — | COD anulare; DESCHIS rambursare (BA-007) |
| R-25 | Registrul gospodăriei: ciornă → confirmat → anulat cu motiv | finance | ledger_entries | POST /ledger, POST /ledger/{id}/confirm | finance.ledger.* | INV-05 | COD |
| R-26 | Închiderea lotului și onorariul 10% | finance | lot_closings, invoices | POST /lots/{id}/close | finance.lot.close, finance.fee.approve | INV-11 | SPEC (ADR-001, definiții DESCHIS) |
| R-27 | Investiții și rambursare pe lot | finance | investments, repayments | POST /investments/{id}/repayments | finance.investment.* | — | COD (DESCHIS DEC-007) |
| R-28 | Aprovizionare și stocuri | inventory | inventory_items, supply_orders, stock_movements | POST /supply-orders, POST /stock-movements | inventory.* | — | SPEC |
| R-29 | Sacrificare / procesare ca etapă trasabilă | logistics | processing_runs | POST /lots/{id}/processing | logistics.processing.record | — | SPEC (DESCHIS BA-003) |
| R-30 | Etichete QR, ture, traseu, predare cu temperatură și semnătură | logistics | parcels, tours, tour_stops, tour_events | POST /tours, POST /parcels/{id}/deliver | logistics.* | E2E livrare | COD |
| R-31 | Confirmarea primirii și evaluarea | logistics, quality | parcels.confirmed_at, ratings | POST /parcels/{token}/confirm | logistics.parcel.confirm_receipt (O) | — | COD |
| R-32 | Neconformități, acțiuni corective, blocarea lotului | quality | nonconformities, corrective_actions, lot_holds | POST /lots/{id}/hold | quality.* (deblocare A, MFA) | INV-07 | SPEC |
| R-33 | Trasabilitate publică + pentru client | traceability | vederi peste toate modulele | GET /lots/{code}, GET /orders/{nr}/trace | public / O | E2E trasabilitate | COD |
| R-34 | Documente private, verificate | documents | files, documents, document_links | POST /documents, GET /files/{id} (link semnat) | documents.* | V-06 | COD (fișiere în DB: D-04) |
| R-35 | Notificări email / SMS cu reîncercare | notifications | notifications, outbox | — (intern) | — | outbox | COD parțial (neconfigurat) |
| R-36 | Audit central cu dovadă de integritate | platform | audit_log | GET /audit | identity.audit.read | INV-14 | SPEC |
| R-37 | Agenți AI cu propuneri aprobate de om | ai | agents, proposals, runs | POST /ai/proposals/{id}/decide | ai.* | §2.1 test 9 | SPEC |
| R-38 | Cifre publice | platform / finance | vederi agregate | GET /public/metrics | public | — | COD (CX-02: de restrâns) |
| R-39 | Verticale noi fără schimbarea nucleului | program, commerce | programs.vertical, products | — | program.version.approve | — | SPEC |

---

## 5. ADR-uri și decizii deschise (consolidat)

| ID | Subiect | Sursă | Propunerea Claude |
|---|---|---|---|
| ADR-001 (acceptat) | Onorariul 10% × max(0, venituri − cheltuieli) | PO | definițiile venituri / cheltuieli, standard vs. real, TVA, amortizare, muncă, pierderi: [DESCHIS] |
| ADR-002 | ORM | CLAUDE-02 | Drizzle |
| ADR-003 | Object storage | CLAUDE-02 | Vercel Blob la start, interfață abstractă |
| ADR-004 | Furnizor SMS | CLAUDE-02 | de comparat Twilio vs. furnizor RO |
| ADR-005 | Momentul activării RLS | CLAUDE-02 | după migrare, cu testele IDOR |
| ADR-006 | Gospodării multiple pe utilizator | CLAUDE-02 | da |
| ADR-007 (nou) | Reparația V-01 / V-02 (PIN-uri, operație atomică + limite pe IP / zi) | acest raport | de aprobat ca reparație de securitate, înaintea restului |
| ADR-008 (nou) | FCR și randamentul la sacrificare ca parametri separați; valori zootehnice validate | acest raport §3 | zootehnist; până atunci avansul rămâne cel actual, marcat „estimare” |
| CX-01 | Părțile contractului clientului | V1 | bipartit gospodărie–client (BA §3) până la jurist |
| SEC-D01…D06 | Vizibilitatea pentru investitor și gospodar, plăți în numele gospodăriei, retenția, MFA, DPO | CLAUDE-03 | propuneri în CLAUDE-03 §15 |
| BA-001…010, DEC-001…010 | Forma juridică, mandatul, sacrificarea, contractele, transportul, avansul / anularea / rambursarea, discrepanțele, pilotul, vizibilitatea datelor | 00 / 01 | nerezolvate; blochează fluxurile reglementate |
| ADR-TECH-001…010 | backlog ChatGPT (monolit, PostgreSQL, tenancy, outbox, storage, AI gateway, API, migrare, acces curier / client, rețete) | CHATGPT-03 §10 | se suprapun cu ADR-002…008; de unificat într-un singur registru |

---

## 6. Diferențe față de documentele CHATGPT-* (surse precise)

Comparat cu `origin/docs/chatgpt-technical-architecture-v1` la commit `1da84d8`:
`CHATGPT-TECHNICAL-ARCHITECTURE-V1.md` (secțiunile A–G) și `CHATGPT-03-SYSTEM-ARCHITECTURE.md` (§1–12).

| Subiect | ChatGPT | Claude | Concluzie |
|---|---|---|---|
| Onorariul | §G: AUD-011 marcat depășit; 10% acceptat; definiții deschise | ADR-001 + aceleași puncte deschise | **aliniat** |
| Arhitectura | CHATGPT-03 §3–4: monolit modular, 14 domenii, worker separat | CLAUDE-02 §1–4: 15 module (cu Contracte și Stocuri preluate) | **aliniat**; denumiri diferite (`production_batches` vs. `lots`, `flock_movements` vs. `flock_events`) — de unificat |
| Baza de date | CHATGPT-03 §12: DDL „următorul document” | DDL complet, verificat (§1) | Claude are DDL; ChatGPT a notat corect că cifrele 14 / 76 „sunt raportate de autor” — acum au dovezi reproductibile |
| Erori, SLO, MFA, CSRF, fișiere, dead-letter | CHATGPT-03 §6–9 | preluate în CLAUDE-02 v0.2 §16–18, atribuite | **aliniat** |
| Invariante | SYS-INV-01…10 (principii) | INV-01…14 (mecanisme + teste; 9 dovedite în SQL, 2 cu teste de concurență / rol) | complementare: SYS-INV-05 / 07 / 08 (rolul PUII MEI, AI, autoritatea umană) de adăugat explicit în lista Claude |
| PIN client | §G: „nu dovedește rezistență la încercări concurente” | testat: **vulnerabil** (V-01) | ipoteza ChatGPT confirmată empiric |
| FCR / furaj | AUD-008: contradicție blocantă README 6 kg vs. 9,8 kg | §3: FCR ≈ 1,43 implicit, probabil subestimat; parametri separați | **aliniat** pe principiu; Claude adaugă cuantificarea |
| Tenancy | CHATGPT-03 §7: RLS „evaluat ca apărare în adâncime” | RLS testat pe `production.lots` | aliniat; testul extins la toate cele 23 de tabele cu `household_id` rămâne de făcut |
| Roluri și permisiuni | nu există încă document ChatGPT | CLAUDE-03 (matrice pe 11 module) | de comparat când apare varianta ChatGPT |
| Fluxuri operaționale | planificat (§E.2) | CLAUDE-04 (acest PR) | de comparat |
| Migrare JSONB | ADR-TECH-008 „dual-read / dual-write doar dacă e justificat” | CLAUDE-02 §12: fără dual-write, oprire scurtă | **diferență de abordare**: pentru volumul de pilot, propun varianta fără dual-write; de decis prin ADR |
