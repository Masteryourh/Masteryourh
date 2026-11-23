# CHATGPT-04 — Contracte de implementare, teste și gap register (v0.2)

**Status:** DRAFT, proiectare; SQL neexecutat. **Referințe:** `CHATGPT-04-DATABASE-ARCHITECTURE.md`, `chatgpt-04-core-schema.draft.sql`, `chatgpt-04-extensions.draft.sql`. Nu sunt migrări de producție.

## 1. Inventar și nivelul dovezii

Nucleu: **28 tabele** (corecție față de mențiunea eronată de 29 din v0.1). Extensie: **25 tabele** (`contracts` 2, `production` 5, `inventory` 4, `quality` 3, `logistics` 5, `notifications` 2, `ai` 4). Total propus **53 tabele**. Numărarea este manuală; **DDL necompilat și netestat**. Fișierele se execută secvențial doar într-o bază de test izolată. Nu se execută în sistemul existent.

**Nu este completă** nici această versiune: lipsește detalierea identității (credential/session/MFA), permisiunilor atomice, contractelor comerciale per comandă, ledger financiar și refund, furnizorilor de procesare ca operatori juridici, documentelor obligatorii pe activitate, alertelor AI, politicii de retenție, evenimentelor de transport și semnăturilor, programării joburilor și izolării tenant pe toate tabelele.

## 2. Contracte de comandă (propunere, fără implementare)

### DB-CMD-01 — AllocateOrderLine

- **Actor:** operator autorizat sau serviciul de alocare, în numele gospodăriei cu mandat activ.
- **Intrare:** `orderLineId UUID`, `lotId UUID`, `units integer >0`, `idempotencyKey`, `expectedVersion`.
- **Precondiții:** comandă confirmată; produs compatibil cu programul lotului; lot în stare eligibilă; același tenant; mandat activ; lipsa hold-ului pentru `allocate`.
- **Tranzacție:** `BEGIN` → `SET LOCAL app.household_id` → blocare `production.lots` `FOR UPDATE` → verificare `reserved_units + units <= capacity_units` → creare `commerce.allocations` → incrementare `production.lots.reserved_units` → actualizare stare comandă/linie → audit + outbox → `COMMIT`.
- **Erori:** `409 CAPACITY_EXCEEDED`, `409 VERSION_CONFLICT`, `403 TENANT_ACCESS_DENIED`, `403 MANDATE_INACTIVE`, `423 COMPLIANCE_HOLD`, `422 INCOMPATIBLE_PROGRAM`, `409 IDEMPOTENCY_CONFLICT`.
- **Teste:** 20 cereri simultane, capacitate 40; split și anulare; cerere repetată; rollback la eșec în inserare; lot de alt tenant.
- **Criteriu de acceptare:** suma alocărilor active este egală cu `reserved_units` după orice tranzacție comisă; nicio supravânzare.

### DB-CMD-02 — RequestBankAccountChange

- **Actor:** reprezentant al gospodăriei autentificat și autorizat.
- **Intrare:** `householdId`, `holder`, `iban`, `requestId`.
- **Precondiții:** mandat valabil și rol permis; contul anterior rămâne activ până la activarea verificată.
- **Tranzacție:** inserare cont `pending`, stocare IBAN criptat cu cheie gestionată extern, fingerprint HMAC (nu hash simplu cu dicționar), audit + outbox pentru notificări; niciun update pe `active`.
- **Verificare:** operator diferit de solicitant, dovadă independentă a titularului; mecanism exact [DESCHIS, ADR].
- **Activare:** tranzacție serializată per gospodărie, retragere cont anterior + activare cont verificat, verificare mandat și audit.
- **Erori:** `403` tenant/mandat, `409` cerere deja în curs, `422` IBAN invalid, `423` verificare insuficientă.
- **Teste:** dublă cerere, replay, actor identic, expirare mandat, eșec notificare, cont vechi disponibil, interdicția publicării contului pending.
- **Criteriu:** niciun IBAN nou nu este afișat ca destinație de plată înainte de aprobare. Politica finală de MFA/telefon/24h rămâne deschisă.

### DB-CMD-03 — CloseCycleAndSettle

- **Actor:** financiar autorizat + aprobator distinct, conform mandatului.
- **Precondiții:** ciclu închis operațional, dovezi de plată reconciliate, costuri documentate, dispute tratate.
- **Tranzacție:** snapshot venituri/costuri, versiunea regulii, evidențe și audit, outbox pentru procesul de facturare B2B.
- **Regulă [CONFIRMAT]:** 10% × max(0, venituri−cheltuieli); **definiția veniturilor/cheltuielilor [DESCHIS]**. Prin urmare calculul automat este blocat.
- **Teste:** anulare după închidere, diferență negativă, corecții de cost, TVA, refund, dublă închidere, contabilitate nevalidată.
- **Criteriu:** nicio factură PUII MEI emisă automat până la aprobarea ADR-001 complet.

### DB-CMD-04 — RecordProductionEvent

- **Actor:** gospodar autorizat / operator desemnat.
- **Intrare:** `lotId`, `type`, `occurredAt`, `quantity`, `unit`, `evidenceId?`, `requestId`.
- **Validare:** lot din tenant, eveniment în interval acceptat, unitate conform versiunii programului, cantitate nenegativă, fotografie/document deținut de același tenant.
- **Tranzacție:** înregistrare eveniment de domeniu + proiecție + audit + outbox; corecțiile prin evenimente compensatorii, nu ștergere a istoricului.
- **Erori:** `404` lot absent sau neautorizat, `422` date invalide, `409` eveniment duplicat.
- **Teste:** mortalitate > păsări vii, greutate imposibilă, două rapoarte pentru aceeași zi, rețea mobilă intermitentă, upload eșuat.
- **Criteriu:** jurnal complet, corecții atribuibile, reconciliere cu populația lotului.

