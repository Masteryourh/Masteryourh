# CLAUDE — AUD-001 implementat pe codul actual (etapa 1)

**Data:** 24.11.2026 · **Răspunde la:** `AUD-001-FORENSIC-AUDIT-TRAIL.md` (ChatGPT, PR #63) · **Cod:** PR `claude/aud-001-audit`
**Regulă:** ce nu e acoperit e scris explicit la §5. Nu declar „audit complet” acolo unde nu e.

## 1. Ce s-a construit
| Element | Fișier | Ce face |
|---|---|---|
| Tabel `audit_events` | `src/server/db/pg-store.ts` | tabel separat, **doar adăugare**: un trigger refuză UPDATE / DELETE / TRUNCATE (AUD-INV-03); indexuri pe gospodărie, actor, resursă, corelare |
| Lanț de amprente | `audit-core.ts` + `pg-store.ts` `auditAppend` | `event_hash = sha256(prev_hash ‖ JSON canonic)`; blocare consultativă pe tranzacție, deci ordinea e deterministă și sub concurență |
| Bloc atomic | `pg-store.ts` `atomic` (AsyncLocalStorage) | toate scrierile din bloc, inclusiv cele din repository-urile existente, folosesc **aceeași tranzacție**; `transact` imbricat se alătură ei |
| Serviciu central | `src/server/audit.ts` | `audited` / `auditedAction`: **actorul, rolul, gospodăria lui se iau din sesiune** (AUD-INV-02); `workspace` e fixat în cod după locul acțiunii; IP pseudonimizat (HMAC); user agent scurtat |
| Fail closed | `audited` + `lock_timeout 3s` | modificarea și evenimentul în **aceeași tranzacție**: dacă auditul nu se scrie, modificarea se anulează (AUD-INV-01) |
| Refuzuri | `audited` | eroare aruncată → tranzacția se anulează, apoi se scrie separat un eveniment `refuzat` / `eroare`; eroare întoarsă (ex. „PIN greșit”) → eveniment `refuzat` |
| Redactare | `audit-core.ts` `redact` | doar câmpurile din lista permisă; cheile sensibile (pin, parolă, token, cod, MFA, hash, IBAN, CNP) → `[redactat]`; IBAN-urile din texte → mascate (AUD-INV-04) |
| Evenimente sistem | `systemEvent` | activarea IBAN după 24 h (`bank.change.activated`), alertele de expirare (`document.expiry.reminder`) |

## 2. Inventarul punctelor de scriere (instrucțiunea 1)
**Acțiuni de server: 79 de acțiuni în 28 de fișiere, toate învelite cu `auditedAction`** (numele acțiunii în audit:
`<spațiu>.<domeniu>.<acțiune>`, ex. `household.plati.saveFarmPayment`, `admin.comenzi.confirmIban`).

| Fișier | Acțiuni |
|---|---|
| `(site)/livrare/actions.ts` (curier) | 9 (fără `checkPinRequest`, vezi §5) |
| `(panou)/cont/gospodar/livrari-actions.ts` | 7 |
| `(panou)/admin/investitii/actions.ts` | 6 |
| `(site)/comanda/actions.ts` (client: PIN, plată, anulare, alegere) | 5 |
| `(panou)/cont/gospodar/documente-actions.ts` | 5 |
| `(panou)/admin/utilizatori/actions.ts` (roluri, conturi, MFA) | 5 |
| `(panou)/admin/partner-actions.ts` | 5 |
| `(panou)/cont/gospodar/loturi-actions.ts` | 4 |
| `(panou)/admin/actions.ts` (comenzi, IBAN) | 4 |
| `securitate-actions.ts`, `plati-actions.ts`, `regim-actions.ts` | câte 3 |
| `devino-partener`, `cont` (login, activare), `zone`, `legislatie` | câte 2 |
| `precomanda`, `in-curand`, `contact`, `teren`, `jurnal`, `reset`, `demo`, `preturi`, `storage`, `reminder`, `confirmare`, `evaluare` | câte 1 |

**Scrieri în afara acțiunilor:**
- `repositories/farm-payments.ts` `bySlug`: activarea IBAN la citire. Acum se face în bloc atomic, cu `systemEvent`.
- `api/cron/alerte-documente`: alertele, cu `systemEvent` după rezervarea fiecărei alerte.
- `seats.ts`, `rate-limit.ts`, `order-access.ts`, `mfa.ts`: apelate din acțiuni, deci în tranzacția acțiunii.

## 3. Teste AUD-T (E2E `e2e/audit.spec.ts` + unitare `audit-core.test.ts`)
| ID | Stare | Dovadă |
|---|---|---|
| AUD-T01 | PASS | confirmarea IBAN de către admin: `actorRole=admin`, `workspace=admin`, `onBehalfOfHouseholdId=<gospodăria>` |
| AUD-T02 | PASS | cheltuială adăugată de gospodar: `workspace=household`, `householdId` corect, `changes` redactate |
| AUD-T03 | PASS | cheltuială pentru altă gospodărie → `refuzat`, motiv „Neautorizat”, fără efect |
| AUD-T04 | PASS | tabelul de audit blocat din test → scrierea auditului expiră (3 s), **cheltuiala nu există** (fără mutație orfană) |
| AUD-T05 | PASS | UPDATE / DELETE / TRUNCATE pe `audit_events` → refuzate de baza de date |
| AUD-T06 | PASS | cerere (gospodar) → verificare (admin) → activare (`system`, `bank.change.activated`); contul bancar doar mascat |
| AUD-T07 | SKIP | nu există agenți AI în cod |
| AUD-T08 | PARȚIAL | idempotența rămâne pe mecanismele existente (PIN, locuri, IBAN); fără cheie de idempotență generală pe cerere |
| AUD-T09 | SKIP | nu există încă interfață de investigație / acces la audit pentru utilizatori |
| AUD-T10 | SKIP | exportul dosarului de investigație nu e implementat |
| AUD-T11 | PARȚIAL | `workspace` vine din cod, nu din client (testat indirect în T01 / T02); schimbarea spațiului (NAV-06) nu are încă eveniment separat |
| AUD-T12 | PARȚIAL | corecțiile existente sunt deja evenimente noi (anularea cheltuielii cu motiv, IBAN înlocuit); fără test dedicat |
| AUD-T13 | PASS | ordine `seq` + lanț verificat pe tot jurnalul după suita completă (cereri simultane incluse) |
| AUD-T14 | PASS | căutare în tot jurnalul după IBAN, `scrypt$`, `pin` / `password` / `token` / `code` în clar → 0; plus test unitar |
| AUD-T15 | SKIP | nu există outbox / dispecer de evenimente |
| AUD-T16 | PARȚIAL | lanțul de amprente detectează modificarea / ștergerea / inserarea din mijloc (unitar + E2E). **Nu** detectează ștergerea de la final fără export semnat extern (vezi §5) |

## 4. Rezultate
- Suita E2E completă: **63/63** cu toate acțiunile auditate (inclusiv concurența: 30 de precomenzi simultane, PIN-uri simultane).
- Teste unitare: 59/59.

## 5. Goluri cunoscute (nu declar rezolvat)
1. **Stocarea în fișiere JSON** (doar dezvoltare locală): `atomic` nu are anulare. Producția folosește PostgreSQL.
2. **Proprietarul tabelului** (rolul aplicației) poate șterge triggerul. Separarea rolurilor SQL (aplicație fără drept de DDL, rol de investigații doar-citire) cere o configurare a bazei pe care Neon / Vercel n-o face automat. De făcut la migrare (CG-08).
3. **Export extern semnat** (WORM / object lock) și chei de semnătură separate: neimplementate. Fără ele, cineva cu acces direct la baza de date poate șterge evenimentele de la final.
4. **`checkPinRequest`** (apelat la 4 s de pagina curierului) nu e învelit. Împerecherea prin cerere aprobată nu are eveniment propriu.
5. **Vizualizările** de date sensibile nu sunt auditate. Politica de prag e o decizie deschisă (AUD-001 §8).
6. **Erorile de validare** aruncate (ex. „Lotul nu mai are locuri”) apar ca `eroare`, nu ca `refuzat`.
7. **Retenția și accesul:** nu există încă interfață de căutare / export. Termenele de păstrare și cine are acces se stabilesc cu juristul / DPO.
8. **Gospodăria pentru acțiunile pe obiecte primite prin id** (ex. anularea unei ture): se completează din formular doar când există `farmSlug`. Pentru restul, `householdId` poate lipsi (`resourceId` e prezent). Trebuie completat prin `auditNote` în fiecare acțiune.
