# Review independent Claude: „Room-Based Architecture” → „Information Corridor Architecture” (ICA)

**Data:** 28.11.2026.

**Mandat (#62):**
- comentariul 7241127175: opinie independentă înainte de integrare;
- comentariul 7241178104, clarificarea fondatorului: camera = culoarul către informații, nu un fișier cu date.

**Documente confruntate:**
- **Propunerea:** `CHATGPT-ROOM-ARCHITECTURE-PROPOSAL.md`, branch `docs/chatgpt-technical-architecture-v1`, commit `035b0d7`.
- **Cod:** `main` (`e8b229c`).
- **Reviewuri și PR-uri:** PR50 (cap. 02, 12–16), #82, #84–85 (schema țintă, R01–R07), #100 (review 12–20).

**Statut:** doar review, fără implementare.

**Etichete:**
- **CONFIRMAT-COD**: verificat în fișierul citat.
- **STATIC**: raționament.
- **EXECUTAT**: măsurat.

## 1. Verdict

**Da pentru ICA ca model *logic*. Nu pentru orice formă de „cameră” stocată per utilizator.**

Clarificarea fondatorului rezolvă cea mai mare problemă a variantei inițiale: camera nu mai e un fișier cu datele utilizatorului. Formulată așa, ICA înseamnă:

> fiecare utilizator are un **culoar**: identitate + apartenențe + roluri + scope + preferințe + un catalog de interogări / comenzi permise + proiecții pentru desktop și mobil. Datele stau o singură dată în registre canonice. Autoritatea se calculează pe server din IAM, la fiecare cerere.

Asta e, în fapt, ce aplicația face deja implicit. Ce lipsește este ca lucrul ăsta să fie **explicit, tipizat și testat**. Recomand ICA ca **strat de contracte peste arhitectura existentă**, nu ca schemă nouă sau stocare nouă.

Riscurile reale sunt în trei locuri:
- cum se reprezintă apartenența multiplă (multi-role / multi-household);
- cât de repede se propagă revocarea;
- să nu se materializeze „camere” care duplică date.

## 2. Ce există deja în cod (as-built), din perspectiva ICA

| Element ICA | As-built (CONFIRMAT-COD) | Distanța |
|---|---|---|
| Identitate | `User` (`src/lib/domain.ts:463–480`): `id`, `email`, `phone`, `role`, `farmSlug?`, `status`, `sessionVersion` | **Un singur rol** (`role: UserRole`, `:468`) și **o singură gospodărie** (`farmSlug?`, `:470`) per cont |
| Roluri | `UserRole = "admin" \| "gospodar" \| "investitor"` (`domain.ts:459`); `roleHome` (`src/lib/roles.ts:10–14`) | Lipsesc: manager local, manager zonal, curier ca rol, client cu cont |
| Autoritatea, pe server, la fiecare cerere | `getCurrentUser()` recitește utilizatorul și compară `status`, `sessionVersion`, `role` (`src/server/session.ts:26–32`); `requireUser(roles)` (`:57–60`), folosit în **20** de pagini / layout-uri | Corect ca principiu („IAM pe server, nu fișier editabil”). Lipsește scope-ul teritorial. |
| Scope pe resursă | Verificări ad-hoc pe fiecare funcție, ex. `canViewDocument` (`src/server/documents-access.ts:9–15`: admin / gospodar `farmSlug` / investitor prin investiții) | Logica scope-ului e **împrăștiată**, nu centralizată („Librarian” lipsește ca punct unic de politică) |
| Client | Fără cont: acces la comandă cu număr + PIN SMS → cookie semnat, limitat în timp (`src/server/order-access.ts:40, 111, 148, 167–180`) | Corespunde exact cu „număr / cheie schimbate pe o sesiune limitată” din propunere |
| Curier | Acces per tură, cu PIN, legat de `sessionVersion`-ul turei (`src/server/courier-session.ts:33–48`) | Corespunde cu „courier mobile only” |
| Proiecții per culoar | `adminToday()` (`src/server/admin-today.ts`, #94) și `farmerToday` / `farmerDayItems` (`src/lib/farmer-today.ts`, `src/server/farmer-day.ts`, #95 / #98): proiecții compacte, calculate din registre | **Sunt deja „culoare” ICA**: compacte, mobile-first, cu legătura spre detaliu |
| Catalog de navigare per rol | Elementele barei (`PanelNavItem`) din layout-ul fiecărui spațiu (`src/app/(panou)/admin/layout.tsx`, `cont/gospodar/layout.tsx`) | Catalogul e **cod în layout**, nu un registru de capabilități. Iar navigarea nu autorizează (corect: autorizarea e pe server). |
| Admin panoramic | Admin vede tot (`requireUser` acceptă adminul peste tot, `session.ts:60`) + previzualizare explicită `?gospodarie=` (`cont/gospodar/page.tsx`) | Panorama e **nelimitată**: adminul nu are scope, ci totul |
| „Fără cache autentificat persistent” | PWA fără service worker (#97) | Deja respectat |

**Concluzie.** ICA nu cere rescrierea modelului de date actual. Cere patru lucruri:
- un model de **apartenență** (membership);
- un **punct unic de politică** (Librarian);
- un **registru de interogări / comenzi tipizate per rol**;
- **măsurători de payload**.

## 3. Critica pe punctele cerute

### 3.1 Camera logică vs fișierul fizic
- **Fișier / document fizic per utilizator cu datele lui: NU (P0 dacă s-ar alege).**
  - Duplică înregistrările canonice. O comandă apare în „camera” clientului, a gospodarului, a managerului și a adminului, deci are 4 copii de sincronizat.
  - Pierde atomicitatea: rezervarea locurilor (`seats-core`, `store.transact` FOR UPDATE) nu mai e o singură tranzacție.
  - Face revocarea dependentă de ștergerea copiilor.
  - Clarificarea fondatorului exclude deja varianta asta. O notez ca **regulă de arhitectură**, ca să nu reapară.
- **Configurația culoarului (identitate, preferințe, catalog), stocată: DA, dar fără autoritate.**
  - Preferințele (tema, bara restrânsă / extinsă, ordinea cardurilor) pot fi stocate per utilizator.
  - Rolurile și scope-ul **nu** se citesc din configurație. Se derivă de fiecare dată din registrul IAM (apartenențe + atribuiri).
  - Exemplu as-built corect: preferința barei e în `localStorage`, iar permisiunile sunt pe server (#96).
- **Proiecții materializate per utilizator: NU implicit.** Doar per **agregat partajat**, ex. `/cifre` (#99): un document pentru toți, nu unul per utilizator. Per utilizator, proiecțiile se calculează la cerere din registre, prin indexuri (`farmerDayItems`: 6 citiri indexate).

### 3.2 Ownership: user / household / organizație (P1)
- **Azi:** `User.farmSlug` (un cont = cel mult o gospodărie) și `User.role` (un rol).
- **Realitatea** pe care o descrie fondatorul are cardinalitate mai mare:
  - o gospodărie cu 2–3 membri (soț / soție / fiu);
  - un manager local care e și gospodar;
  - un investitor care e și client;
  - un manager zonal peste mai multe comune.
- **Propunere de model** (aliniat cu R07 din #84 și cu cap. 02):
  - `person` (identitatea, autentificarea);
  - `membership(person, organization|household, role, valid_from, valid_to, granted_by)`;
  - `territory_assignment(person, territory_id, level: comuna|zona, valid_from, valid_to)`.
- **Scope-ul efectiv** = uniunea apartenențelor active, **dar sesiunea lucrează într-un singur context activ odată**, ales explicit („Lucrezi ca: Gospodăria X / Manager comuna Y”).
  - Fiecare scriere poartă contextul activ în audit (`actor`, `on_behalf_of`, `scope`).
  - Asta evită confuzia „am scris ca manager pe datele propriei gospodării”, adică conflictul de interese F3 din #82.
- **Proprietatea înregistrărilor:**
  - înregistrările de producție aparțin **gospodăriei**, nu utilizatorului;
  - comenzile aparțin **clientului** (o persoană sau un client fără cont, identificat prin comandă);
  - documentele aparțin gospodăriei sau investiției.
- **Plecarea unui membru** închide apartenența (`valid_to`). Datele rămân ale gospodăriei, iar auditul păstrează autorul.

### 3.3 Înregistrări partajate între culoare (P1)
- Exemple: o comandă e văzută de client, de gospodărie, de manager și de admin; o tură de livrare de gospodar, de curier și de admin.
- Regula propusă: **o singură înregistrare + reguli de vizibilitate per câmp (field allowlist), per culoar.**
  - Clientul vede statusul, lotul și urmărirea, dar nu IBAN-ul gospodarului și nici ceilalți clienți.
  - Curierul vede doar adresele turei lui, cât timp tura e activă.
- As-built face deja asta ad-hoc:
  - pagina curierului primește doar opririle turei;
  - clientul vede comanda doar cu PIN-ul (`order-access.ts:167`).
- Propun ca allowlist-urile de câmpuri să devină **tipuri de proiecție testate**, de exemplu `OrderForCustomer` sau `OrderForCourier`, cu un test care eșuează dacă apare un câmp nou nelistat.

### 3.4 Autorizare și revocare (P0 la scară, P1 acum)
- **Azi:** fiecare cerere recitește utilizatorul (`session.ts:32`), deci schimbarea rolului, dezactivarea sau resetarea parolei revocă **imediat**. Sesiunea durează 14 zile (`SESSION_DAYS = 14`, `session-token.ts:10`). Corect.
- **Cu ICA plus apartenențe**, revocarea trebuie să fie la fel de imediată pentru o **apartenență** (ex.: managerul local mutat în altă comună). Asta are două consecințe:
  - scope-ul **nu** se pune în cookie; doar `uid` + `sessionVersion`;
  - apartenențele active se citesc la fiecare cerere: o interogare indexată pe `person_id`, cu `valid_to`. La 2 ms RTT (fra1 ↔ eu-central-1, măsurat 26.11) costul e neglijabil.
- **Cache-ul de autorizare:** dacă se adaugă (de ex. 30–60 s), revocarea are o fereastră declarată. Propun **fără cache** până la măsurarea unei nevoi.
- **Mobil „detaliu la cerere cu autorizare automată”** e corect dacă înseamnă că fiecare interogare de detaliu e autorizată pe server la momentul cererii. **Nu** e corect dacă se emit token-uri de detaliu pre-autorizate, valabile mult timp. Propun token-uri scurte, legate de resursă, și doar unde e nevoie de link-uri partajabile (ex. PIN-ul clientului).
- **Adminul panoramic:** recomand ca adminul să **nu** fie „totul fără scope”. Propun:
  - citire globală;
  - scriere numai prin acțiuni cu motiv și audit;
  - pentru acțiunile sensibile (IBAN, decont), aprobare separată (F3 / #82).

  As-built: adminul trece peste orice `requireUser` (`session.ts:60`). E acceptabil la pilot, dar trebuie limitat înainte de manageri.

### 3.5 Performanță și payload (de măsurat, nu de promis)
- **Proiecția compactă mobilă** e deja direcția din #94 / #95: o listă „De făcut azi” + cifre, cu detaliul pe pagina lui.
- **Economia de trafic vine din trei lucruri:**
  - pagini de detaliu separate, fără tabele mari pe ecranul principal;
  - paginare (`store.page`, cursor);
  - componente server (React Server Components): în browser ajunge doar rezultatul, nu datele brute.
- **Ce nu ajută:**
  - încărcarea „camerei” întregi în client;
  - sincronizarea locală a datelor (offline): cost mare de securitate (12-A5 din #100).
- **De măsurat înainte de orice promisiune.** Propun benchmark-ul ICA-B1:
  - bytes pe prima încărcare și pe navigare (RSC payload), p50 / p95;
  - număr de interogări pe cerere, pentru Astăzi (admin), gospodar Azi, comanda clientului și tura curierului;
  - măsurat pe telefon emulat cu rețea 3G.

  Nu dau cifre estimate ca fapte.
- **Punct concret de corectat** înainte de orice extindere (14-C2 din #100): layout-ul Admin citește integral 3 colecții la fiecare cerere (`src/app/(panou)/admin/layout.tsx:14–16`). Într-un model cu „panoramă”, asta crește liniar cu volumul.

### 3.6 Concurență
- ICA nu schimbă modelul de concurență: scrierile trec tot prin serviciile de domeniu, cu tranzacții și blocări:
  - `store.transact` FOR UPDATE pentru locuri, PIN, outbox, digest;
  - lacătul auditului.
- **Riscul introdus de ICA** e o cale de scriere „din cameră”: de exemplu, preferințe sau note scrise direct în configurația culoarului care ajung să influențeze date de domeniu. **Regula propusă:** configurația culoarului conține doar date de prezentare. Tot ce are efect de domeniu trece prin comenzi tipizate, idempotente (cap. 13) și auditate.
- **Comenzile simultane din mobil și de pe desktop** ale aceluiași utilizator: versiune așteptată (`If-Match` / `expectedVersion`) la editări și chei de idempotență la creări.

### 3.7 Migrare
- **Faza 1 nu are nevoie de schemă nouă.** Ajunge un registru de proiecții și comenzi în cod, plus testele lui. Modelul de apartenență poate fi întâi un document `memberships` în JSONB, peste `User`, cu un adaptor: dacă `User.farmSlug` există, rezultă o apartenență implicită.
- **Migrarea relațională** (`membership`, `territory_assignment`) intră în schema țintă (#84 / #85). Depinde de 17-F3 din #100: rol de migrare separat de runtime. Nu înainte.
- **Compatibilitate:**
  - `requireUser(roles)` rămâne;
  - în interior consultă apartenențele;
  - rutele, `roleHome` și navigarea nu se rup.

### 3.8 Cost
- **Infrastructură:**
  - **zero cost nou** în fazele 0–2 (aceeași bază, aceleași funcții);
  - o interogare indexată în plus pe cerere (apartenențele);
  - stocarea doar a preferințelor.
- **Efort** (estimări, nu angajamente; cu teste, fără UI nou complex):

  | Pas | Conținut | Efort estimat |
  |---|---|---|
  | 0 | Inventar exact rute / acțiuni / scope-uri (as-built → ICA) | 0,5–1 zi |
  | 1 | Registru de proiecții tipizate + teste de allowlist (client, curier, gospodar, admin) | 2–3 zile |
  | 2 | Librarian: punct unic de politică (`canRead` / `canCommand`) înlocuind verificările împrăștiate, fără schimbare de comportament (teste de regresie existente + IDOR) | 3–5 zile |
  | 3 | Apartenențe (JSONB) + context activ + audit `on_behalf_of` + revocare imediată, cu teste | 3–4 zile |
  | 4 | Roluri noi: manager local / zonal, cu teritorii și culoarele lor (Azi pentru manager, justificări) | 5–8 zile |
  | 5 | Benchmark ICA-B1 (payload / interogări pe telefon emulat) | 1 zi |

## 4. Riscuri

| ID | Risc | Severitate | Atenuare |
|---|---|---|---|
| ICA-R1 | „Camera” materializată per utilizator duce la copii divergente ale aceleiași comenzi sau loturi | **P0** (dacă se alege) | Regulă: date canonice o singură dată; proiecții la cerere; materializare doar pe agregate partajate (#99) |
| ICA-R2 | Autoritatea citită din configurația culoarului (editabilă) | **P0** | Rolurile și scope-ul doar din IAM, la fiecare cerere; configurația doar pentru prezentare; test că modificarea configurației nu schimbă accesul |
| ICA-R3 | Multi-role fără context activ înseamnă scrieri ambigue (manager pe propria gospodărie) | P1 | Context activ explicit + audit `on_behalf_of` + separarea atribuțiilor (F3) |
| ICA-R4 | Revocare întârziată prin cache sau token-uri lungi de detaliu | P1 | Fără cache de autorizare; token-uri scurte legate de resursă |
| ICA-R5 | Admin „panoramic” fără limite de scriere | P1 | Citire globală; scriere cu motiv + audit; aprobare separată pentru acțiunile sensibile |
| ICA-R6 | Librarian implementat ca serviciu singleton, devenind gâtuire și punct unic de cădere | P1 | Librarian = **bibliotecă de politică în proces**, apelată de fiecare executor de domeniu, nu un serviciu de rețea |
| ICA-R7 | Allowlist-uri de câmpuri nemenținute: câmpuri noi expuse implicit | P1 | Tipuri de proiecție + test „câmp nou nelistat eșuează” |
| ICA-R8 | Promisiuni de economie de trafic nemăsurate | P2 | Benchmark ICA-B1 înainte de comunicare |
| ICA-R9 | Clientul cu aplicație opțională + cheie: cheia în URL / loguri | P1 | Cheia doar schimbată pe o sesiune scurtă (ca PIN-ul de azi, `order-access.ts:111–148`); niciodată în URL persistent sau în loguri |

## 5. Alternative comparate

| Varianta | Pentru | Contra | Recomandare |
|---|---|---|---|
| A. Fișier / document per utilizator cu datele lui | Simplu de imaginat; o citire | Duplicare, sincronizare, revocare, atomicitate pierdută | **Respinsă** |
| B. Proiecții materializate per utilizator (read-model per user) | Citire foarte rapidă | Cost de scriere × număr de culoare; invalidare complexă; datele vechi | Doar pentru agregate partajate (`/cifre`) |
| C. **ICA logică:** culoar = context IAM + catalog tipizat + proiecții la cerere din registre canonice | Fără duplicare; revocare imediată; compatibilă cu as-built | Cere disciplină: allowlist-uri, Librarian, teste | **Recomandată** |
| D. Doar RLS în baza de date, fără strat ICA | Garanție în DB | Nu rezolvă proiecțiile, payload-ul sau catalogul per rol; RLS e gate G1, separat | **Complementară** cu C (C în aplicație + RLS ca plasă de siguranță, #84) |

## 6. Pași propuși (după aprobarea fondatorului)

1. **ADR-ICA-001:** adoptarea variantei C, cu regulile ICA-R1 și ICA-R2 ca invariante.
2. **Pasul 0 (inventar)** și **pasul 5 (benchmark ICA-B1)** primele. Ambele sunt doar citire și măsurare, fără schimbări de comportament.
3. **Pasul 1** (proiecții tipizate) și **pasul 2** (Librarian ca bibliotecă de politică), cu regresie completă (suita E2E de 82 de teste + IDOR).
4. **Pasul 3** (apartenențe + context activ), apoi **pasul 4** (manageri local / zonal), legate de distribuția sarcinilor (12-A2 din #100).
5. **Migrarea relațională** a apartenențelor: doar după 17-F3 (rol de migrare separat) și R01–R07 (#84).

## 7. Teste de acceptare propuse (neexecutate)

- **ICA-T01:** culoarul clientului nu conține câmpuri nelistate (IBAN, alți clienți, telefonul gospodarului).
- **ICA-T02:** un gospodar cu 2 gospodării și context activ A nu poate scrie în B fără schimbarea explicită a contextului.
- **ICA-T03:** revocarea apartenenței e efectivă la următoarea cerere (fără așteptare).
- **ICA-T04:** modificarea configurației culoarului (preferințe) nu schimbă accesul.
- **ICA-T05:** un manager local vede doar comuna lui; mutat în altă comună, nu mai vede comuna veche.
- **ICA-T06:** adminul scrie doar cu motiv; acțiunile sensibile cer o a doua aprobare.
- **ICA-T07:** o singură înregistrare a comenzii în bază, oricâte culoare o văd (nicio copie).
- **ICA-T08:** detaliul mobil autorizat la fiecare cerere; un token de detaliu expirat sau revocat e refuzat.
- **ICA-T09:** payload și număr de interogări în pragurile aprobate după baseline (ICA-B1).
- **ICA-T10:** regresie: toate rutele existente și E2E rămân verzi.

## 8. Ce NU am făcut

- Nu am implementat nimic din ICA.
- Nu am modificat schema, producția sau fișierele `CHATGPT-*`.
- Estimările de efort sunt orientative.
- Nu am măsurat încă payload-ul (ICA-B1). E primul pas propus.
