# Sugestii uitate

Listă de sugestii și pași rămași, adunați din discuții. La expresia **„sugestii uitate”** se citește lista și se
actualizează (se bifează ce s-a făcut, se adaugă ce apare nou).

_Ultima actualizare: 22 noiembrie 2026_

## De construit (etapele următoare)

- [x] **Modelul „un lot pe rând + țarcuri de 40”** (PR #27) (vezi `plan-platforma.md` §1b): capacitate din numărul de țarcuri,
      subloturi pe țarcuri pornite la 40 de precomenzi, etapele 0–21–60 zile, greutate 4,8 kg (22 nov. 2026).
      Include **alocarea automată** (fără alegerea lotului de către client) și alegerea clientului „împărțire în
      gospodării” / „aștept o gospodărie pentru toată comanda” când nu încape într-una singură.
- [x] **Monitorizarea creșterii** (PR #28): jurnalul gospodarului (mutarea zilnică a țarcului cu GPS, intervenții,
      mortalitate, verificări veterinare), poza la 7 zile, alerte în admin („Monitorizare creștere”), traseul țarcurilor
      pe hartă și jurnalul vizibil clientului în „Comanda mea”.
- [x] **Pagina publică cu cifrele companiei** (PR #29, `/cifre`, link în footer): bani intrați în gospodării,
      venituri, cheltuieli, profit, taxe, investiții, gospodării, pui buc./kg, furaj; doar înregistrări confirmate.
- [ ] **Greutatea reală la livrare** (cântărită) pentru cifrele publice – acum kg sunt estimate (4,8 kg / pui).
- [ ] **Poziția live a țarcului** pentru client: acum se vede ultima mutare notată (cu GPS); live real ar cere un
      senzor GPS pe țarc – de discutat.
- [ ] **Harta suprafeței măsurate** (conturul pășunii desenat la verificarea în teren) – de adăugat peste traseul țarcurilor.
- [x] **Investiții cu rambursare** de către gospodar, la fiecare lot vândut (PR #35): rata pe pui livrat se setează pe
      fiecare investiție; ratele se înregistrează pe lot; progresul îl văd adminul, investitorul și gospodarul.
- [ ] **Suma reținută pe pui** la rambursare: **de stabilit** (22 nov. 2026).
- [ ] **Anularea comenzii după plata avansului** – de gândit (22 nov. 2026): dacă alt client preia comanda anulată
      (integral sau parțial, aceiași pui din același țarc), avansul se poate rambursa integral sau proporțional cu puii
      preluați; dacă nu o preia nimeni, de stabilit ce se întâmplă cu avansul (puii și furajul sunt deja cumpărați).
      De gândit: lista de așteptare care preia automat locurile, termenul până la care se poate anula, cine returnează
      banii (gospodăria, direct clientului) și cum apare în registru și în contract.
- [x] **Căutare în Admin → Precomenzi** după număr, nume, telefon sau e-mail (PR #81, 25 nov. 2026).
- [ ] **Comenzi pentru congelator** (cantități mari) pe lângă cele pentru consum imediat – anunțate pe „În curând” (PR #36).
- [ ] **Alte produse din gospodărie** la precomandă: borcane, afumături, păstrăvi – anunțate pe „În curând”, cu înscriere
      de interes (PR #36); precomanda lor e de construit.

- [x] **Etapa 3 – gospodar:** registrul de cheltuieli pe lot + documente (SHA-256, verificare admin). Fișierele stau
      deocamdată în baza de date (max. 3,5 MB); pentru volum mare → Vercel Blob.
- [x] **Etapa 4 – investitor:** investiții, cronologie, contracte descărcabile, transparența gospodăriei susținute.
- [x] **Loturi din panou**: gospodarul propune, adminul aprobă (sau respinge cu motiv); locuri calculate din precomenzi;
      anularea precomenzii de către client.
- [x] **Notificări pe email** (client, gospodar, admin) – pleacă doar după configurarea Resend.
- [ ] **WhatsApp Business API** pentru mesaje automate (acum: linkuri WhatsApp manuale).
- [x] **Mesaj pe pagina de precomandă** cât timp site-ul e în construcție: „Comenzile se confirmă după lansare” (PR #35;
      dispare cu `UNDER_CONSTRUCTION=0`).
- [x] **Dashboard închis (stil „aerial + sticlă”) pentru gospodar și investitor**; adminul rămâne simplu.
- [x] **„Comanda mea” în același stil de dashboard** (PR #30): gospodăria de sus cu țarcurile („Puii tăi · țarcul N”),
      cadranul creșterii, avans / rest la livrare, drumul comenzii în 7 pași, poza săptămânii.
- [ ] **Imaginea aeriană reală a fiecărei gospodării** în dashboard (acum una comună, generată) + pozițiile reale ale
      țarcurilor din măsurătoarea în teren.
- [ ] **Designul site-ului** – de reluat (utilizatorul nu e mulțumit de varianta actuală; lucrăm împreună).
- [x] **Zonele de livrare și prețurile** editabile din admin (PR #33 prețuri, PR #34 Admin → Zone de livrare: zone noi,
      taxe, zile, localități, activare/dezactivare, pragul de livrare gratuită).
- [x] **Editarea gospodăriilor demonstrative** din admin (PR #36): Admin → Gospodării → Editează (salvat peste datele din cod).
- [ ] **Modele de documente**: contract de consultanță pentru gospodari, contract de investiție, chitanță pentru avansul
      de hrană – de redactat cu juristul și încărcat în platformă.
- [ ] **Backup** periodic al bazei de date (Neon are istoric; de verificat planul).
- [ ] **Pozele de la livrări** mutate pe Vercel Blob când crește volumul (acum stau în baza de date).
- [ ] **Google Maps** (opțional): geocodare și distanțe reale pe drum pentru trasee (acum OpenStreetMap + calcul propriu).
- [ ] **Bază de date relațională completă** (schema Prisma) când crește volumul de date.

- [ ] **Clip animat real în hero** (Higgsfield, image-to-video): necesită plan plătit Higgsfield. Acum scena e animată
      în cod (nori, iarbă în vânt, semințe). Clipul se pune în `public/images/poveste/` și înlocuiește animația din cod.
- [ ] **Imagini Higgsfield pentru gospodării** (profilurile au încă imagini de rezervă) și pentru paginile interioare.

- [x] **Navigare clară** (PR #32): traseul „Acasă › …” pe site, „Panou admin › …” în panouri, iar pe telefon
      „← Înapoi la <pagina părinte>”.
- [ ] **Limitele pe IP pentru PIN** (SEC-007, 23 nov. 2026): 30 verificări/oră și 30 cereri/zi pe aceeași adresă IP.
      Clienții din aceeași rețea mobilă pot avea același IP (NAT) – de reevaluat după lansare, din jurnale.
- [ ] **Română / engleză** – amânat de utilizator (22 nov. 2026); întâi site-ul public, apoi panourile.

- [x] **NAV-001, restul linkurilor din Admin** (24 nov. 2026): mutate în Admin în PR #73 (Admin Central Command Center).
- [ ] **Admin Command Center, rămase** (24 nov. 2026, după #73): păstrarea scroll-ului la „Înapoi” pentru paginile
      fără ancoră (NAV-T14); „Reia Admin” (ultima stare salvată), dacă se dorește; investițiile și calitatea pe
      gospodărie ca entități separate în Admin. Merge #72 sau închiderea lui (înlocuit de #73) — fără răspuns.
- [ ] **Scalare / „Librarian Architecture”** (24 nov. 2026, review Claude pe #62, în așteptarea deciziei): 1) indexuri și
      interogări țintite în locul citirii întregii colecții (`.list()` + filtru; ex. `byNumber`) — cel mai mare risc;
      2) outbox: notificările (e-mail, SMS) scoase din tranzacție; 3) lanțul de audit fără blocarea globală
      (`pg_advisory_xact_lock`): lanț pe partiții + ancorare; 4) `AccessContext` obligatoriu + proiecții per rol + RLS;
      5) benchmark reproductibil (N1/N2) în CI; 6) URL-uri presemnate pentru fișiere, partiționare lunară audit/jurnal.
      Întrebări deschise: volum țintă, buget bază de date, RPO/RTO, întârzierea acceptată în dashboard-uri, AI, retenție.
- [ ] **Sarcini și manageri** (24 nov. 2026, decizie fondator, de detaliat): roluri `manager_local` / `manager_zonal`,
      tabel de sarcini (termen, justificare, rezolvare, escaladare), rezumat zilnic pentru gospodar, coada managerului
      local, tablou zonal și național. **Decis:** local = comuna (SIRUTA), zonal = grup de comune după circumscripțiile
      judecătoriilor. Deschis: termenele pe tip de sarcină (zootehnist), termenul
      de reacție al managerului, ce acțiuni AI rămân cu confirmare umană (propunere: plăți, efectiv, veterinar, blocări).
- [ ] **Durabilitate E0** (24 nov. 2026, propus pe #62): Neon plătit cu PITR (~20 $/lună), copie zilnică imuabilă la
      alt furnizor (ex. R2), test automat de restaurare săptămânal — așteaptă acordul pe buget și furnizor.
- [x] **Consolidare (mandat #62)**: unite în main #69, #70, #73, #74 (citiri țintite), #76 (outbox), #77 (Admin ›
      Mesaje netrimise), #78 (benchmark scriere), #79 (paginare Admin + agregate), #71; #72 închis (24–25 nov. 2026).
- [ ] **Rămase din consolidare** (25 nov. 2026): **măsoară latența în Admin › Diagnostic tehnic pe site-ul live** (#80)
      și trimite cifra; read model pentru `/cifre`; index trigram pentru căutare la volum mare; lanțul de audit pe gospodărie + ancorare
      (decizie ChatGPT / fondator, date în CLAUDE-BENCH-C3-SCRIERE.md); măsurarea RTT-ului real Vercel ↔ Neon;
      review-ul lotului 06–11 când e publicat. Recomandări acceptate (R07, R12, R15) — pe #62.
- [ ] **Backup de producție (C4)** (24 nov. 2026): **amânat de fondator** („o integrăm mai târziu”); până atunci PITR-ul
      inclus în Neon. De reluat: destinație, buget, test automat de restaurare.
- [ ] **AUD-001, etapa 2** (24 nov. 2026, după #70): separarea rolurilor SQL (aplicația fără drept de a șterge
      triggerul), export extern semnat (WORM), interfață de căutare / export pentru investigații (cu audit al
      accesului), retenția pe categorii (jurist / DPO), auditul vizualizărilor sensibile, `householdId` completat la
      toate acțiunile pe obiecte primite prin id.

## De configurat (Vercel / servicii)

- [ ] **SMS pentru PIN-ul clientului** (Twilio): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` în Vercel. Până atunci
      PIN-ul pleacă pe email (dacă e configurat Resend) sau apare în Admin → Precomenzi, cu buton „Trimite pe WhatsApp”.

- [ ] **SESSION_SECRET** în Vercel → Environment Variables (minimum 32 de caractere aleatorii), apoi Redeploy.
      **Obligatoriu înainte de merge la PR-ul de securitate (SEC-001)**: fără el, autentificarea și PIN-urile se opresc.
- [ ] **Resend** (`RESEND_API_KEY`, `EMAIL_FROM`, ex. „Puii mei <comenzi@puiimei.ro>”): emailul cu linkul
      „Comanda mea” și celelalte emailuri pleacă doar după configurare.
- [ ] **Vercel Blob** pentru fișiere mari (opțional; documentele merg și fără, până la 3,5 MB).
- [ ] **`ADMIN_NOTIFY_EMAIL`** în Vercel: adresa care primește alertele (precomenzi, solicitări, mesaje).
- [x] **Conectorul Higgsfield** conectat (plan gratuit: doar modelul de imagini `z_image`, fără video).

- [x] **Vercel: previzualizările pentru branch-uri noi eșuau** (23 nov. 2026): limita de branch-uri Neon (plan Free).
      Rezolvat: PO a șters 6 branch-uri Neon ale PR-urilor unite; previzualizările #57, #58, #60, #61 refăcute → READY.
- [ ] **Ștergerea automată a previzualizărilor vechi** (23 nov. 2026): Neon șterge branch-ul bazei când e șters
      deployment-ul din Vercel. De setat în Vercel → Settings → Deployment Retention (ex. previzualizări mai vechi de
      30 de zile), ca limita să nu se mai atingă.

- [ ] **Baza de date gratuită pe termen lung** (23 nov. 2026, PO: „soluție pentru mai multă stocare gratuită”): limita
      atinsă e cea de 10 branch-uri Neon (câte unul pe previzualizare), nu spațiul. Fotografiile se salvează însă în baza
      de date (base64) și o vor umple. Propunere: (1) previzualizările pe o singură bază de test fixă, separată de
      producție; (2) fotografiile și documentele în object storage gratuit (ex. Cloudflare R2), baza de date doar pentru
      date. Alternativ: Prisma Postgres (2 GB gratuit), Supabase (500 MB, UE). Tokenul Vercel din sesiune trebuie
      reînnoit (cel salvat e refuzat).

- [ ] **De configurat de PO în Vercel după merge-urile #65–#67** (24 nov. 2026): `FILES_S3_*` (furnizorul de
      stocare: recomandat Cloudflare R2), `CRON_SECRET`, un token Vercel nou pentru sesiunea Claude (cel salvat e refuzat).

## De completat pe site

- [ ] **Datele de plată ale fiecărei gospodării** (titular, IBAN, bancă, preț furaj): Contul meu → Vedere gospodar →
      „Contul pentru avansul de hrană”. Fără ele, clienții nu pot plăti avansul.
- [x] **Prețul pieței editabil din admin** (PR #33): Admin → Prețuri (piață + adaos, cu istoric). Implicit 30 lei/kg + 20%
      = 36 lei/kg; de actualizat periodic (surse: industrial ~35 lei/kg, pui de țară ~55–60 lei/kg în București, 2026).
- [x] **Fără livrare gratuită** (decizie 22 nov. 2026); pragul se poate pune oricând din Admin → Zone de livrare.
- [ ] **Prețurile implicite din avans:** furaj 3,50 lei/kg și pui de o zi 7 lei/pui sunt orientative
      (`src/lib/pricing.ts`); fiecare gospodărie își setează prețurile reale în panou.

- [ ] **Fotografii reale** ale gospodăriilor în `public/images/gospodarii/` (acum se afișează imagini de rezervă).
- [ ] **Datele gospodăriilor** sunt demonstrative: 5 gospodării în Moldova-Sulița, Fundu Moldovei, Vatra Moldoviței,
      Ciocănești, Breaza (22 nov. 2026); nu mai există loturi demo. De înlocuit cu cele reale.
- [ ] **După merge la #30**: Admin → Utilizatori → „Șterge datele de test” (scrii STERG) pe site-ul live, ca să plece
      precomenzile, loturile, pozele și documentele de test.
- [ ] **Conturile de test**: Admin → Utilizatori → „Creează conturile de test” (parolele apar o singură dată).
- [ ] **Conturile reale** ale gospodarilor și investitorilor, create din Admin → Utilizatori și trimise pe WhatsApp.

## La înființarea firmei (amânat de utilizator)

- [x] **Denumirea**: ECORATE S.R.L. (logo în `public/brand/`, frunza = „D” → ECORATED).
- [ ] **Datele companiei** în `src/lib/site.ts`: CUI, nr. Reg. Com., adresă, telefon (acum `+40 700 000 000`).
- [ ] **Modelele de contract** și chitanța pentru avansul de hrană, cu datele firmei.

## Securitate (de reparat)

- [x] **PIN-ul clientului ocolibil prin cereri simultane** (V-01/V-02) – reparat în #56 (SEC-007).
- [x] **Schimbarea IBAN-ului gospodăriei** (CG-03, varianta b): etapa 1 (fără MFA) în PR #61 — contul nou activ doar după
      apelul de confirmare și 24 h; „Nu am cerut eu”; jurnal (ADR-009).
- [x] **IBAN, etapa 2 – MFA** (ADR-009): implementat în PR #68 (cod din aplicația de autentificare, resetare din admin).
- [ ] **IBAN, ce mai rămâne** (ADR-009, 24 nov. 2026): expirarea cererii după 5 zile lucrătoare fără apel [PROPUS, de
      confirmat de PO]; verificarea titularului la bancă; notificare la schimbarea numărului de telefon al gospodarului
      (azi doar adminul îl poate schimba).
- [x] **Supra-rezervarea locurilor** (CG-04) – reparat în PR #59 (registru de locuri atomic + reconciliere, teste E2E).
      Perioada de grație pentru o rezervare rămasă fără comandă: 10 minute [PROPUS].
- [x] **Alertele de expirare a documentelor** (decis de PO 23.11.2026): implementat în PR #67 (praguri 60/30/14/7,
      job zilnic, „sună gospodarul” la 7 zile). **De făcut de PO după merge:** `CRON_SECRET` în Vercel.
- [ ] **PIN curier**: testul de concurență există (#64: 10 cereri simultane → un singur curier). PIN-ul de ridicare
      păstrat ca hash ar împiedica gospodarul să-l vadă și să-l trimită curierului → **decizie de produs** (alternativă:
      criptat în bază). Notat 25 nov. 2026.
- [x] **Izolarea între gospodării pe codul actual** (CG-05): test IDOR E2E + matricea de dovezi în PR #66.
- [ ] **RLS pe schema-țintă** (CG-05): toate tabelele cu `household_id`, scriere, pool, mandat revocat — odată cu migrarea.

## De verificat zootehnic

- [ ] **Furajul pe pui** (9,8 kg, „asimilare 70%”) e probabil subestimat: FCR implicit ≈ 1,43; la pui cu creștere lentă
      FCR-ul e de obicei 2,5–3,5 (≈ 17–24 kg / pui). Afectează avansul și costul lotului (ADR-008).

## De verificat juridic

- [ ] **Onorariul PUII MEI = 10% din (venituri − cheltuieli)** per lot (decizie 23 nov. 2026, ADR-001): de definit cu
      contabilul ce intră în venituri / cheltuieli, cheltuieli reale vs. standard, reportarea pierderilor, TVA.

- [ ] **Contractul de creștere** tripartit (client – gospodărie – ECORATE consultant), model în `/comanda/<cod>/contract`:
      clauza pentru pierderile de pui, semnarea electronică, datele firmei (22 nov. 2026).

- [ ] **Mai multe loturi simultane** în aceeași gospodărie (sau un singur lot pe rând, cu țarcuri pornite eșalonat) –
      ce permite legea pentru sacrificarea în gospodărie și vânzarea directă (22 nov. 2026).

- [ ] **Limita de păsări** pentru sacrificarea în gospodărie și vânzarea directă: am pus 10.000 / an (Ordinul ANSVSA
      6/2024, de verificat textul final) și 300 / lot (recomandare practică). De confirmat la DSVSA Suceava, plus
      zona în care e permisă vânzarea (județ / județe limitrofe).

- [ ] Rolul de consultant vs. intermediar; vânzarea directă și sacrificarea în gospodărie.
- [ ] Plata avansului pentru hrană direct gospodăriei (contract, chitanță/factură).
- [ ] Confirmarea primirii la livrare (să nu limiteze drepturile consumatorului).
- [ ] Formularea pentru investitori.
- [ ] GDPR: poziții GPS, fotografii, semnături, documente.

## La lansare

- [ ] Scoaterea ramei „UNDER CONSTRUCTION” (bandă negru-galben + text transparent): în Vercel `UNDER_CONSTRUCTION=0`,
      apoi Redeploy. Site-ul e live între timp („under construction live”).
- [ ] `MAINTENANCE_MODE` să rămână șters / `0` (altfel vizitatorii văd doar pagina „Site în construcție”).
