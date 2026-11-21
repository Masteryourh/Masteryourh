# Sugestii uitate

Listă de sugestii și pași rămași, adunați din discuții. La expresia **„sugestii uitate”** se citește lista și se
actualizează (se bifează ce s-a făcut, se adaugă ce apare nou).

_Ultima actualizare: 21 noiembrie 2026_

## De construit (etapele următoare)

- [ ] **Modelul „un lot pe rând + țarcuri de 40”** (vezi `plan-platforma.md` §1b): capacitate din numărul de țarcuri,
      subloturi pe țarcuri pornite la 40 de precomenzi, etapele 0–21–60 zile, greutate 4,8 kg (22 nov. 2026).
- [ ] **Investiții cu rambursare în tranșe** de către gospodar (echipamente de creștere și sacrificare).
- [ ] **Comenzi pentru congelator** (cantități mari) pe lângă cele pentru consum imediat.
- [ ] **Alte produse din gospodărie** la precomandă: borcane, afumături, păstrăvi etc.

- [x] **Etapa 3 – gospodar:** registrul de cheltuieli pe lot + documente (SHA-256, verificare admin). Fișierele stau
      deocamdată în baza de date (max. 3,5 MB); pentru volum mare → Vercel Blob.
- [x] **Etapa 4 – investitor:** investiții, cronologie, contracte descărcabile, transparența gospodăriei susținute.
- [x] **Loturi din panou**: gospodarul propune, adminul aprobă (sau respinge cu motiv); locuri calculate din precomenzi;
      anularea precomenzii de către client.
- [x] **Notificări pe email** (client, gospodar, admin) – pleacă doar după configurarea Resend.
- [ ] **WhatsApp Business API** pentru mesaje automate (acum: linkuri WhatsApp manuale).
- [ ] **Mesaj pe pagina de precomandă** cât timp site-ul e „under construction live”: „Comenzile se confirmă după
      lansare” (propus pe 21 nov. 2026, fără răspuns).
- [x] **Dashboard închis (stil „aerial + sticlă”) pentru gospodar și investitor**; adminul rămâne simplu.
- [ ] **„Comanda mea” în același stil de dashboard** (bun și pentru marketing) – de discutat.
- [ ] **Designul site-ului** – de reluat (utilizatorul nu e mulțumit de varianta actuală; lucrăm împreună).
- [ ] **Zonele de livrare și prețurile** editabile din admin (acum sunt în cod: `src/data/zones.ts`, `src/lib/pricing.ts`).
- [ ] **Editarea gospodăriilor demonstrative** din admin (acum se pot edita doar cele create din admin).
- [ ] **Modele de documente**: contract de consultanță pentru gospodari, contract de investiție, chitanță pentru avansul
      de hrană – de redactat cu juristul și încărcat în platformă.
- [ ] **Backup** periodic al bazei de date (Neon are istoric; de verificat planul).
- [ ] **Pozele de la livrări** mutate pe Vercel Blob când crește volumul (acum stau în baza de date).
- [ ] **Google Maps** (opțional): geocodare și distanțe reale pe drum pentru trasee (acum OpenStreetMap + calcul propriu).
- [ ] **Bază de date relațională completă** (schema Prisma) când crește volumul de date.

- [ ] **Clip animat real în hero** (Higgsfield, image-to-video): necesită plan plătit Higgsfield. Acum scena e animată
      în cod (nori, iarbă în vânt, semințe). Clipul se pune în `public/images/poveste/` și înlocuiește animația din cod.
- [ ] **Imagini Higgsfield pentru gospodării** (profilurile au încă imagini de rezervă) și pentru paginile interioare.

## De configurat (Vercel / servicii)

- [ ] **SESSION_SECRET** în Vercel → Environment Variables (o valoare lungă, aleatorie), apoi Redeploy.
- [ ] **Resend** (`RESEND_API_KEY`, `EMAIL_FROM`, ex. „Puii mei <comenzi@puiimei.ro>”): emailul cu linkul
      „Comanda mea” și celelalte emailuri pleacă doar după configurare.
- [ ] **Vercel Blob** pentru fișiere mari (opțional; documentele merg și fără, până la 3,5 MB).
- [ ] **`ADMIN_NOTIFY_EMAIL`** în Vercel: adresa care primește alertele (precomenzi, solicitări, mesaje).
- [x] **Conectorul Higgsfield** conectat (plan gratuit: doar modelul de imagini `z_image`, fără video).

## De completat pe site

- [ ] **Datele de plată ale fiecărei gospodării** (titular, IBAN, bancă, preț furaj): Contul meu → Vedere gospodar →
      „Contul pentru avansul de hrană”. Fără ele, clienții nu pot plăti avansul.
- [ ] **Prețul pe kg și pragul de livrare gratuită** după trecerea la 5 kg / pui (acum 34 lei/kg → ~170 lei/pui;
      livrare gratuită peste 600 lei, adică de la 4 pui) – de confirmat (propus pe 21 nov. 2026, fără răspuns).
- [ ] **Prețurile implicite din avans:** furaj 3,50 lei/kg și pui de o zi 7 lei/pui sunt orientative
      (`src/lib/pricing.ts`); fiecare gospodărie își setează prețurile reale în panou.

- [ ] **Fotografii reale** ale gospodăriilor în `public/images/gospodarii/` (acum se afișează imagini de rezervă).
- [ ] **Datele gospodăriilor și loturilor** sunt demonstrative (pilot); de înlocuit cu cele reale.
- [ ] **Conturile de test**: Admin → Utilizatori → „Creează conturile de test” (parolele apar o singură dată).
- [ ] **Conturile reale** ale gospodarilor și investitorilor, create din Admin → Utilizatori și trimise pe WhatsApp.

## La înființarea firmei (amânat de utilizator)

- [x] **Denumirea**: ECORATE S.R.L. (logo în `public/brand/`, frunza = „D” → ECORATED).
- [ ] **Datele companiei** în `src/lib/site.ts`: CUI, nr. Reg. Com., adresă, telefon (acum `+40 700 000 000`).
- [ ] **Modelele de contract** și chitanța pentru avansul de hrană, cu datele firmei.

## De verificat juridic

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
