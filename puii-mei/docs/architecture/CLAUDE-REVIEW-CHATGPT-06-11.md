# Review independent Claude — capitolele ChatGPT 06–11 și propunerea de ancorare a auditului

**Context.**
- Data: 25.11.2026.
- Mandat: PR #62, comentariile 7172530372 și 7175659654. Review, nu aprobare.
- Surse: PR #50 (branch `docs/chatgpt-technical-architecture-v1`), capitolele `CHATGPT-06` … `CHATGPT-11`. Cod: `main` la
  `bcbabdc` (după #81).

**Marcaje.**
- **CONFIRMAT-COD**: văzut în cod, cu fișierul indicat.
- **STATIC**: citit în draft.
- **IPOTEZĂ**: nemăsurat.
- **EXECUTAT**: rulat (doar unde e indicat).

**Severitate.**
- **P0**: blochează baseline-ul sau implementarea domeniului.
- **P1**: de rezolvat înainte de capitolul respectiv.
- **P2**: îmbunătățire.

**Aprecierea generală.**
- Capitolul 06 e solid și coerent cu 01–05: registru biologic din evenimente, separarea capacității fizice de cea
  comercială, deficit fără anulare automată, KPI cu numitor explicit.
- Capitolele 07–11 sunt corecte ca direcție, dar **prea concise pentru baseline**. Lipsesc:
  - proprietarul unic al fiecărui tabel;
  - ordinea lock-urilor între domenii;
  - regulile de conservare (bilanț) pentru stoc și genealogie.
- Cele mai importante goluri sunt **între capitole**, nu în interiorul lor.

## 1. Constatări cerute explicit de ChatGPT

### 1.1 Proprietarul obligațiilor financiare

| # | Sev. | Constatare | Dovadă | Propunere | Test |
|---|---|---|---|---|---|
| F1 | **P0** | `payment_obligations` e definit în 07 („Date candidate”) și din nou în 09 („owner de reconciliat cap07”). Două domenii scriu același tabel | STATIC 07 §Date, 09 §Date | **Un singur scriitor.** Commerce creează și anulează obligația, din contract. Finance scrie doar `payment_matches` și verificarea. Starea plătită / neplătită a obligației devine o **proiecție** în Finance, nu o coloană editată de ambele | FIN-T04 + test static: doar `commerce/*` scrie `payment_obligations` |
| F2 | **P0** | Baza onorariului ADR-001 („venituri eligibile − cheltuieli eligibile”) nu spune dacă venitul vine din **plăți verificate** (cash) sau din **valoarea contractuală livrată** (angajamente). Banii nu trec prin platformă, deci platforma vede doar declarații și dovezi | STATIC 09 §Reconciliere; CONFIRMAT-COD: `FeedCell` permite confirmarea avansului de către gospodar/admin, fără extras bancar | Varianta implicită propusă: venit = plăți **confirmate de gospodar și verificate**, net de rambursări, pe ciclu închis. Decizia finală: contabil + fondator | FIN-T01, T09, T10 cu ambele variante |
| F3 | **P0** | **Conflict de interese:** cheltuielile gospodarului scad baza onorariului. 09 are `approve`, dar nu spune **cine**. Un gospodar care își aprobă singur costurile își reduce onorariul | STATIC 09 §Registru, §API | Costul care intră în baza de onorariu cere **aprobare independentă** (finance sau manager zonal cu grant), plus dovadă. Separare `submit` / `approve` impusă și în SQL (`approved_by <> created_by`) | FIN-T12 extins: gospodarul nu poate aproba propriul cost |
| F4 | P1 | **Unitatea de decontare.** 09 spune „per gospodărie/ciclu închis”. Lista de sugestii și ADR-001 spun „per lot”. Notion DEC-001 spune „gospodărie/lot închis” | STATIC 09 §0; `docs/sugestii.md` („Onorariul … per lot”) | **Decizie fondator:** lot sau ciclu. Dacă e ciclul, se precizează cum se compensează un lot pe pierdere cu unul pe profit în același ciclu | FIN-T09 / T10 pe două loturi |
| F5 | P1 | **Sursa tranzacțiilor:** `payment_transactions` presupune un import bancar („external_ref unic per cont”). Contul e al gospodăriei, deci platforma nu are flux bancar | STATIC 09 §Date | Model pe două niveluri: declarație client + dovadă → **confirmare de primire de către gospodar** (as-built) → opțional, mai târziu, import extras, cu acordul gospodăriei. Nu se proiectează în jurul unui import inexistent | FIN-T02 / T03 pe declarații |
| F6 | P1 | **Dublă recunoaștere a costului furajului:** 09 îl înregistrează la cumpărare (`cost_entries`), iar 06 / 10 la consum (`production.inputs` → stoc) | STATIC 06 §7, 09 §Registru, 10 §Aprovizionare | **Un singur punct de recunoaștere:** costul intră în decont la **consum** (alocat pe lot). Cumpărarea crește valoarea stocului, iar furajul nefolosit rămâne stoc | Test: o cumpărare + două consumuri parțiale ⇒ costul pe lot = consumul |

### 1.2 Capacitate față de mortalitate

| # | Sev. | Constatare | Dovadă | Propunere | Test |
|---|---|---|---|---|---|
| C1 | **P0** | **Confirm constatarea din 06 §1:** `reserveSeats` citește **toate** precomenzile (`snapshot()` = `store.list("preorders")`) la fiecare rezervare, înainte de lock. La volum mare, fiecare precomandă citește toată colecția. Mi-a scăpat la C1 (#74) | CONFIRMAT-COD `src/server/seats.ts:18-24` | Imaginea se reduce la comenzile lotului + id-urile din registru (index `lotCode`, `store.get`). **Remediere în PR separat, fără schimbare de business.** Testele existente de concurență (10 și 30 de cereri simultane) trebuie să rămână verzi | E2E `overbooking.spec.ts` (EXECUTAT pe main: verde) |
| C2 | **P0** | **Cine pierde la mortalitate?** As-built leagă comenzile de țarcuri în ordinea creării (`orderPens`). Mortalitatea e raportată pe țarc. 06 §5 spune „plan de rezolvare autorizat”, fără o regulă implicită deterministă. Fără ea, două persoane rezolvă diferit același deficit | CONFIRMAT-COD `src/lib/order-pens.ts`; STATIC 06 §5 | Regulă implicită **propusă**, de aprobat de fondator: deficitul se absoarbe întâi din bufferul lotului, apoi se distribuie **proporțional** pe comenzile cohortei afectate, cu propunere de substituire din alt țarc sau lot. Nu se aplică „ultima comandă pierde” | PROD-T08 extins: 3 comenzi, mortalitate 10% pe un țarc ⇒ distribuție determinată și auditată |
| C3 | P1 | **Plafonul comercial nu scade automat** când efectivul viu scade. Formula din 06 §5 folosește un plafon aprobat, deci se pot vinde unități care nu mai există | STATIC 06 §5 | `vandabil = min(plafon_aprobat, efectiv_viu_proiectat − buffer) − rezervate − onorate`. Când rezultatul ≤ 0, **se închid vânzările noi** pe cohortă (nu e anulare). Bufferul rămâne DESCHIS (specialist) | PROD-T04 + T08 combinate |
| C4 | P1 | `population_balances.live_count CHECK >= 0`, dar 06 §6 spune că evenimentul real care depășește efectivul intră în incident. Nu e spus dacă evenimentul intră în sold. Dacă nu intră, soldul minte; dacă intră, CHECK-ul pică | STATIC 06 §6, §10 | Evenimentul în `pending_review` **nu** intră în sold. Soldul are un câmp separat `unreconciled_loss`, iar vânzările se închid cât timp există pierderi nereconciliate. Așa nu se pierde informația și nu există număr negativ | PROD-T09 |

### 1.3 Genealogie (08)

| # | Sev. | Constatare | Propunere | Test |
|---|---|---|---|---|
| G1 | **P0** | Graful `nodes` / `edges` are cantități, dar **nicio regulă de conservare**: ieșirile unui nod pot depăși intrările. Recall-ul și randamentul devin nesigure | Bilanț pe nod: Σ ieșiri ≤ Σ intrări × factorul de conversie versionat (kg viu → carcasă, din procesare). Diferența e pierdere declarată. Verificarea are loc la scrierea muchiei, în tranzacție, cu lock pe nodul sursă | TRC-T02 / T05 + muchie care depășește ⇒ 422 |
| G2 | P1 | **Muchii între tenanți** (procesator terț, tur cu mai multe gospodării, transfer): RLS pe un singur `household_id` nu poate arăta ambelor părți propria jumătate | Muchia are `from_household` și `to_household`. Fiecare parte vede muchia, dar nu și nodurile celeilalte (proiecție). Se leagă de R07 (scope ca listă) | TRC-T11 cu două gospodării |
| G3 | P2 | 08 cere QR public opac. As-built folosește codul lotului în URL-ul public (`/trasabilitate/[cod]`), deci lista loturilor e enumerabilă | CONFIRMAT-COD `src/app/(site)/trasabilitate/[cod]/page.tsx` (`generateStaticParams` pe toate loturile). Risc mic (date publice), dar în conflict cu 08 | Decizie: codul lotului e public intenționat, sau QR opac. Dacă e QR opac: alias aleator per publicare |

### 1.4 Stoc (10)

| # | Sev. | Constatare | Propunere | Test |
|---|---|---|---|---|
| S1 | **P0** | 10 definește doar `stock_movements`. „Disponibil = on_hand − rezervat − blocat” calculat prin SUM pe mișcări nu poate fi protejat la consumuri simultane fără un rând de blocat | Tabel `stock_balances(batch_id, location_id, household_id, on_hand, reserved, blocked, version)`, actualizat în aceeași tranzacție cu mișcarea, cu lock pe rând. Ordinea lock-urilor pe (batch, locație) crescător. La fel ca registrul biologic: realitatea fizică se înregistrează, iar lipsa devine incident | LOG-T04 cu 50 de consumuri simultane pe același batch |
| S2 | P1 | „Proprietar și custode distincte”, dar fără regulă pentru cine suportă costul și pentru ce se întâmplă cu stocul unei gospodării care iese din program | Proprietarul determină costul (F6). Ieșirea din program: inventar final + transfer sau retur documentat (05 §11) | LOG-T13 |

### 1.5 Gate de conformitate sub concurență (11)

| # | Sev. | Constatare | Propunere | Test |
|---|---|---|---|---|
| Q1 | **P0** | „Revalidare în tranzacție” nu e suficient: un hold creat **în paralel** cu o alocare poate trece (TOCTOU) dacă cele două tranzacții nu se blochează reciproc | Rând `compliance_state(household_id, scope, version)`. Comenzile operaționale îl citesc cu `FOR SHARE`, iar crearea unui hold îl ia cu `FOR UPDATE`. Hold-ul așteaptă alocarea în curs (care apoi apare în raportul hold-ului), sau alocarea vede hold-ul. Alternativ, `SERIALIZABLE` doar pe aceste comenzi, cu retry | CMP-T03 extins: hold + alocare simultane, 100 de repetări ⇒ niciodată alocare după hold fără semnalare |
| Q2 | P1 | Expirarea „calculată la acțiune” cu ceasul aplicației | Momentul de referință e `now()` din tranzacția PostgreSQL, nu ceasul serverului aplicației | CMP-T03 |
| Q3 | P1 | As-built nu are un gate centralizat. Expirarea documentelor produce doar alerte (#67), iar regimul gospodăriei blochează vânzarea doar la suspendare / excludere | CONFIRMAT-COD `src/server/document-alerts.ts`, `src/app/(panou)/cont/gospodar/page.tsx` (`blocked = standing …`) | Inventarul punctelor în care gate-ul trebuie chemat: deschidere lot, alocare, procesare, livrare. Până la implementare, rămâne o **lacună cunoscută**, nu o funcție existentă |

### 1.6 Contract (07)

| # | Sev. | Constatare | Dovadă | Propunere |
|---|---|---|---|---|
| K1 | **P0 juridic** | 07 numește compania „mandatar”. Contractul as-built o numește „Consultant” și spune că „nu încasează prețul și nu vinde produsul”. DEC-003: compania facturează servicii gospodăriei | CONFIRMAT-COD `src/components/orders/ContractDocument.tsx:43, :63, :86` | Un singur rol juridic, ales de jurist (consultant / mandatar / intermediar). Textul contractului și capitolele se aliniază după decizie |
| K2 | P1 | Contractul trebuie versionat și cu hash (07). As-built: acordul la termeni e o bifă la precomandă, fără versiunea textului acceptat | CONFIRMAT-COD formularul de precomandă (`termsConsent`) | Se salvează `termsVersion` + hash-ul textului la acceptare, înainte de orice flux real. Fără schimbare de business, se face în PR separat după decizia K1 |

### 1.7 API (06–11)

| # | Sev. | Constatare | Propunere |
|---|---|---|---|
| A1 | P1 | Capitolele definesc REST `/api/v1/*`. As-built folosește **server actions** pentru tot ce ține de UI; în `src/app/api` există doar rutele `admin`, `cron`, `loturi` (CONFIRMAT-COD) | Decizie de arhitectură: server actions pentru UI și REST doar pentru integrări, AI și sincronizarea offline. Ambele chemă **aceleași comenzi de domeniu** (un singur handler) |
| A2 | P1 | Codurile de eroare nu sunt uniforme (de ex. `403 POLICY_DENIED/HOLD` în 06, `403 hold` în 07 / 10 / 11; `422 INVALID_UNIT` față de `422 invalid unit`) | Catalog unic RFC 9457 (`application/problem+json`) cu coduri stabile, în cap. 13 |
| A3 | P1 | `Idempotency-Key` și `clientEventId` apar amestecat | `clientEventId` = identitatea faptului (offline, se păstrează pentru totdeauna); `Idempotency-Key` = reîncercarea cererii (TTL). Ambele, cu semantica scrisă |

## 2. Tranzacții multi-tenant, ordinea lock-urilor, snapshot, chei, recuperare

1. **Ordinea canonică a lock-urilor (propusă):**
   1. `compliance_state`;
   2. lot / cohortă / unitate;
   3. registrul de capacitate;
   4. comenzile (după id crescător);
   5. alocările;
   6. soldurile de stoc ((batch, locație) crescător);
   7. **lanțul de audit, ultimul.**

   As-built respectă deja „auditul ultimul” (`src/server/audit.ts`: `appendAudit` după `fn()`, CONFIRMAT-COD). Pentru
   tranzacții care ating **două gospodării** (transfer, tur comun), lanțurile se blochează în ordinea `household_id`
   crescătoare. Altfel apare deadlock la lanțurile pe gospodărie.
2. **Tranzacții între tenanți:** o singură tranzacție PostgreSQL (monolit modular), două evenimente de audit (câte unul
   în fiecare lanț) cu același `correlation_id`. Fără saga.
3. **Snapshot consistent pentru manifest:** cu lanț pe gospodărie, `seq` e atribuit sub lock-ul gospodăriei, deci în
   interiorul unui lanț ordinea `seq` = ordinea commit-ului. Ultima amprentă din fiecare lanț e consistentă. **Între
   lanțuri însă, un `seq` mai mic poate face commit după unul mai mare.** Manifestul nu trebuie să folosească
   „seq maxim global” ca watermark. Folosește pentru fiecare lanț perechea (count, head), citită într-o tranzacție
   `REPEATABLE READ`.

## 3. Critica propunerii de ancorare (lanț pe gospodărie + lanțuri globale tipizate + manifest + Merkle + ancoră externă)

**Direcția e corectă.** Datele C3 (EXECUTAT, cu RTT simulat) arată că lanțul pe gospodărie elimină gâtuirea:
30 → 724 ops/s la 10 ms și 90 de cereri simultane. Puncte de completat înainte de orice implementare:

1. **Fereastra neancorată.**
   - Între două manifeste, un actor cu drepturi de superuser pe bază poate rescrie coada unui lanț nedetectat.
   - Trebuie declarate durata ferestrei (propun 5 minute) și riscul rezidual.
   - Pentru evenimentele critice (schimbare IBAN, eliberare hold, decont), **ancorare imediată**: manifest forțat după commit, prin outbox.
2. **Dispariția sau trunchierea unui lanț.**
   - Manifestul conține **inventarul complet** al lanțurilor (`chain_id`, `count`, `head`, `interval`).
   - Verificarea compară manifestul N cu N−1: niciun lanț nu dispare, `count` nu scade, `head`-ul vechi e strămoș al celui nou.
   - **Un lanț nou trebuie să apară întâi într-un manifest** înainte să fie considerat valid.
3. **Chei.**
   - Cheia de semnare a rădăcinii Merkle nu stă în baza de date și nici în variabilele aplicației care scrie auditul (separare de rol): un serviciu sau un job separat, cu `key_id` în manifest.
   - Rotația păstrează cheile publice vechi pentru verificare.
   - O cheie compromisă invalidează doar manifestele de după compromitere, dacă ancora externă e independentă.
4. **Ancora externă independentă, fără cost:**
   - **OpenTimestamps** (gratuit, rădăcina ajunge în Bitcoin);
   - sau un timestamp RFC 3161 de la o autoritate gratuită;
   - sau o publicare zilnică a rădăcinii într-un loc pe care operatorul bazei nu îl controlează.

   Un repository din aceeași organizație **nu** e independent.
5. **Recuperare.**
   - Un restore PITR readuce lanțurile la un punct anterior, iar manifestele ancorate mai noi vor arăta „trunchiere”. E corect să fie așa.
   - Procedura: eveniment `system.restore` care declară punctul, re-ancorare, reconcilierea scrierilor pierdute (DEC-010 DESCHIS).
   - Verificatorul trebuie să accepte o trunchiere **declarată și semnată**, nu una tăcută.
6. **GDPR.**
   - Hash-ul acoperă doar date pseudonimizate (as-built: IP-ul e amprentat, iar redactarea e în `audit-core.ts`, CONFIRMAT-COD).
   - Datele personale stau în afara evenimentului, deci ștergerea lor nu rupe lanțul.
7. **Lanțuri globale tipizate** (evenimente de sistem fără gospodărie): rămân pe un lock global, dar volumul e mic. Benchmark-ul C3 trebuie rulat și pe acest amestec.
8. **Integritatea nu e garantată înainte de ancorare.** De acord cu ChatGPT. Afirmația trebuie să apară și în constituție, nu doar în capitol.

## 4. Remedieri propuse fără schimbare de business (de executat de Claude, PR-uri separate)
- **C1:** imaginea precomenzilor din `reserveSeats` / `setLotCapacity` / `seatViolations` se reduce la lot și registru. Cu `overbooking.spec.ts` + benchmark.
- **K2:** după decizia K1, se salvează versiunea și hash-ul termenilor acceptați.

## 5. Decizii pentru fondator (din acest review)
1. F2: baza onorariului: plăți verificate (propus) sau valoare contractuală.
2. F4: decontare pe lot sau pe ciclu.
3. F3: cine aprobă cheltuielile care intră în baza onorariului.
4. C2: regula implicită la deficit din mortalitate (propus: buffer, apoi proporțional, cu propunere de substituire).
5. K1: rolul juridic al companiei în contract (consultant / mandatar), cu jurist.
6. G3: codul lotului public sau QR opac.
7. A1: server actions + REST doar pentru integrări / offline.
