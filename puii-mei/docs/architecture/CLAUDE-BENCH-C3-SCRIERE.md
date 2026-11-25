# C3: benchmark de scriere cu audit (baseline pentru lock-ul global)

Data: 25.11.2026. Mandatul: PR #62 (consolidare), punctul R09 din review-ul #75. **Rezultatele sunt măsurători
executate**, în condițiile declarate mai jos. Nu sunt prognoze pentru producție.

## Metodă
- Script: `scripts/bench/write-audit.mjs`. Reproductibil, rulează doar pe o bază de test goală.
- **Operația măsurată** e exact SQL-ul aplicației (`src/server/db/pg-store.ts`), într-o singură tranzacție:
  1. `SELECT … FOR UPDATE` pe document;
  2. `UPDATE`;
  3. `SET LOCAL lock_timeout = '3s'`;
  4. `pg_advisory_xact_lock(424242)`;
  5. citirea ultimului hash din lanț;
  6. `INSERT` în `audit_events`;
  7. `COMMIT`.
- **Variante comparate:**
  - **global** = implementarea actuală;
  - **pe-gospodarie** = lock și lanț pe gospodărie (`pg_advisory_xact_lock(424242, hashtext(gospodărie))`, ultimul hash al gospodăriei).
- **Date:** 1.000 de documente, 100 de gospodării, 400 de operații pe nivel. Concurență 1 / 10 / 50 / 90 (pool egal cu concurența).
- **RTT simulat:** 0 / 2 / 10 ms pe fiecare interogare (o așteptare în aplicație înaintea fiecărui query). E o **simulare
  declarată** a latenței aplicație ↔ bază. Latența reală Vercel ↔ Neon nu a fost măsurată.
- **Mediu:** PostgreSQL 16 local, 4 nuclee, Node 22. Latența e măsurată în client, pe operație. Fără cold start.
- **Integritate:** după fiecare rulare se verifică lanțul (`prev_hash` = amprenta evenimentului anterior: global,
  respectiv pe gospodărie). **0 rupturi în toate rulările.**

## Rezultate (executate, 25.11.2026)

| Variantă | RTT | Concurență | ops/s | p50 ms | p95 ms | p99 ms | Erori |
|---|---|---|---|---|---|---|---|
| global | 0 | 1 | 599 | 1,4 | 3,0 | 4,8 | 0 |
| global | 0 | 10 | 1022 | 8,9 | 15,9 | 21,0 | 0 |
| global | 0 | 50 | 849 | 48,5 | 102,8 | 127,4 | 0 |
| global | 0 | 90 | 827 | 82,5 | 177,8 | 211,0 | 0 |
| pe-gospodarie | 0 | 1 | 766 | 1,2 | 2,3 | 3,0 | 0 |
| pe-gospodarie | 0 | 10 | 3045 | 2,8 | 5,8 | 12,9 | 0 |
| pe-gospodarie | 0 | 50 | 2310 | 15,9 | 63,9 | 80,1 | 0 |
| pe-gospodarie | 0 | 90 | 1683 | 42,5 | 160,8 | 184,2 | 0 |
| global | 2 | 1 | 49 | 20,3 | 21,4 | 22,3 | 0 |
| global | 2 | 10 | 121 | 81,9 | 88,4 | 110,2 | 0 |
| global | 2 | 50 | 118 | 404,9 | 476,8 | 753,1 | 0 |
| global | 2 | 90 | 118 | 714,8 | 1012,8 | 1441,8 | 0 |
| pe-gospodarie | 2 | 1 | 49 | 20,2 | 21,5 | 22,7 | 0 |
| pe-gospodarie | 2 | 10 | 477 | 20,4 | 25,2 | 30,5 | 0 |
| pe-gospodarie | 2 | 50 | 1621 | 25,5 | 59,2 | 76,3 | 0 |
| pe-gospodarie | 2 | 90 | 1729 | 34,1 | 131,8 | 150,8 | 0 |
| global | 10 | 1 | 12 | 86,2 | 87,8 | 90,3 | 0 |
| global | 10 | 10 | 30 | 328,9 | 334,7 | 388,7 | 0 |
| global | 10 | 50 | 30 | 1621,0 | 1665,0 | 2845,8 | 0 |
| global | 10 | 90 | 30 | 2827,5 | 3906,6 | 5135,6 | 0 |
| pe-gospodarie | 10 | 1 | 12 | 86,1 | 87,5 | 89,0 | 0 |
| pe-gospodarie | 10 | 10 | 115 | 84,5 | 91,9 | 115,2 | 0 |
| pe-gospodarie | 10 | 50 | 496 | 87,1 | 140,1 | 153,9 | 0 |
| pe-gospodarie | 10 | 90 | 724 | 91,6 | 153,7 | 184,0 | 0 |

## Ce arată măsurătorile
1. **Lock-ul global are un plafon fix de throughput:** cam 1 / (timpul de ținere a lock-ului ≈ 4 drumuri dus-întors
   + commit).
   - Cu 2 ms RTT simulat, plafonul e **~120 de scrieri/s**.
   - Cu 10 ms, e **~30 de scrieri/s**, indiferent de concurență.
   - Peste plafon, cererile doar stau la coadă: la 10 ms și 90 de cereri simultane, p99 ajunge la **5,1 s**.
2. **Cu lanț pe gospodărie, throughput-ul crește cu concurența:**
   - la 10 ms: de la 30 la **724 ops/s** (×24);
   - la 2 ms: de la 118 la **1.729 ops/s** (×15);
   - p95 rămâne sub 160 ms.
3. **Integritatea lanțului s-a păstrat în toate rulările.** Măsurătorile n-au produs niciun `lock_timeout`. Totuși, la
   10 ms RTT și 90 de cereri simultane, coada de sub lock-ul global s-a apropiat de pragul de 3 s (p99 total 5,1 s).
   Asta e o **IPOTEZĂ de verificat** pe infrastructura reală: la o deschidere de lot aglomerată, pragul poate fi atins,
   iar atunci tranzacția se anulează (fail-closed), adică precomanda e refuzată.

## Concluzie și propunere (PROPUS, nu implementat)
- **Pentru volumul pilot**, lock-ul global e suficient: câteva scrieri pe minut, mult sub plafon.
- **Pentru volum mare**, lanțul pe gospodărie elimină gâtuirea globală și păstrează integritatea verificabilă pe
  fiecare gospodărie.
- Ce se pierde: **ordinea globală unică** a evenimentelor. Ea se poate recupera prin ancorare periodică: un eveniment
  de sistem care leagă ultimele hash-uri ale tuturor lanțurilor, de exemplu la fiecare minut.
- Cap. 01 §5 (ChatGPT) lasă „partiționarea lanțurilor și ancorarea” **deschise până la demonstrarea integrității**.
  Acest benchmark oferă datele de performanță. Demonstrația de integritate a ancorării și decizia rămân la
  ChatGPT și fondator.
- **Măsurătoare necesară înainte de decizie:** RTT-ul real Vercel (fra1) ↔ Neon, citit din `Server-Timing` pe o cerere
  reală, ca să alegem rândul relevant din tabel.