### DB-CMD-05 — ReleaseComplianceHold

- **Actor:** responsabil conformitate autorizat; agentul AI poate doar propune.
- **Intrare:** `holdId`, `releaseEvidenceId`, `decisionReason`.
- **Validare:** document de dovadă verificat, autoritate potrivită, persoană distinctă unde politica cere, lipsa unei interdicții externe active.
- **Tranzacție:** schimbare stare, audit și notificare; orice activitate blocată rămâne blocată dacă există alte hold-uri.
- **Teste:** eliberare fără dovadă, actor neautorizat, hold de alt tenant, două aprobări simultane.
- **Criteriu:** reluarea unei activități se bazează pe toate restricțiile aplicabile, nu doar pe ultimul hold.

## 3. Defecte și limite cunoscute în SQL-ul draft — obligatoriu de reparat

| ID | Severitate | Problemă | Remediere necesară înainte de aprobarea DDL |
|---|---|---|---|
| GAP-01 | P0 | RLS numai pe 8 tabele directe în core; extensia nu are RLS | politici complete pe toate tabelele directe și indirecte, `FORCE ROW LEVEL SECURITY` unde e necesar, teste sub rol de aplicație |
| GAP-02 | P0 | `commerce.allocations` poate referi o linie de comandă de alt tenant | propagare `household_id` în linii și FK compozit sau constraint trigger; teste negative |
| GAP-03 | P0 | `inventory.stock_movements.location_id` poate fi din alt tenant | `UNIQUE(id,household_id)` pe locații + FK compozit; politica locațiilor centrale separată |
| GAP-04 | P0 | `logistics.parcels.shipment_id` și `temperature_readings.parcel_id` nu verifică tenant | FK compozite pe shipment/parcel; teste |
| GAP-05 | P0 | `quality.nonconformities.inspection_id`, `ai.proposals.run_id` nu propagă tenant | chei compozite sau autorizare pe legături, RLS |
| GAP-06 | P0 | `reserved_units` este cache contabil al `allocations` fără garanție DB de egalitate | tranzacție comună + trigger de validare/reconciliere + teste concurente |
| GAP-07 | P0 | Lipsesc protecții DB împotriva modificării auditului | rol DB append-only, interdicție UPDATE/DELETE, retenție și export verificabil |
| GAP-08 | P1 | `lot_units` permite suprapuneri temporale pe aceeași unitate | `EXCLUDE USING gist` pe interval cu `btree_gist`, dacă modelul fizic o cere |
| GAP-09 | P1 | `stock_movements` nu garantează stoc ne-negativ, transferurile nu sunt perechi | registru/ledger de stoc, comenzi atomice, unități compatibile |
| GAP-10 | P1 | `cycle_settlements` nu are venituri/costuri reconciliate și TVA definit | ADR-001 + registru de linii și snapshot versionat |
| GAP-11 | P1 | `program.versions.rules` este JSONB fără schemă versionată | JSON Schema per program, validare server, compatibilitate versiuni |
| GAP-12 | P1 | Lipsesc notificări deduplicate per termen/versiune de document | cheie unică `requirement + subject + due_date + channel`, retry și dead-letter |
| GAP-13 | P1 | Datele IBAN sunt criptate, dar `iban_fingerprint` nu are algoritm definit | HMAC cu secret separat și rotație; niciodată IBAN brut în audit |
| GAP-14 | P1 | SQL draft nu include credentiale/sesiuni/MFA, rambursări, facturi, curier-tokenuri | DDL complet, state machine, RLS, retenție și teste |
| GAP-15 | P1 | Testele nu au fost executate pe PostgreSQL | CI cu PG16 efemer, `psql -v ON_ERROR_STOP=1`, log și checksum |
| GAP-16 | P1 | Lipsesc constrângeri între documente și proprietarii lor | FK compozite, politici private object storage, scanare fișiere |

**Politica de merge:** nu se promovează SQL-ul în `migrations/` cât există GAP-uri P0. Nu se declară schema finală doar pe baza compilării.

## 4. Plan de verificare reproductibilă

1. Pornește o instanță efemeră PostgreSQL 16, DB fără date reale, utilizator fără drepturi de producție.
2. Rulează `psql -v ON_ERROR_STOP=1 -f chatgpt-04-core-schema.draft.sql`, apoi extensia; arhivează exit code și log.
3. Numără tabele/scheme/FK/CHECK/INDEX prin `pg_catalog`, nu după textul documentului.
4. Construiește două gospodării, două conturi neprivilegiate și teste negative pentru toate căile de acces.
5. Injectează concurență la alocare, IBAN, stoc și eliberare hold; verifică invarianta după fiecare commit.
6. Rulează rollback, retry, crash/restart, rețea intermitentă și replay.
7. Migrează un snapshot JSONB anonimizat și reconciliază rânduri, bani, capacitate și documente.
8. Publică raportul cu PASS/FAIL/SKIP și versiunea exactă a DDL. Nicio dovadă nu poate fi declarată PASS fără execuție.

## 5. Interfața între echipe

- Claude continuă remedierile codului existent (PR #59 și fluxul IBAN); ChatGPT proiectează independent schema și contractele.
- Pentru comparație: `requirement ID -> module -> table/column -> command/API -> permission -> test -> status`.
- **Nu se merge automat** și nu se suprascriu fișierele `CLAUDE-*`.
- ADR-001 și regulile comerciale/sanitar-veterinare rămân sursa deciziilor confirmate, nu presupuneri din DDL.
