# Puii mei – istoricul lucrului (predare pentru o conversație nouă)

Rezumatul primei conversații de lucru (noiembrie 2026). Citește împreună cu `CLAUDE.md` (reguli),
`docs/plan-platforma.md` (decizii de business) și `docs/sugestii.md` (ce a rămas).

## Despre proiect și utilizator

- **Puii mei**: precomenzi de pui crescuți la comandă în gospodării din Bucovina de munte (jud. Suceava). Domeniu:
  **www.puiimei.ro** (Hostinger → Vercel). Comunicare și site **în română**.
- Compania: **ECORATE S.R.L.** (în curs de înființare). Logo: textul ECORATE + frunză verde care se citește „D”
  → **ECORATED** (produs cotat eco). Pe site: „Powered by ECORATE” în footer. Datele firmei (CUI, adresă, telefon)
  se completează la înființare.
- Utilizatorul lucrează de pe telefon; preferă răspunsuri scurte, în română, și să i se spună ce are de făcut în
  Vercel. Întrebarea standard la final: „Fac merge la #N?” – merge doar la cererea lui.

## Poziționare (obligatoriu în texte)

- Puii mei e **platformă și consultant**, nu producător și nu intermediar. Nu „noi creștem”.
- Gospodăriile cresc, **sacrifică tradițional în gospodărie** și vând **direct** clientului.
- Clientul plătește **un avans = puii de o zi + furajul** (~6 kg / pui), **direct în contul gospodăriei**. Avansul se
  scade din prețul total; la livrare plătește diferența, după greutatea reală (5 kg / pui estimat, 34 lei/kg).
- Intenția: munca din gospodărie → venit stabil și legal, prin contracte de consultanță (fără „la negru”,
  „forță de muncă”).

## Tehnic

- Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript, Tailwind 4, Zod. Cod în `puii-mei/`.
- Grupuri de rute: `app/(site)` (public, cu header/footer), `app/(panou)` (admin, gospodar, investitor – panou
  simplu, meniu lateral, fără designul site-ului).
- Date: `DocumentStore` (Postgres/Neon cu `DATABASE_URL`, altfel JSON local). Colecții: preorders, users, lots,
  farm-payments, parcels, tours, tour-events, photos, files, documents, expenses, investments etc.
- Autentificare: sesiune semnată (cookie `puii_sesiune`), roluri admin/gospodar/investitor; adminul din
  `ADMIN_USER`/`ADMIN_PASSWORD`. Curierii și clienții fără cont (linkuri/QR temporare).
- Test local: Postgres din `/usr/lib/postgresql/16/bin`, Playwright preinstalat; `npm run build && npm start`.

## Ce s-a construit (PR-uri unite în `main`)

- **#1–#11**: site public (homepage, cum funcționează, precomandă, gospodării, trasabilitate, despre, contact,
  devino partener, în curând: curcani/rațe/fazani/seră), mod „în construcție”, domeniu, logo Puii mei.
- **#12** conturi (admin/gospodar/investitor, invitații). **#13** livrări (etichete QR curier/client, ture,
  traseu optimizat, PIN-uri curier, foto la ridicare/primire, semnătură, GPS, lanț de frig, prelungiri aprobate
  de admin, confirmare client + evaluări, jurnal nemodificabil).
- **#14** panou de control separat de site. **#15** „Comanda mea” (`/comanda/[cod]`, căutare după număr +
  telefon), plata avansului de hrană (IBAN gospodărie, „Am făcut plata”, confirmare gospodar), butoane „Comanda
  mea” / „Contul meu” în header.
- **#16** redesign: ilustrații pictate generate cu **Higgsfield** (`public/images/poveste/`), hero „pictură vie”
  animat în cod, „Drumul puiului” în 7 pași pe scroll, paletă/fonturi (Fredoka + Inter), logo nou Puii mei.
  **Utilizatorul nu e mulțumit de design – de reluat împreună.**
- **#17** loturi în baza de date (gospodarul propune, **adminul aprobă/respinge**), locuri calculate din
  precomenzi, anulare de către client; documente și cheltuieli pe lot (SHA-256, verificare admin, `/fisiere/[id]`);
  investiții + panou investitor (cronologie, contracte, transparența gospodăriei); buton **„Creează conturile de
  test”** (Admin → Utilizatori; parolele apar o singură dată); emailuri la evenimente (necesită Resend); logo
  ECORATE + „Powered by”.
- **#18** „under construction live”: ramă negru-galben, „UNDER CONSTRUCTION” transparent, etichetă; se scoate cu
  `UNDER_CONSTRUCTION=0`. Pagina `/in-constructie` refăcută.

- **#19** predare (acest fișier). **#20** dashboard închis pentru gospodar și investitor (imagine aeriană Higgsfield,
  pini pe loturi, cadran, bare, inel). **#21** registru fiscal: venituri + cheltuieli; ciornă → actul adăugat ulterior
  → „Confirm corectitudinea datelor” (blocare); anulare cu motiv. **#22** greutate 5 kg (înlocuită ulterior).
  **#23** avansul = puii de o zi + furajul, scăzut din total; limite 10.000 / an și 300 / lot (editabile pe
  gospodărie); regimul gospodăriilor (avertizată / suspendată / exclusă / reactivată); legislație și surse.
  **#24** legislația publică (`/legislatie`, link în footer) + noutăți în panoul gospodarului. **#25** notificări în
  admin pentru cererile de prelungire ale curierilor (banner, număr în meniu, alertă la 30 s, email).
