# Verificare C1 (#83): atomicitatea rezervării de locuri și imaginea comenzilor

Data: 26.11.2026. Mandat: #62, comentariul 7186521414 („Verifică C1 #83 atomicitatea rezervării și snapshot-ul înainte de
tranzacție; benchmark înainte/după”).

## 1. Ce s-a schimbat în #83 (CONFIRMAT-COD `src/server/seats.ts`)
Înainte, imaginea folosită pentru reconciliere era **toată colecția** `preorders`. Acum e formată din:
- comenzile cu `lotCode` = lotul (prin index);
- comenzile ale căror id-uri sunt deja în registrul lotului (`store.get`, pentru anulări și mutări pe alt lot).

## 2. Atomicitatea (analiză + teste)
1. **Unde e protecția.** Invarianta „ocupat ≤ capacitate” e protejată de `store.transact` pe documentul registrului
   (`SELECT … FOR UPDATE`). Reconcilierea și verificarea capacității se fac **în interiorul** lock-ului, pe registrul
   blocat. Imaginea comenzilor e doar o intrare a reconcilierii. Schimbarea ei **nu atinge** lock-ul și nici
   verificarea capacității.
2. **Imaginea e citită înainte de lock, ca și înainte de #83.** O rezervare făcută în paralel, între citirea imaginii
   și lock, nu apare în imagine. Ea e însă **deja în registru**, cu `reservedAt` proaspăt. `reconcile` o păstrează în
   perioada de grație (`!written && fresh` ⇒ păstrată) și o numără la capacitate. Comportamentul e **identic** cu cel
   dinainte, unde imaginea completă era și ea citită înainte de lock.
3. **Comenzi mutate sau anulate.** O comandă din registru mutată pe alt lot nu mai are `lotCode` = lotul, dar e citită
   după id (din registru), deci e văzută ca mutată și eliberată, ca înainte. O comandă anulată cu `lotCode` încă scris
   e citită prin index (`findBy` nu filtrează după stare) și e eliberată, ca înainte.
4. **Singura diferență teoretică** e o comandă care *nu* e în registru și *nu* are lotul scris. Ea nu afectează lotul
   nici înainte, nici acum (`reconcile` adoptă doar comenzile cu `lotCode === code`).
5. **Teste executate** (E2E `overbooking.spec.ts`, verde local pe #83 și în CI):
   - 10 precomenzi simultane pe ultimele locuri ⇒ exact capacitatea;
   - cădere între rezervare și scrierea comenzii (perioada de grație, ambele ramuri);
   - date istorice peste capacitate;
   - 30 de precomenzi simultane ⇒ 40/40;
   - anulare cu realocare.

   Plus garda statică: `seats.ts` nu mai poate citi toată colecția.

**Concluzie: CONFIRMAT.** Atomicitatea e neschimbată. Lock-ul și verificarea sunt aceleași, iar imaginea conține toate
comenzile pe care reconcilierea le poate folosi.

## 3. Benchmark înainte / după (EXECUTAT, `scripts/bench/seats-snapshot.mjs`)
Interogările sunt exact cele din `pg-store`. Condiții: 200.000 de precomenzi pe 500 de loturi (400 pe lot), registru cu
400 de comenzi + 3 rezervări în curs, 20 de rulări, PostgreSQL 16.15 local, fără rețea.

| Imaginea pentru o rezervare | p50 | p95 | Comenzi citite |
|---|---|---|---|
| înainte de #83 (toată colecția) | 383,8 ms | 459,2 ms | 200.000 |
| după #83 (lotul + id-urile din registru) | 2,3 ms | 13,0 ms | 400 |

p95-ul de după include cele 3 citiri după id ale rezervărilor în curs, făcute în paralel. Prin rețea (Vercel → Neon) se
adaugă RTT-ul real, încă nemăsurat, pe fiecare interogare.
