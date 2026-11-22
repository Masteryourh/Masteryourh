# CLAUDE — PUII MEI: audit „as-built” și arhitectură tehnică (versiune independentă)

**Autor:** Claude Code · **Scop:** versiune separată pentru comparație cu `CHATGPT-TECHNICAL-ARCHITECTURE-V1.md` (PR #50).
Fișierele și branch-ul ChatGPT nu sunt atinse. Aceasta e **prima livrare** (auditul complet al codului), nu specificația integrală.

---

## Partea 00 — Audit „as-built”

**Versiune:** 0.1 · **Data:** 22 noiembrie 2026 · **Autor:** Claude Code (implementatorul codului auditat)
**Bază:** cod la commit `a691fd4` (ramura `claude/puii-mei-website-cow4ch`, = `main` + PR #48), documentele
`docs/architecture/00-SYSTEM-CONSTITUTION.md`, `01-BUSINESS-ARCHITECTURE.md`, `MASTER-TECHNICAL-SPECIFICATION.md`,
`docs/audit/REAUDIT-2026-11-22.md`, `docs/plan-platforma.md`, `docs/sugestii.md`.
**Statut:** DRAFT pentru comparație cu varianta GPT și pentru revizuirea Product Owner. Nu este certificare de producție.

> Convenții (aceleași ca în constituție): **[CONFIRMAT]** = decis de Product Owner sau scris în documentele aprobate;
> **[COD]** = există în cod, verificat de mine (nu înseamnă că e și decizie de business); **[PROPUS]** = recomandarea mea;
> **[DESCHIS]** = cere decizie sau validare externă. Fiecare afirmație despre cod are fișierul sursă.

---

## 1. Metodă

1. Inventar automat: toate `page.tsx`, `route.ts`, server actions (`"use server"`), colecțiile din `DocumentStore`,
   tipurile din `src/lib/domain.ts`, constantele din `src/lib/*.ts`.
2. Control de acces: pentru fiecare acțiune, ce gardă se apelează (`requireAdmin`, `requireRole`, `canManageFarm`,
   `requireOrderAccess`, `courierAuthorized`, token) și dacă se verifică și **obiectul** (gospodăria / comanda / tura).
3. Comparare cod ↔ constituție ↔ arhitectura de business → lista de contradicții (§9).
4. Teste executate la data auditului (§8): `npm run lint`, `npm run typecheck`, `npm test` (15), `npm run build`,
   E2E Playwright (14) local și în GitHub Actions (run 45067561639, ambele joburi verzi).

**Limite:** nu am acces la baza Neon de producție (date reale) și nici la site-ul live din mediul de lucru; constatările
despre producție vin din API-ul Vercel (variabile de mediu, starea deploy-urilor) și din confirmarea Product Owner.

---

## 2. Rezumat executiv

Platforma există ca **monolit Next.js 16** (App Router, server actions), cu **un singur depozit de date generic**
(`documents(collection, id, data JSONB)`), **4 roluri cu cont** (admin, gospodar, investitor + adminul din variabilele
de mediu) și **2 tipuri de acces fără cont** (client cu număr + PIN, curier cu link + PIN). Funcțional acoperă deja
lanțul precomandă → alocare pe lot / țarc → creștere monitorizată → etichetă QR → tură de livrare → confirmare client,
plus registrul fiscal al gospodăriei, investiții cu rambursare și pagini publice de transparență.

**Puncte tari:** fluxuri cap-coadă funcționale; jurnal append-only pentru creștere și livrare; control de acces pe server
la fiecare acțiune; registru fiscal cu ciornă → confirmare → anulare cu motiv; CI cu E2E.

**Slăbiciuni structurale (blochează scalarea și pilotul real):**
- date în JSONB fără relații, FK, tranzacții, indexuri pe câmpuri (fiecare citire încarcă toată colecția);
- fișiere (poze, documente) stocate Base64 în baza de date;
- „gospodăria” e identificată prin `slug` text; un utilizator gospodar are **o singură** gospodărie;
- reguli de business ca **constante în cod** (40 pui/țarc, 170 m², 60 zile etc.), nu configurație versionată;
- modelul juridic din cod (contract tripartit cu ECORATE ca a treia parte) **contrazice** arhitectura de business (§9);
- notificările (email/SMS) sunt neconfigurate în producție; PIN-ul clientului se trimite manual din admin.

**Concluzie:** codul actual e un **prototip funcțional de pilot**, bun ca specificație executabilă a fluxurilor, dar nu
ca nucleu de producție. Recomand păstrarea interfețelor și a regulilor validate și **reconstruirea stratului de date**
(PostgreSQL relațional) ca prim pas (DATA-001), apoi migrarea modul cu modul.

---

## 3. Stack tehnic real [COD]

| Strat | Tehnologie | Fișiere |
|---|---|---|
| Frontend + backend | Next.js 16.4.6 App Router, React 19.3, TypeScript 5, server actions | `src/app/**` |
| Stil | Tailwind 4.3, tokeni CSS, mod luminos / întunecat (`data-theme`) | `src/app/globals.css` |
| Validare | Zod 4.6 | `src/lib/validation/*` |
| Date | `DocumentStore`: PostgreSQL (`pg` 8.16, tabel `documents` JSONB) sau fișiere JSON locale fără `DATABASE_URL` | `src/server/db/*` |
| Sesiuni | cookie semnat HMAC-SHA256 (`puii_sesiune`, 14 zile), `SESSION_SECRET` obligatoriu în producție | `src/server/session-token.ts`, `session.ts` |
| Parole | scrypt (verificare în timp constant) | `src/server/password.ts` |
| Hărți | Leaflet + OpenStreetMap; imagini satelit Esri | `src/components/maps/*` |
| QR | `qrcode` | etichete colete |
| Email | Resend (HTTP API) — **neconfigurat în producție** | `src/server/email.ts` |
| SMS | Twilio (HTTP API) — **neconfigurat** | `src/server/sms.ts` |
| Găzduire | Vercel (proiect `puiimei-sfmm`), Neon PostgreSQL | variabile `DATABASE_*` |
| Teste | `node:test` (unitare), Playwright 1.63 (E2E), GitHub Actions | `src/**/*.test.ts`, `e2e/`, `.github/workflows/ci.yml` |
| Prisma | `prisma/schema.prisma` există, **neconectat** (nu e folosit de cod) | `prisma/` |

**Variabile de mediu în producție (Vercel, verificat prin API):** `DATABASE_URL` (+ variantele Neon), `ADMIN_USER`,
`ADMIN_PASSWORD`, `SESSION_SECRET` (setat la 22 nov.), `MAINTENANCE_MODE`, `PREVIEW_KEY`. **Lipsesc:**
`RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL`, `TWILIO_*`, `UNDER_CONSTRUCTION` (implicit ramă activă).
Mediul Preview nu are `ADMIN_USER` / `ADMIN_PASSWORD`.

---

## 4. Interfețe (aplicații) existente [COD]

52 de pagini, grupate în 4 „aplicații” (grupuri de rute Next.js).

### 4.1 Site public — `src/app/(site)` (meniu + footer)
`/` · `/cum-functioneaza` · `/gospodarii` · `/gospodarii/[slug]` · `/trasabilitate` · `/trasabilitate/[cod]` ·
`/precomanda` · `/comanda` (intrare client: nr. precomandă + PIN) · `/cifre` (cifre publice) · `/legislatie` ·
`/in-curand` (interes produse) · `/despre-noi` · `/devino-partener` · `/contact` · `/confidentialitate` ·
`/cont`, `/cont/autentificare`, `/cont/activare/[token]` · `/livrare/[token]`, `/livrare/c/[token]` (curier) ·
`/in-constructie`.

### 4.2 Panoul clientului — `src/app/(client)` (fără meniul site-ului, un singur „Înapoi la site”)
`/comanda/[token]` (dashboard: țarcul, ziua, plăți, drumul comenzii, trasabilitate, jurnal, livrare) ·
`/comanda/[token]/contract` · `/comanda/iesit` · `/confirmare/[token]` · `/evaluare/[token]`.

### 4.3 Panoul admin — `src/app/(panou)/admin` (bară cu iconițe în dreapta)
Precomenzi · Loturi · Livrări live (+ `[id]`) · Monitorizare creștere · Calitate · Documente · Investiții (+ `[id]`) ·
Solicitări parteneri · Gospodării (+ `[slug]`, `[slug]/regim`) · Prețuri · Zone de livrare · Interes produse ·
Utilizatori · Legislație și surse · „Vedere gospodar”.

### 4.4 Panoul gospodarului — `/cont/gospodar/*` · Panoul investitorului — `/cont/investitor/*`
Gospodar: Gospodăria mea (dashboard, loturi, țarcuri, suprafață, cont avans, ture, investiții de rambursat) ·
Jurnal de creștere · Documente și cheltuieli (registru fiscal) · Etichete · Tura `[id]` · Legislație.
Investitor: Investițiile mele · Investiția `[id]` (rambursare, cronologie, acte, gospodăria susținută).

### 4.5 Interfețe cerute în brief și **inexistente** în cod
Manager operațional · Financiar · Logistică (separat de admin) · Control calitate (separat) · Agenți AI ·
Contabil extern. **[COD]** Toate atribuțiile acestora sunt azi în panoul admin, fără roluri separate.

---

## 5. Control de acces [COD]

### 5.1 Roluri și identități
| Identitate | Cum se autentifică | Limite |
|---|---|---|
| Admin (env) | `ADMIN_USER` / `ADMIN_PASSWORD`, comparare în timp constant | acces total |
| Admin (cont) | email + parolă (scrypt) | acces total; nu își poate șterge propriul cont |
| Gospodar | email + parolă; **un singur** `farmSlug` | doar gospodăria sa (`canManageFarm`) |
| Investitor | email + parolă | doar investițiile sale |
| Client | nr. precomandă + PIN 6 cifre (24 h, max 5 încercări, retrimitere după 60 s) | doar comanda sa (cookie semnat pe numărul comenzii-mamă) |
| Curier | link de tură + PIN de ridicare / PIN personal; sesiune 24 h | doar tura sa; blocare după încercări greșite |
| Vizitator | — | paginile publice |

Login: 5 încercări / 15 minute blocare — **în memoria procesului** (nu funcționează între instanțe serverless).
Invitații / resetare parolă: link cu token și expirare. Sesiunea se invalidează la schimbarea parolei / dezactivare
(`sessionVersion`).

### 5.2 Gărzi pe acțiuni (server actions și rute)
| Zonă | Gardă de rol | Verificare pe obiect |
|---|---|---|
| `admin/*` (11 fișiere de acțiuni) | `requireAdmin` | n/a (admin) |
| `cont/gospodar/*` (documente, jurnal, loturi, plăți, teren) | `requireUser` / `requireRole` | `canManageFarm(user, farmSlug)` pe gospodăria obiectului |
| `cont/gospodar/livrari-actions` | `requireRole(["gospodar"])` | `canManageFarm` în `server/delivery.ts` pe tura / coletul obiect |
| `comanda/actions` (plată, anulare, alocare) | — | `requireOrderAccess(token)` (PIN, admin sau gospodarul lotului) |
| `livrare/actions` (curier) | — | `courierAuthorized(tour)` + PIN |
| `confirmare`, `evaluare` | — | token secret al coletului / evaluării |
| `/fisiere/[id]` | sesiune | `canViewDocument` |
| `/foto/[id]` | sesiune / token | proprietar foto: lot, colet, tură; client cu `?o=<token comandă>` |
| `/api/loturi/[cod]` | public | date publice ale lotului |
| `/api/admin/alerte` | `getCurrentUser` admin | — |

**Constatare:** nu am găsit acțiuni fără gardă care modifică date private. Riscuri rămase: blocarea login în memorie;
tokenurile din URL (comandă, curier, foto `?o=`) pot ajunge în istoric / loguri; nu există jurnal centralizat al
acțiunilor admin (doar jurnale pe domenii: tură, investiție, regim gospodărie).

---

## 6. Modelul de date actual [COD]

Toate entitățile sunt documente JSON în tabelul unic `documents(collection, id, data, created_at)`, cheie
`(collection, id)`. Relațiile sunt **referințe text** fără integritate garantată.

| Colecție | Entitate (`lib/domain.ts`) | Cheie | Referințe | Observații |
|---|---|---|---|---|
| `farms` + date demo din cod (`data/farms.ts`) + `farm-overrides` | Farm / FarmRecord | `slug` | — | 5 gospodării demo din cod, suprascrise din admin |
| `farm-land` | suprafață declarată / verificată | `id = farmSlug` | Farm | dovada = document |
| `farm-governance` | limite, regim (activă / avertizată / suspendată / exclusă), istoric | `id = farmSlug` | Farm | |
| `farm-payments` | IBAN, titular, preț furaj, preț pui de o zi | `id = farmSlug` | Farm | date bancare în JSON clar |
| `lots` + loturi demo din cod (goale acum) | Lot (țarcuri, porniri țarc, aprobare) | `code` (ex. MS-2026-01) | Farm (`farmSlug`) | `reservedBirds` calculat din precomenzi |
| `preorders` | Preorder (client, pui, estimare preț, alocare, părți, avans, PIN) | `id`, `number` (PM…), `trackingToken` | Lot (`lotCode`), Zone, părinte (`parentNumber`) | date personale în JSON |
| `parcels` | Parcel (colet, QR, încărcare, predare, confirmare, evaluare) | `id = preorderId` | Preorder, Lot, Farm, Tour | |
| `tours`, `tour-events` | Tura de livrare, curier, PIN-uri, prelungiri; jurnal append-only | `id` / `code` | Farm, Parcels | |
| `photos` | Poză (Base64) | `id` | proprietar „lot:/colet:/tura:” | **fișier în DB** |
| `files`, `documents` | Fișier (Base64, SHA-256) + metadate document | `id` | Farm, Lot, Investment | **fișier în DB**, limită 3,5 MB |
| `expenses` | Registru fiscal (cheltuieli / venituri, ciornă → confirmat, anulare) | `id` | Farm, Lot, Document | |
| `growth-log` | Jurnal de creștere append-only (mutare, poză, veterinar, mortalitate…) | `id` | Lot, Farm, Photo | GPS |
| `investments` | Investiție, cronologie, rambursare pe lot | `id` | User (investitor), Farm | |
| `users` | Utilizator | `id`, `email` | Farm (`farmSlug`) | |
| `zones`, `settings` (prețuri, livrare) | Zone de livrare, prețul pieței, adaos, prag | `id` | — | cu istoric de prețuri |
| `legal` | Bibliotecă legislație + știri | `id` | — | |
| `farm-applications`, `investor-applications`, `interest-signups`, `contact-messages` | Formulare publice | `id` | — | |

**Probleme de model:**
- „Lotul” e un singur obiect cu număr de păsări editabil; țarcul e derivat din ordinea precomenzilor; nu există
  efectiv (stoc de păsări) cu evenimente de intrare / mortalitate / ieșire (cerut de SC-010, SC-011).
- Precomanda conține estimarea de preț, avansul, PIN-ul, alocarea — fără entități separate pentru plată, rezervare
  de capacitate, contract.
- Nu există entitatea **Program** (ciclu economic) și nici **Compliance Gate** (SC-043, SC-046).
- Nu există entitatea **Organizație / entitate economică** a gospodăriei (forma juridică, CUI, conturi) separată de
  profilul public.

---

## 7. Reguli de business implementate ca constante [COD] (cu statutul lor)

| Regulă | Valoare în cod | Fișier | Statut |
|---|---|---|---|
| Pui / țarc | 40 | `lib/growth.ts` | [CONFIRMAT ca ipoteză operațională] (SC-019) |
| Pășune / țarc | 170 m² | `lib/growth.ts` | idem |
| Durată creștere / la interior | 60 / 21 zile | `lib/growth.ts` | idem |
| Pornirea țarcurilor unui lot | în max. 7 zile de la primul | `lib/growth.ts` | [CONFIRMAT de PO] |
| Un lot pe rând / gospodărie | da (excepție configurabilă) | `lib/growth.ts`, `governance.ts` | [DESCHIS juridic] |
| Limite | 10.000 pui / an, 300 / lot (editabile) | `lib/governance.ts` | [DESCHIS juridic] |
| Greutate pui curățat | 4,8 kg (≈70% din viu) | `lib/pricing.ts` | [CONFIRMAT ca ipoteză] |
| Furaj / pui | ~9,8 kg (asimilare 70%); `README.md` încă spune ~6 kg (neactualizat) | `lib/pricing.ts` | ipoteză — de validat zootehnic; README de corectat |
| Preț client | piață × (1 + adaos); implicit 30 lei + 20% = 36 lei/kg, editabil | `settings` | [CONFIRMAT ca model]; valoarea de piață se actualizează |
| Avans | pui de o zi + furaj, plătit gospodăriei, scăzut din total | `lib/pricing.ts` | [CONFIRMAT] (F1, SC-041) |
| Livrare gratuită | nu (prag 0, editabil) | `settings` | [CONFIRMAT de PO] |
| Alocare | primul lot cu loc pentru toată comanda; altfel clientul alege împărțire / așteptare | `server/allocation.ts` | [CONFIRMAT de PO] |
| Monitorizare | alertă la țarc nemutat 2 zile, poză lipsă > 7 zile | `lib/growth-log.ts` | [CONFIRMAT de PO] |
| Lanț de frig | 0–4 °C; termen consum 5 zile | `lib/delivery.ts` | [DESCHIS] — de validat DSVSA (SC-021) |
| Rambursare investiție | lei / pui livrat, „de stabilit” | `investments` | [DESCHIS] |
| Onorariu PUII MEI | **nu există în cod** | — | [CONFIRMAT, ADR-001]: 10% din (venituri − cheltuieli); definițiile [DESCHIS] |

---

## 8. Teste existente [COD]

| Tip | Ce acoperă | Unde | Rezultat la audit |
|---|---|---|---|
| Unitare (15) | cheia de sesiune, semnare / falsificare / expirare, TLS PostgreSQL | `src/server/**/*.test.ts` | 15 / 15 |
| E2E (14) | 9 pagini publice; acces admin; flux client precomandă → PIN → panou; link fără PIN | `e2e/smoke.spec.ts` | 14 / 14 local și în CI |
| CI | lint, typecheck, unitare, build, E2E cu PostgreSQL efemer | `.github/workflows/ci.yml` (PR #48) | verde (run 45067561639) |

**Neacoperite:** prețuri și alocare (unitare), concurență (ultimul loc din țarc, dublă confirmare plată), IDOR pe
fiecare rol, fluxul curierului, registrul fiscal, investiții, încărcare fișiere, performanță, restaurare backup.

---

## 9. Contradicții (cod ↔ documente aprobate) — de rezolvat înainte de specificația detaliată

| ID | Contradicție | Unde | Ce cere documentul aprobat | Recomandare |
|---|---|---|---|---|
| CX-01 | Contractul clientului e **tripartit**, ECORATE apare ca parte („Consultantul”) | `/comanda/[token]/contract` | BA §3: contract comercial **gospodărie–client**; tripartit = [VALIDARE], nu impus; PUII MEI = prestator B2B al gospodăriei | Contractul clientului devine bipartit (gospodărie–client), cu PUII MEI menționat ca administrator / reprezentant al gospodăriei în limita mandatului; textul final de la jurist |
| CX-02 | Pagina publică `/cifre` arată venituri / cheltuieli / profit **pe fiecare gospodărie** | `app/(site)/cifre` | BA-010 / DEC-009: ce date vede fiecare actor e [DESCHIS] + GDPR | Doar totaluri agregate până la decizie |
| CX-03 | Onorariul PUII MEI nu există în model; registrul fiscal nu are categoria „onorariu PUII MEI” și nici calculul profitului eligibil | `lib/documents.ts`, `expenses` | ADR-001: 10% din (venituri − cheltuieli) | Modul Finance: închidere lot → venituri − cheltuieli → onorariu 10% → factură, după definirea veniturilor / cheltuielilor |
| CX-04 | Confirmarea avansului se face prin click („primit”) de gospodar / admin, fără referință bancară | `plati-actions.ts`, `FeedCell` | F1 pas 4 + SC-017: confirmare cu document / identificator extern | Câmp obligatoriu: referință extras / OP + document atașat |
| CX-05 | Rambursarea investițiilor „lei / pui livrat” | `investments.repayment` | DEC-007: statutul investitorilor [DESCHIS] | Păstrat ca funcție internă, neexpusă juridic până la decizie |
| CX-06 | „Un lot pe rând” și limitele 10.000 / 300 aplicate ca reguli dure | `governance.ts`, `growth.ts` | SC-019: ipoteze configurabile, nevalidate legal | Mutate în configurație versionată pe program (Program Engine) |
| CX-07 | Gospodăria e identificată prin profil public (`slug`), nu prin entitate economică | `farms` | SC-040/041: gospodăria = entitate economică cu obligații proprii | Entitate `household` (juridic) separată de `farm_profile` (public) |
| CX-08 | Nu există Compliance Gate; o gospodărie devine activă la crearea din admin | `partner-actions.ts` | SC-043: nicio activitate comercială înaintea validării cerințelor | Gate obligatoriu înainte de primul lot |
| CX-09 | Investitorul vede cheltuielile / veniturile gospodăriei susținute | `/cont/investitor/[id]` | SC actor „Investitor: fără acces automat la datele clienților”; BA-010 [DESCHIS] | Confirmare PO a ce vede investitorul |

---

## 10. Datorie tehnică și riscuri (prioritizate)

| ID | Sev. | Constatare | Dovadă | Remediere propusă |
|---|---|---|---|---|
| D-01 | CRITIC | Fără tranzacții multi-entitate (alocare, împărțire comandă, plată, livrare) | `DocumentStore` (`list/get/append/update/remove`) | Schemă relațională + tranzacții + chei de idempotență (DATA-001) |
| D-02 | CRITIC | Citiri „încarcă tot și filtrează în memorie” | 41 de apeluri `store.list<…>` | Interogări indexate, paginare |
| D-03 | RIDICAT | Fără `DATABASE_URL`, producția scrie în `/tmp` (pierdere de date) | `server/db/store.ts` | Eroare explicită în producție + health check (C01) |
| D-04 | RIDICAT | Fișiere și poze Base64 în baza de date | `files`, `photos` | Object storage privat (ex. Vercel Blob / S3), linkuri semnate (S04) |
| D-05 | RIDICAT | Blocarea login-ului în memoria procesului | `app/(site)/cont/actions.ts` | Rate limiting persistent (DB / Redis) |
| D-06 | MEDIU | Reguli ca constante în cod | §7 | Configurație pe program, versionată, cu istoric |
| D-07 | MEDIU | Notificări neconfigurate (email, SMS); PIN trimis manual | Vercel env | Configurare Resend / Twilio + coadă de trimitere cu reîncercare |
| D-08 | MEDIU | Fără jurnal central de audit al acțiunilor admin | — | Tabel `audit_log` append-only, scris de fiecare mutație |
| D-09 | MEDIU | Date demo în cod (gospodării, prețuri implicite) amestecate cu date reale | `data/*.ts` | Seed separat, doar pentru dev / test |
| D-10 | SCĂZUT | Avertisment Node 20 la acțiunile GitHub | CI | Actualizare la versiunile noi ale acțiunilor |
| D-11 | SCĂZUT | `prisma/schema.prisma` vechi, neconectat, induce în eroare | `prisma/` | Șters sau înlocuit de schema din spec 04 |

---

## 11. Acoperirea brief-ului (cele 20 de capitole) de către codul actual

| # | Capitol | În cod | Observație |
|---|---|---|---|
| 1 | Arhitectura generală | parțial | monolit fără granițe de modul formale |
| 2 | Aplicații / interfețe | 5 din 9 | lipsesc: manager operațional, financiar, logistică, calitate, agenți AI (ca interfețe separate) |
| 3 | Baza de date | prototip | JSONB, fără ERD / FK / migrații |
| 4 | Utilizatori și permisiuni | parțial | 3 roluri + 2 accese token; fără permisiuni granulare |
| 5 | Modul gospodărie | parțial-bun | lipsesc: onboarding cu Compliance Gate, consumuri / furaje cu stoc, probleme operaționale, raport zilnic structurat |
| 6 | Producție | parțial | lipsesc: efectiv cu evenimente, greutate, randament, predicții, calendar |
| 7 | Comercial | parțial | lipsesc: facturare, rambursări, produse multiple, contract corect (CX-01) |
| 8 | Trasabilitate | bun | jurnal + documente + livrare; lipsesc procesarea ca etapă și incidentele |
| 9 | Financiar | parțial | registru fiscal; lipsesc POE, onorariu, decontări, reconciliere bancară |
| 10 | Logistic | parțial | livrări bune; lipsesc aprovizionare, stocuri, procesare |
| 11 | Calitate și conformitate | slab | evaluări clienți + documente; lipsesc Compliance Gate, neconformități, acțiuni corective |
| 12 | Agenți AI | absent | |
| 13 | API | minim | server actions; 1 API public read-only; fără OpenAPI / webhooks |
| 14 | Arhitectură tehnică | parțial | fără cozi, cache, object storage, monitorizare |
| 15 | Securitate | parțial-bun | TLS + secret rezolvate (#46); rămân D-04, D-05, D-08, GDPR |
| 16 | UI / UX | bun | design system informal (tokeni), fără specificație |
| 17 | Infrastructură | parțial | Vercel + Neon + CI; fără staging separat, backup testat, monitorizare |
| 18 | Testare | început | 15 unitare + 14 E2E + CI |
| 19 | Extindere | slab | `Species` în lot; fără Program Engine / verticale |
| 20 | Plan de implementare | — | de făcut |

---

## 12. Decizii noi descoperite în documentele aprobate (de reflectat în cod și în spec)

- **[CONFIRMAT de PO, 23 nov. 2026 — ADR-001]** Onorariul PUII MEI = **10% din (venituri − cheltuieli)** per lot / ciclu,
  facturat gospodăriei; înlocuiește „20% din POE” din BA §14. Definiția exactă a veniturilor și cheltuielilor: [DESCHIS]
  (`adr/ADR-001-ONORARIU-PUII-MEI.md`).
- **[CONFIRMAT, SC-041]** Clientul plătește integral gospodăriei; PUII MEI încasează doar de la gospodărie.
- **[CONFIRMAT, SC-042]** Contabilitatea e externalizată, plătită din contul gospodăriei.
- **[PROPUS, SC-043]** Compliance Gate obligatoriu înainte de orice activitate comercială.

---

## 13. Următoarele documente (ordinea propusă)

1. `01-ARHITECTURA-SISTEM.md` — contextul, modulele (granițe, responsabilități), fluxurile de date, diagramele C4.
2. `02-BAZA-DE-DATE.md` — ERD, schema completă PostgreSQL (tabele, câmpuri, tipuri, PK / FK, indexuri, constrângeri),
   izolarea pe gospodărie, istoricul, migrarea din `documents` JSONB.
3. `03-ROLURI-PERMISIUNI-SECURITATE.md` — matricea completă rol × operațiune × obiect, autentificare, sesiuni, audit, GDPR.
4. `04-…` modulele (gospodărie, producție, comercial, trasabilitate, financiar, logistic, calitate), fiecare cu date,
   fluxuri, reguli, API, permisiuni, erori, teste, criterii de acceptanță.
5. API (OpenAPI), agenți AI, UI / UX, infrastructură, testare, extindere, plan de implementare (MVP → versiuni).

Fiecare document se publică într-un PR separat, pentru comparație cu varianta GPT și pentru aprobare.
