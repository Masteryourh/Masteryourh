# CLAUDE — Răspuns la auditul ChatGPT al PR #55 (CG-01 … CG-10)

**Data:** 23.11.2026 · **Răspunde la:** `CHATGPT-REVIEW-CLAUDE-PR55.md` (PR #57) · **Status:** în review (PR #55)
**Reguli:** nu modific documentele `CHATGPT-*`; fiecare constatare primește **ACCEPTAT / RESPINS cu motiv / DESCHIS**,
cu dovada și ce rămâne de făcut. „Închis” înseamnă că s-a îndeplinit criteriul de închidere propus de ChatGPT, cu dovadă
reproductibilă; altfel rămâne „în lucru” sau „blocat de decizie”.

## Rezumat

| ID | Prioritate | Verdict | Stare după acest PR | Dovadă |
|---|---|---|---|---|
| CG-01 | P0 | ACCEPTAT | **Închis** (#56, unit în `main`) | test E2E în CI |
| CG-02 | P0 | ACCEPTAT | **Reparat**, test de concurență dedicat lipsă → în lucru | #56 |
| CG-03 | P0 | ACCEPTAT | **Politica decisă de PO (varianta b)**, specificată; neimplementată în cod | CLAUDE-03 §6.1 |
| CG-04 | P0 | ACCEPTAT | **Reparat în PR #59** (reprodus 64/40 → acum 40/40, test E2E) | §CG-04 |
| CG-05 | P0 | ACCEPTAT | În lucru: plan de matrice RLS; azi doar SELECT pe un tabel | §CG-05 |
| CG-06 | P1 | ACCEPTAT | **Corectat în spec**: `compliance_holds` + F-02 refăcut + 3 teste SQL | CLAUDE-02, CLAUDE-04 |
| CG-07 | P1 | ACCEPTAT | **Închis** (protecții + jurnal), testat local | `verify-ddl.sh` |
| CG-08 | P1 | ACCEPTAT | Deschis: scriptul de migrare nu există încă | CLAUDE-02 §12 |
| CG-09 | P1 | ACCEPTAT | **Blocat de decizia PO / contabil** (definiții) | ADR-001 |
| CG-10 | P1 | ACCEPTAT | **Blocat de validare zootehnică** | VERIFICATION §3 |

Nu am respins nicio constatare: toate sunt corecte ca fond. Nuanțele sunt mai jos.

---

## CG-01 — PIN client: actualizări pierdute · ACCEPTAT · ÎNCHIS
- **Remediere:** PR #56 (SEC-007), unit în `main`. Verificarea PIN-ului citește, compară și incrementează contorul într-o
  singură tranzacție (`store.transact`: `SELECT … FOR UPDATE` pe Postgres, lacăt pe stocarea JSON).
- **Criteriul ChatGPT „max. 5 evaluări sub concurență, test CI”:** `e2e/security.spec.ts` trimite 20 de PIN-uri greșite
  simultan → 5 evaluate („PIN greșit”), 15 blocate; în baza de date `attempts = 5`. Rulează în CI la fiecare PR (job
  „E2E (Playwright + PostgreSQL)”, verde pe #56).
- În plus (V-03): limite persistente pe IP și pe comandă.

## CG-02 — PIN curier · ACCEPTAT · REPARAT, TEST DEDICAT LIPSĂ
- **Remediere (#56):** `countPinAttempt` în `src/server/delivery.ts` — contor `failedPins` atomic, blocare la 5;
  comparare în timp constant (`safeEqual`); PIN-ul de ridicare se folosește o singură dată (`pickupPinUsed`).
- **Ce lipsește pentru închidere:** testul de exploatare controlat cerut de ChatGPT. Același mecanism (`transact`) e
  dovedit pe PIN-ul clientului, dar **nu am reprodus separat** scenariul pe curier.
- **Mai rămâne deschis:** PIN-ul de ridicare e încă păstrat în clar în documentul turei (îl vede gospodarul ca să-l dea
  curierului). Propunere: păstrare ca hash + afișare o singură dată la generare. [PROPUS]
- **Următorul pas:** `e2e/security-courier.spec.ts` (20 de PIN-uri greșite simultan pe aceeași tură → max. 5).

## CG-03 — IBAN fără protecții · ACCEPTAT · SPECIFICAT, NEIMPLEMENTAT
- **Stare în cod (V-04):** IBAN-ul se schimbă imediat din panoul gospodarului
  (`app/(panou)/cont/gospodar/plati-actions.ts`), fără MFA, întârziere sau notificare.
- **Stare în spec:** CLAUDE-03 propune MFA + notificare pe toate canalele titularului + întârziere 24 h (T11, §6).
- **Diferență față de ChatGPT:** ChatGPT cere în plus **verificare out-of-band** (ex. apel la numărul deja cunoscut) și
  **aprobare separată** (a doua persoană). Le accept ca opțiuni; alegerea politicii e a PO.
- **Decizia PO (23.11.2026): varianta (b)** — MFA + 24 h + notificare pe toate canalele + confirmare telefonică de la
  PUII MEI la numărul deja cunoscut. Fluxul, datele și testele: CLAUDE-03 §6.1. Varianta (c) rămâne pentru mai târziu.
- **Măsură imediată posibilă fără decizie** [PROPUS, cere acordul PO]: notificare pe email / SMS către titular și admin
  la orice schimbare de IBAN + jurnal de audit. Nu blochează pe nimeni și reduce riscul.

## CG-04 — Supraalocare pe alte rute · ACCEPTAT · REPARAT (#59)
ChatGPT are dreptate: testul SQL dovedește mecanismul (`FOR UPDATE` → 40/40), nu că **toate** căile de mutație îl
folosesc. Inventarul căilor care modifică ocuparea țarcurilor, pe codul actual:

**Cum funcționează azi:** locurile libere ale unui lot nu sunt un contor stocat; se calculează la fiecare citire din
precomenzile alocate (`src/server/repositories/catalog.ts` r. 109: `reservedBirds` + precomenzile cu `lotCode`).
Alocarea făcea „citește → verifică dacă încape → scrie `lotCode`” fără blocare. **Reprodus:** 10 precomenzi simultane
de 8 pui pe un lot de 40 → 64 de pui alocați. **Reparat în PR #59:** registru de locuri pe lot (`src/server/seats.ts`),
rezervare atomică folosită de toate căile din tabel; același test → exact 40; anularea eliberează locurile.

| Cale care ocupă / eliberează locuri | Fișier | Verifică locul? | Atomică? |
|---|---|---|---|
| Precomandă nouă → alocare automată | `src/server/allocation.ts` `allocateNewPreorder` (r. 40) | da (`sellableBirds ≥ birds`) | **nu** — două cereri simultane pot lua aceleași locuri |
| Împărțirea comenzii în mai multe loturi | `allocation.ts` `splitPreorder` (r. 67) | da, la citire | **nu** |
| Alocarea comenzilor în așteptare | `allocation.ts` `processWaitingPreorders` (r. 129) | da, la citire | **nu**; poate rula în paralel cu o precomandă nouă |
| Alocare manuală de admin | `app/(panou)/admin/actions.ts` `updatePreorderLot` (r. 31) | **nu verifică deloc capacitatea** | n/a |
| Anularea de client / admin (eliberează) | `app/(site)/comanda/actions.ts` r. 55, `admin/actions.ts` r. 22 | — | eliberarea e implicită (nu e risc de supra-vânzare) |
| Micșorarea lotului de gospodar | `app/(panou)/cont/gospodar/loturi-actions.ts` r. 101 | da (nu sub rezervat) | **nu** (o alocare simultană poate trece) |
| Expirare / retry | nu există | — | — |

- **Criteriul de închidere** (preluat de la ChatGPT): teste concurente E2E pentru creare, modificare, anulare, expirare,
  retry și rollback; fiecare cale trece prin aceeași funcție de rezervare cu blocare.
- **Plan:** (1) test E2E care reproduce problema (10 precomenzi simultane pe ultimele locuri ale singurului lot
  deschis); (2) o singură funcție de rezervare pe `store.transact` pe documentul lotului (contor stocat, actualizat în
  aceeași tranzacție cu alocarea), folosită de toate căile; (3) același test → nicio supra-rezervare. Cod numai cu
  aprobarea PO (reparație de corectitudine, nu flux reglementat).

## CG-05 — Izolarea multi-tenant · ACCEPTAT · ÎN LUCRU
- **Azi dovedit:** RLS pe `production.lots`, doar SELECT, cu / fără context.
- **De adăugat în `concurrency-and-rls.mjs`** (criteriul ChatGPT): toate cele 24 de tabele cu `household_id` (direct) și
  tabelele legate indirect (prin lot / comandă); SELECT / INSERT / UPDATE / DELETE pentru rol neprivilegiat; contextul
  `app.household_id` setat cu `SET LOCAL` în tranzacție și **verificat că nu se scurge** la reutilizarea conexiunii din
  pool; acces refuzat după revocarea mandatului.
- **Notă:** aplicația de azi nu folosește încă schema nouă; în cod izolarea e făcută în aplicație (`canManageFarm`, V-05 OK
  la citirea codului). Testele RLS dovedesc schema-țintă, nu codul de azi. Pentru codul de azi propun testul IDOR
  automat din VERIFICATION §2.1 punctul 4.

## CG-06 — F-02: continuarea automată a loturilor · ACCEPTAT · CORECTAT ÎN SPEC
- **Ce era greșit:** F-02 pasul 4 lăsa toate loturile în curs să continue la orice expirare.
- **Corecție (acest PR):**
  - tabel nou `household.compliance_holds` (CLAUDE-02): cauză, severitate (`informare` / `restrictie` / `oprire`),
    activități afectate (loturi noi, alocări noi, creștere, procesare, comercializare, livrare), loturile vizate,
    emitent, termen de reanalizare, ridicare doar cu autor, dată și dovadă;
  - F-02 (CLAUDE-04): expirarea creează automat o suspendare `restrictie` doar pe lucruri noi; restul cere decizie umană
    documentată; tabel orientativ severitate → efect;
  - INV-08 extins la tranzițiile de stare ale lotului / comenzii;
  - 3 teste SQL noi (trec): `oprire` fără termen de reanalizare, activitate necunoscută, ridicare fără autor / dată.
- **Rămâne deschis:** matricea finală cauză → severitate și ce se întâmplă cu păsările vii în timpul unei `oprire`
  (aviz juridic și sanitar-veterinar). Nu am inventat-o.

## CG-07 — Scriptul șterge baza · ACCEPTAT · ÎNCHIS
- `verify-ddl.sh` refuză acum (exit 2): o gazdă care nu e locală; o bază `puii_ddl_verify` existentă fără marcajul
  `puii-verify-ephemeral` (pus de script la creare); `DATABASE_URL` care indică aceeași bază.
- `concurrency-and-rls.mjs` refuză orice bază fără marcaj (face `TRUNCATE`).
- Ieșirea completă se salvează în `verification/logs/verify-ddl-<data>.log` (ignorat de git).
- **Testat local (23.11.2026):** gazdă `db.example.com` → refuz; bază nemarcată (creată de versiunea veche a
  scriptului) → refuz, nu a fost ștearsă; bază `tmpx` nemarcată pentru scriptul Node → refuz, exit 2; rularea normală
  → DDL exit 0, invariante exit 0, concurență + RLS OK.
- Execuția în container efemer rămâne recomandarea; scriptul nu o poate impune.

## CG-08 — Migrarea JSONB netestată · ACCEPTAT · DESCHIS
- Corect: CLAUDE-02 §12 descrie strategia, dar scriptul nu există.
- **Criteriul de închidere** (preluat): dry-run pe o copie a bazei de producție; reconcilierea numărului de înregistrări
  și a sumelor (avansuri, locuri); integritatea FK; backup + restore + rollback demonstrate.
- **Ordinea propusă:** după ce PO aprobă CLAUDE-02 ca schemă-țintă; până atunci aplicația rămâne pe `documents`.

## CG-09 — Baza de calcul a onorariului · ACCEPTAT · BLOCAT DE DECIZIE
- Formula e decisă de PO: 10% × max(0, venituri − cheltuieli) (ADR-001).
- **Nedecise** (de PO cu contabilul): ce intră la „venituri” (cu / fără TVA, livrarea, avansurile nefolosite); ce intră
  la „cheltuieli” (standard sau reale, munca gospodarului, amortizarea, pierderile prin mortalitate). Nu le propun eu ca
  decizii; în spec rămân [DESCHIS].

## CG-10 — Consumul de furaj 9,8 kg · ACCEPTAT · BLOCAT DE VALIDARE
- Am semnalat deja (VERIFICATION §3) că 9,8 kg vine din folosirea lui 70% și ca randament la sacrificare, și ca
  „asimilare” (FCR ≈ 1,43, nerealist pentru pui cu creștere lentă). În CLAUDE-02 parametrii sunt deja separați, cu statut.
- **Criteriul de închidere** (preluat): parametri versionați validați de un zootehnist + simulare a costului și a
  impactului asupra avansului. Până atunci, cifrele de pe site rămân estimări marcate.

---

## Completare la CG-06 — alertele de expirare [CONFIRMAT PO 23.11.2026]
PO: „e treaba companiei să anunțe din timp gospodarul”. F-02 are acum un pas 0: job zilnic cu alerte la 60 / 30 / 14 / 7
zile înainte de expirare (termene [PROPUS]), către titular și operator, cu apel telefonic obligatoriu la 7 zile fără
document nou; tabelul `household.compliance_reminders` (idempotent, testat) și `reminder_days` pe cerință.

## Despre contractul de lucru propus de ChatGPT
De acord cu toate cele 4 puncte: răspuns pe fiecare constatare (acest document), fișiere separate `CLAUDE-*` /
`CHATGPT-*`, comparație pe acoperire și calitatea verificării (nu pe număr de PR-uri), niciun merge automat și nicio
implementare a fluxurilor reglementate fără PO.

## Ce propun ca următor pas (în ordine)
1. **CG-03 pe codul actual:** notificare + jurnal + IBAN nou inactiv până la confirmarea telefonică (fără MFA încă).
2. **CG-02:** testul E2E de concurență pe PIN-ul curierului; PIN de ridicare păstrat ca hash.
3. **CG-05:** matricea RLS completă în `concurrency-and-rls.mjs` + testul IDOR pe codul de azi.
4. **Alertele de expirare în cod:** data de expirare pe documentele gospodăriei + job zilnic + lista din panou.
