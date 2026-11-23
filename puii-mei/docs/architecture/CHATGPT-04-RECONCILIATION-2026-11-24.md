# CHATGPT-04 — reconciliere as-built / Claude / ChatGPT (24.11.2026)

**Statut:** audit parțial, independent. Nu reprezintă o comparație exhaustivă a tuturor celor 77 tabele declarate în DDL-ul Claude. Nu au fost rulate scripturi SQL în această etapă.

## Dovezi verificate direct în `main`

- `src/server/db/pg-store.ts`: stocarea operațională curentă utilizează un tabel generic `documents(collection,id,data JSONB,created_at)`. `append` face `INSERT` direct, nu se vede un audit transacțional universal în această operație. Aceasta **nu demonstrează** că toate apelurile nu auditează în altă parte; impune inventar pe toate mutațiile.
- `src/server/seats-core.ts`: registru de locuri folosit de mecanismul #59. PR #59 declară explicit că rezervarea în registru și scrierea precomenzii sunt **două tranzacții separate**, cu reconciliere după 10 minute pentru rezervări orfane.
- `src/server/iban-core.ts` și `docs/architecture/adr/ADR-009-SCHIMBAREA-IBAN.md`: există flux de schimbare IBAN cu confirmare telefonică, temporizare și jurnal dedicat, dar MFA este încă deschis.
- `e2e/courier.spec.ts`: există teste E2E de concurență curier în `main`, provenite din #64.
- `src/app/(panou)/admin/layout.tsx`: meniu Admin include link `/cont/gospodar` pentru «Vedere gospodar» și alerte cu `a.href` pentru jurnal; riscul de traversare involuntară a workspace-ului este documentat în NAV-001.
- `src/components/panel/PanelCrumbs.tsx`: «Înapoi» derivă din părintele URL, fără conservarea stării query/filtre. NAV-001 este încă o cerință neimplementată.

## Matrice de reconciliere

| Subiect | As-built | Claude | ChatGPT | Verdict / acțiune |
|---|---|---|---|---|
| Persistență | JSONB `documents` | DDL țintă separat, declarat 77 tabele în PR #55 | DDL draft 53 tabele în PR #60 | **DESCHIS:** nu există migrare comună; mapare per colecție |
| Alocări | registru `lot-seats` + precomenzi | #59 integrat, reconciliere | `production.lots` + `commerce.allocations`, tranzacție comună propusă | **GAP:** două tranzacții as-built; proiectare pentru un commit atomic |
| IBAN | `ibanChange` în document gospodar | #61 integrat, ADR-009 | `finance.bank_accounts` + verificare | **GAP:** migrare și acces la date, MFA; nu înlocui fluxul fără contract |
| Curier | PIN și sesiune în documente | #64 integrat, E2E | `logistics.tours/parcels` | **GAP:** modelul de sesiune, PIN și idempotency nu sunt încă mapate în DDL |
| Audit | jurnale punctuale, `pg-store.append` generic | IBAN-audit, jurnal curier etc. | AUD-001 central, append-only și proveniență | **P0:** lipsă dovadă audit universal atomic |
| Navigare | rute `/admin` și `/cont/gospodar` | componente PanelCrumbs/PanelShell | NAV-001 workspace isolation | **P0:** remediere UI + teste |
| Tenant | control în servicii + documente | schema DDL cu RLS (de verificat) | FK compozite + RLS parțial | **P0:** teste reale pentru fiecare legătură cross-tenant |
| Conformitate | fluxuri existente | compliance holds în DDL Claude | assessments/holds în DDL ChatGPT | **DESCHIS:** model comun și matrice legală |

## Gate-uri înainte de migrare

1. Inventariază toate colecțiile JSONB actuale, cu tipuri, număr de documente, relații și exemple anonimizate; fără date reale în PR.
2. Fă un tabel de corespondență `collection.field -> target.table.column`, cu transformări, valori implicite, pierderi de informație, reguli de backfill și versiuni.
3. Compară **fizic** DDL Claude cu DDL ChatGPT: chei, constrângeri, RLS, indexuri, tranzacții, identitate, audit și date sensibile. Nu echivala numărul de tabele cu calitatea arhitecturii.
4. Nu migra în producție înainte de reconcilierea volumelor, sumelor, rezervărilor, IBAN-urilor, mandatelor, documentelor și evenimentelor de audit.
5. Gate-uri de CI: compilare PostgreSQL 16, teste RLS cu rol non-owner, concurență, idempotency, crash recovery, rollback și backfill într-o copie anonimizată.
6. Păstrează explicit separat **implementat**, **testat local de Claude**, **verificat independent** și **doar propus**.

## Decizii deschise

- PostgreSQL relațional țintă: schema Claude, schema ChatGPT sau o sinteză pe module.
- Ordinea migrării din `documents` către tabele relaționale și dual-write/cutover.
- Politica de identitate și proveniență AUD-001; arhitectura tranzacțiilor multi-aggregate.
- Modul în care se păstrează istoricul în migrare și se evită falsificarea originii înregistrărilor.
