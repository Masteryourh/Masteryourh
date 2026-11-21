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
