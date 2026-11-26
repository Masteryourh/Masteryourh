# Runbook: copii de siguranță și restaurare (C4)

**Stare (26.11.2026):** backup-ul **extern** de producție e **amânat de fondator** („o integrăm mai târziu”). Fără furnizor
nou și fără cost. Până atunci, prima linie e **istoricul inclus în Neon** (restaurare la un moment anterior pe un branch
nou). Runbook-ul descrie procedura și verificarea. Testul automat de mai jos rulează **doar local, pe date sintetice**.

## Reguli
1. **Niciodată restaurare peste baza de producție.** Restaurarea se face într-o bază sau un branch **nou**. Acolo se
   verifică, și abia apoi se decide comutarea.
2. **O copie netestată nu e o copie.** Fiecare copie se verifică prin restaurare izolată și comparație
   (`scripts/backup/restore-check.mjs`).
3. **Auditul trebuie să rămână valid.** După restaurare, lanțul de audit se recalculează integral. Dacă restaurarea
   readuce baza la un moment anterior, evenimentele de după acel moment lipsesc. Lipsa lor se **declară** (eveniment
   de sistem cu momentul restaurării, cf. review #82 §3.5), nu se ascunde.
4. **Datele personale:** copiile conțin date personale. Stocarea, retenția și ștergerea lor sunt DESCHISE (jurist /
   DPO, DEC-010).

## A. Incident: date șterse sau stricate din greșeală (Neon, istoric inclus)
1. Se notează **momentul** de dinainte de incident (din audit: `correlation_id` / `occurred_at` al acțiunii greșite).
2. În consola Neon: **Branches → Create branch** din branch-ul de producție, **la momentul** respectiv (point in time).
   Fereastra de istoric depinde de planul Neon (pe planul gratuit e scurtă, de verificat în consolă).
3. Se verifică branch-ul nou (secțiunea C), cu `RESTORE_SOURCE_URL` = branch-ul nou, rulat de pe un calculator de
   încredere, cu `RESTORE_ALLOW_REMOTE=1` (scriptul citește doar sursa; restaurarea de probă se face pe serverul de
   test din `RESTORE_ADMIN_URL`).
4. **Decizie fondator:** se recuperează doar datele pierdute (export și import țintit, auditat), sau se comută aplicația
   pe branch-ul restaurat (`DATABASE_URL` în Vercel → Redeploy). Comutarea pierde scrierile făcute după momentul
   restaurării: se reconciliază din audit.
5. Se scrie un eveniment de sistem `system.restore` (moment, motiv, cine a decis) și se notează în jurnalul proiectului.

## B. Copie manuală (până la backup-ul extern)
```bash
pg_dump --format=custom --no-owner --file puii-mei-$(date +%F).dump "$DATABASE_URL"
```
Fișierul conține date personale: se păstrează criptat, pe un suport controlat de fondator. Destinația automată e
DESCHISĂ (C4 amânat).

## C. Verificarea unei copii (restaurare izolată)
```bash
RESTORE_SOURCE_URL=postgres://…/sursa RESTORE_ADMIN_URL=postgres://…/postgres node scripts/backup/restore-check.mjs
```
- Face `pg_dump`, apoi `pg_restore` într-o bază nouă (`puii_restore_check_*`).
- Compară fiecare colecție: numărul de documente și amprenta md5 pe id + date.
- Verifică auditul: numărul de evenimente, ultima amprentă și lanțul recalculat integral cu aceeași funcție ca
  aplicația.
- Șterge baza de probă și raportează timpii.
- `RESTORE_SELFTEST=1` strică intenționat un document și un eveniment de audit în baza de probă și confirmă că ambele
  sunt detectate.

## D. Rezultate executate (local, PostgreSQL 16.15, 26.11.2026)
Sursa: baza unei rulări E2E complete (date sintetice: 112 precomenzi, 17 colecții, 314 evenimente de audit).

| Pas | Rezultat |
|---|---|
| `pg_dump` | 1.273 ms, 83 KiB |
| `pg_restore` într-o bază nouă | 103 ms |
| 17 colecții | toate identice (număr + amprentă) |
| Audit | 314 / 314, ultima amprentă identică, lanț valid |
| Autotest (document + audit falsificate) | ambele detectate (auditul rupt la seq 2) |

## E. Deschise
RPO / RTO (DEC-010), destinația externă (furnizor, buget), criptarea copiilor, retenția, frecvența testului de
restaurare pe producție și cine îl rulează.
