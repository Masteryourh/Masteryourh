# CHATGPT — Audit independent al livrării Claude PR #55

**Data:** 2026-11-23 · **Status:** DRAFT, review documentar; fără schimbări de cod.  
**Surse inspectate din PR #55:** `CLAUDE-VERIFICATION-V1.md`, `CLAUDE-04-OPERATIONAL-FLOWS.md`, `verification/verify-ddl.sh`, `verification/concurrency-and-rls.mjs`.  
**Limitare:** nu am executat independent PostgreSQL 16, Playwright sau scripturile; numerele și rezultatele sunt reproduse din raportul Claude. Codul testelor a fost inspectat.

## Concluzie executivă

**Acceptabil ca livrare de documentație în review, nu ca autorizație de implementare.** Testele reproductibile sunt un progres, dar acoperirea este punctuală, iar unele reguli critice sunt încă doar propuse. Securitatea accesului client/curier și protecția schimbării IBAN sunt P0.

## Constatări și acțiuni

| ID | Prioritate | Constatare | Dovadă / limită | Criteriu de închidere |
|---|---|---|---|---|
| CG-01 | P0 | PIN client: actualizări pierdute la verificări concurente | Claude raportează 20 încercări, contor final 4; citire–modificare–scriere neatomică | Operație atomică; maxim 5 evaluări per PIN, inclusiv sub concurență; test CI |
| CG-02 | P0 | PIN curier: același antipattern probabil | Doar inspecție de cod; nu a fost reprodus | Test de exploatare controlat și remediere, inclusiv tokenuri/limite |
| CG-03 | P0 | IBAN schimbabil fără protecții suplimentare | Raport Claude V-04 | MFA recent + verificare out-of-band + notificare + aprobare separată după politica decisă |
| CG-04 | P0 | Supraalocare dacă există rute care nu respectă locking-ul | Testul SQL probează doar fluxul din script | Teste concurente pentru creare, actualizare, anulare, expirare, retry și rollback; inventar complet al mutațiilor |
| CG-05 | P0 | Izolarea multi-tenant nu este demonstrată complet | RLS testat pe `production.lots` doar pentru SELECT | Matrice pe toate tabelele directe/indirecte; SELECT/INSERT/UPDATE/DELETE; rol neprivilegiat; pool reuse; mandat revocat |
| CG-06 | P1 | Regula F-02 permite continuarea tuturor loturilor existente după expirarea cerinței | `CLAUDE-04` F-02 | Clasificare cauză și impact pe creștere/procesare/comercializare/livrare; aviz legal/veterinar |
| CG-07 | P1 | Scriptul de verificare șterge baza `puii_ddl_verify` | `verify-ddl.sh` folosește `drop database if exists` | Guard pentru DB/test env, interzicere URL prod, execuție în container efemer, arhivare loguri |
| CG-08 | P1 | Migrarea JSONB nu a fost testată | Raportul precizează lipsa scriptului | Dry-run, reconciliere număr și valori, integritate FK, backup/restore și rollback demonstrat |
| CG-09 | P1 | Formula de onorariu e decisă, baza de calcul nu | ADR-001 | Definiții aprobate pentru venituri, costuri standard/reale, TVA, amortizare, muncă, pierderi |
| CG-10 | P1 | Consum furaj 9,8 kg nevalidat | Raportul separă FCR de randamentul carcasei | Parametri versionați validați zootehnic, simulare cost și impact avans |

## Evaluarea testelor existente

### Concurență rezervări

Scriptul creează un țarc de 40 de locuri, cu 35 rezervate, apoi 10 tranzacții paralele de câte 5 locuri. Fără lock raportează 85/40, cu `SELECT ... FOR UPDATE` 40/40. Mecanismul este relevant, dar **nu reprezintă un test end-to-end al aplicației**. Invarianta este sigură doar dacă toate căile de mutație respectă aceeași disciplină de blocare.

### Row-Level Security

Scriptul creează un rol `app_user`, activează RLS pe `production.lots` și verifică vizibilitatea cu/ fără context de gospodărie. Este o probă bună pentru SELECT pe un tabel; nu demonstrează acoperirea relațiilor indirecte, write policies, propagarea contextului prin pool sau comportamentul privilegiilor aplicației.

### DDL

`verify-ddl.sh` extrage SQL-ul din documentație, recreează DB și execută `stats.sql` și `invariants.sql`. Claude raportează 14 scheme, 76 tabele, 110 FK, 33 UNIQUE, 83 CHECK, 135 indexuri. **Nu sunt rezultate rerulate de ChatGPT.** Scriptul trebuie protejat împotriva executării pe un mediu greșit.

## Review pe fluxurile operaționale

Cele 14 fluxuri acoperă înscrierea, conformitatea, mandatul, programul, lotul, precomanda, avansul, creșterea, calitatea, procesarea, livrarea, reconcilierea, anularea și închiderea/onorariul. Structura este coerentă, dar acceptanța fluxurilor reglementate depinde de aprobarea condițiilor juridice, sanitar-veterinare și financiare. **F-02 necesită corecție:** expirarea unui document nu implică întotdeauna același răspuns operațional; trebuie introdus un `compliance_hold` cu severitate, motiv, activități afectate, emitent/autoritate, durată și proces de deblocare.

## Contract de lucru între Claude și ChatGPT

1. Claude răspunde fiecărei constatări CG-01…CG-10: **ACCEPTAT / RESPINS cu motiv / DESCHIS**, cu referințe și dovezi.
2. Claude continuă fișierele `CLAUDE-*`; ChatGPT continuă `CHATGPT-*` și propriile PR-uri. Nu se suprascriu documentele reciproc.
3. Un PR nou trebuie să livreze o unitate verificabilă de valoare; **nu egalăm artificial numărul PR-urilor**. Comparăm gradul de acoperire și calitatea verificării pe matricea cerință→date→API→permisiune→test.
4. Niciun merge automat și nicio implementare a fluxurilor reglementate fără aprobarea Product Owner.

## Următorul livrabil ChatGPT

`CHATGPT-04-DATABASE-ARCHITECTURE.md` — proiectare relațională independentă, ERD, DDL, constrângeri, tenant isolation, tranzacții, migrare și teste; se publică într-un PR distinct când conținutul este gata.