- **#26** mod luminos/întunecat + prețuri după modelul de creștere. **#27** modelul „un lot pe rând + țarcuri de 40”,
  suprafața verificată, alocarea automată. **#28** monitorizarea creșterii: `/cont/gospodar/jurnal` (mutare cu GPS,
  poză la 7 zile, intervenții, vizite veterinare), `/admin/monitorizare` + alerte, jurnalul în „Comanda mea”. **#29** pagina publică `/cifre` (cifrele companiei, din registrele confirmate). **#30** dashboardul clientului în „Comanda mea”;
  gospodării demo noi (5 sate: Moldova-Sulița, Fundu Moldovei, Vatra Moldoviței, Ciocănești, Breaza), fără loturi demo;
  **codul lotului = inițialele localității – anul – nr. lotului** (ex. **MS-2026-01**); butonul „Șterge datele de test”
  (Admin → Utilizatori, confirmare „STERG”; păstrează conturile și gospodăriile create din admin). **#31** ștergerea conturilor din Admin → Utilizatori.
  **#32** navigare: traseu „Acasă › …” pe site și în panouri, „← Înapoi la …” pe telefon. **#33** Admin → Prețuri: prețul pieței și adaosul editabile, cu istoric. **#34** Admin → Zone de livrare (zone, taxe, zile, prag livrare gratuită).
  **#35** fără livrare gratuită; mesaj „Comenzile se confirmă după lansare” pe precomandă; rambursarea investițiilor de
  către gospodar la fiecare lot vândut (suma pe pui: de stabilit).
- (vechi) **#26**: mod luminos / întunecat peste tot (buton soare/lună), eticheta coletului alb-negru;
  prețuri după modelul de creștere; „țarc” și „pui curățat, gata de gătit”; texte despre creșterea de 60 de zile.

## Decizii recente (22 nov. 2026)

- **Modelul de creștere** e descris în `plan-platforma.md` §1b: țarc mobil 4 × 3 m, 40 de pui / țarc, ~170 m² de
  pășune / țarc (capacitatea = suprafața dovedită / 170 × 40), un lot pe rând, țarcurile pornesc la câte 40 de
  precomenzi, la cel mult **7 zile** unul de altul; 0–21 zile la interior, de la 21 pe pășune, sacrificare la 60.
- **Alocare**: clientul nu alege lotul; primul loc disponibil, automat; dacă nu încape toată comanda într-o
  gospodărie, clientul alege împărțirea (livrări și plăți separate) sau așteptarea.
- **Termeni**: „țarc” (nu „cușcă”), „pui curățat, gata de gătit” (nu „eviscerat”).
- **Prețuri**: 4,8 kg / pui curățat (≈ 70% din ~6,9 kg în viu); furaj ≈ 9,8 kg / pui (asimilare ~70%);
  prețul pieței 30 lei/kg + 20% = 36 lei/kg; pui de o zi 7 lei, furaj 3,50 lei/kg (orientative, pe gospodărie).
  Exemplu 10 pui: 1.728 lei total, avans 413 lei, rest 1.315 lei.
- **Înregistrarea gospodăriei** va cere actul de proprietate al suprafeței; suprafața măsurată în teren devine harta
  țarcurilor (traseu și poziție live pentru client).
- **Monitorizare**: gospodarul bifează fiecare mutare și intervenție (alertă în admin dacă lipsește), poză la 7 zile,
  vizitele veterinare se notează. Transparență totală.
- **Pagină publică cu cifrele companiei** (bani intrați în gospodării, venituri, cheltuieli, profit, taxe, gospodării,
  pui buc./kg, cereale).
- **Coada de lucru**: 1) model de creștere (suprafață → țarcuri, lot unic, țarcuri ca subloturi); 2) monitorizarea
  creșterii; 3) cifrele publice; 4) dashboard client; 5) navigare clară (breadcrumbs, „Înapoi” explicit);
  6) română / engleză.

## Setări și servicii

- Vercel: `DATABASE_URL` (Neon), `ADMIN_USER`, `ADMIN_PASSWORD`; de adăugat `SESSION_SECRET`, `RESEND_API_KEY`,
  `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL`. `MAINTENANCE_MODE` trebuie să fie șters/`0` ca site-ul să fie live.
- **Higgsfield** conectat (conector MCP `https://mcp.higgsfield.ai/mcp`), **plan gratuit**: doar modelul de
  imagini `z_image`, cereri una câte una; video necesită plan plătit. Imaginile generate se descarcă de pe
  `d8j0ntlcm91z4.cloudfront.net` (permis în mediul cloud „masteryourh”).
- Utilizatorul caută unelte de design grafic cu natură și animație (recomandate: Higgsfield plătit pentru clipuri,
  Rive / LottieFiles pentru animații web, Midjourney/Runway/Kling/Luma ca alternative).

## Următorii pași probabili

Vezi `docs/sugestii.md`. Pe scurt: reluarea designului; zone și prețuri editabile din admin; editarea
gospodăriilor demonstrative; mesaj pe precomandă în perioada „under construction”; IBAN-urile gospodăriilor;
conturile reale; setările Vercel; verificări juridice; la lansare `UNDER_CONSTRUCTION=0`.
