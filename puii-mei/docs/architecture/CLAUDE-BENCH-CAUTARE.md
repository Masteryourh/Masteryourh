# Căutarea în precomenzi la volum mare: ILIKE față de index trigram (măsurat)

Data: 26.11.2026. Mandat: #62 („index search doar cu EXPLAIN și benchmark”). **Aplicația nu se schimbă în acest pas.**

## Metodă
- Script: `scripts/bench/search-trgm.mjs`. Rulează doar pe o bază de test goală.
- Interogarea e cea din `pg-store.search` (#81): `ILIKE` pe număr, nume, telefon și e-mail.
- Condiții: 200.000 de precomenzi sintetice, 15 rulări pe termen, PostgreSQL 16.15 local, fără rețea.

## Rezultate (EXECUTAT)

| Variantă | Termen | Rezultate | p50 ms | p95 ms | Acces (EXPLAIN ANALYZE) |
|---|---|---|---|---|---|
| fără index (actual) | „căutătoarea” | 1 | 111,3 | 131,3 | Parallel Seq Scan |
| fără index (actual) | „987 654” | 1 | 101,2 | 108,7 | Parallel Seq Scan |
| fără index (actual) | „PM2611-ZZZ” | 1 | 102,0 | 108,4 | Parallel Seq Scan |
| fără index (actual) | „popescu” (10% din comenzi) | 50 | 106,1 | 134,5 | Parallel Seq Scan |
| index trigram | „căutătoarea” | 1 | 0,3 | 1,0 | Bitmap Heap Scan |
| index trigram | „987 654” | 1 | 0,4 | 0,5 | Bitmap Heap Scan |
| index trigram | „PM2611-ZZZ” | 1 | 0,5 | 1,0 | Bitmap Heap Scan |
| index trigram | „popescu” (10% din comenzi) | 50 | 25,7 | 32,6 | Bitmap Heap Scan |

Cele 4 indexuri trigram (GIN, parțiale pe `preorders`) ocupă **26 MB** la 200.000 de comenzi.

## Concluzie și propunere (PROPUS)
- **Azi** (sute de comenzi), căutarea fără index e instantanee. **Nu e nevoie de index acum.**
- **La zeci de mii de comenzi**, indexul trigram coboară căutarea de la ~100 ms la sub 1 ms pentru termeni rari. Termenii
  foarte frecvenți („popescu”) rămân în jur de 25 ms, pentru că filtrul trebuie aplicat apoi pe mii de rânduri.
- **Condiții pentru activare:**
  1. extensia `pg_trgm` (disponibilă pe Neon, se activează o singură dată, cu dreptul owner-ului);
  2. indexurile create `CONCURRENTLY` (fără blocarea scrierilor);
  3. pentru căutarea „doar cifre” a telefonului (`regexp_replace`), un index trigram pe **aceeași expresie** (cel pe
     telefonul brut nu acoperă varianta fără spații);
  4. pragul de activare se decide pe date: după `/admin/diagnostic` și după volumul real.
