# CLAUDE — Matricea de dovezi pentru izolarea între gospodării (CG-05)

**Data:** 24.11.2026 · **Cod verificat:** `main` + PR-ul acestui document · **Test:** `e2e/idor.spec.ts`
**Ce acoperă:** codul de azi (stocarea `documents`, autorizare în aplicație prin `canManageFarm`). **Ce nu acoperă:**
RLS pe schema-țintă din CLAUDE-02 (vezi §3).

Regula din cod: un gospodar are acces numai la gospodăria din contul lui (`user.farmSlug`); adminul, la toate.
`canManageFarm(user, farmSlug)` = `admin` sau `user.farmSlug === farmSlug`. Paginile gospodarului ignoră
`?gospodarie=` pentru gospodari (doar adminul îl folosește).

## 1. Scriere (acțiuni ale gospodarului)

Metoda testului: gospodarul A își deschide propriile formulare, **modifică câmpul ascuns** (gospodăria / id-ul
obiectului) cu valorile lui B și trimite. Fiecare caz are și o **probă pozitivă** (pe propria gospodărie, același
formular funcționează), ca testul negativ să nu treacă degeaba.

| Acțiune | Fișier | Verificarea | Test E2E | Rezultat |
|---|---|---|---|---|
| Încărcare document | `documente-actions.ts` `uploadDocumentAction` | `canManageFarm(user, farmSlug)` + lotul aparține gospodăriei | `documente: A nu poate încărca…` | ✅ refuzat; B neschimbat |
| Cheltuială / venit nou | `addExpenseAction` | `canManageFarm(user, farmSlug)` | `cheltuieli: …` | ✅ refuzat |
| Anulare cheltuială | `voidExpenseAction` | `canManageFarm(user, expense.farmSlug)` (citit din obiect) | `cheltuieli: …` | ✅ refuzat; + probă pozitivă |
| Completare ciornă | `updateDraftExpenseAction` | `canManageFarm(user, existing.farmSlug)` | — (citirea codului) | ✅ cod |
| Declarare teren | `teren-actions.ts` `declareLandAction` | `canManageFarm(user, farmSlug)` | `teren: …` | ✅ refuzat |
| Date de plată / IBAN | `plati-actions.ts` | `canManageFarm` + ADR-009 | `e2e/iban.spec.ts` (altă gospodărie) | ✅ refuzat |
| „Nu am cerut eu” | `reportUnrequestedIbanAction` | `canManageFarm` | — (citirea codului) | ✅ cod |
| Confirmare avans primit | `setFeedReceivedAction` → `orders.ts` | `canManageFarm(user, lot.farmSlug)` (din comandă) | — | ✅ cod |
| Anulare tură | `livrari-actions.ts` → `cancelTour` | `canManageFarm(user, tour.farmSlug)` | `ture: A nu poate anula tura lui B` | ✅ refuzat; + probă pozitivă |
| Etichetă colet | `generateLabel` | `canManageFarm(user, lot.farmSlug)` | — | ✅ cod |
| Tură nouă | `createTour` | `canManageFarm` + fiecare colet aparține gospodăriei | — | ✅ cod |
| Traseu, cerere PIN, acces curier | `reorderTour`, `decidePinRequest`, `resetCourierAccess` | `canManageFarm(user, tour.farmSlug)` | `e2e/courier.spec.ts` (resetare) | ✅ cod |
| Lot nou / modificare / pornire țarc | `loturi-actions.ts` | `canManageFarm` (farmSlug / `lot.farmSlug`) | — | ✅ cod |
| Jurnal de creștere | `jurnal-actions.ts` | `canManageFarm(user, lot.farmSlug)` | — | ✅ cod |
| Verificare document, decizie lot, prelungiri | — | doar `admin` | — | ✅ cod |

## 2. Citire

| Cale | Verificarea | Test E2E | Rezultat |
|---|---|---|---|
| `/cont/gospodar?gospodarie=B` | gospodarul vede doar `user.farmSlug` | `citire: …` | ✅ nimic din B |
| `/cont/gospodar/documente?gospodarie=B` | idem | `citire: …` | ✅ |
| `/cont/gospodar/jurnal?gospodarie=B` | idem | `citire: …` | ✅ |
| `/cont/gospodar/ture/<tura B>` | `canManageFarm(user, tour.farmSlug)` → 404 | `citire: …` | ✅ 404 (probă pozitivă: tura proprie 200) |
| `/fisiere/<document B>` | `canViewDocument` | `citire: …` | ✅ 401 |
| `/foto/<poză din jurnalul lui B>` | `canManageFarm` / comandă pe lot | `citire: …` | ✅ 401 |
| `/cont/gospodar/etichete` | filtrează coletele după `canManageFarm` | — | ✅ cod |

## 3. Ce rămâne (schema-țintă, CLAUDE-02)
Criteriul ChatGPT pentru RLS se aplică schemei relaționale, care **nu e încă folosită de aplicație**:
- toate cele 25 de tabele cu `household_id` și relațiile indirecte;
- SELECT / INSERT / UPDATE / DELETE pentru un rol neprivilegiat;
- `SET LOCAL app.household_id` fără scurgere între conexiunile din pool;
- refuz după revocarea mandatului.

Se face o dată cu migrarea (CG-08), în `verification/concurrency-and-rls.mjs`. Azi e dovedit doar SELECT pe
`production.lots`.
