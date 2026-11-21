# Puii mei – website

**Puii mei. Crescuți pentru tine.** Platformă de precomenzi pentru pui de carne crescuți la comandă în gospodării locale partenere.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Zod

## Pornire

```bash
cd puii-mei
npm install
cp .env.example .env.local   # opțional: ADMIN_USER / ADMIN_PASSWORD pentru /admin
npm run dev                  # http://localhost:3000
npm run build && npm start   # producție
```

## Pagini

| Rută | Conținut |
|---|---|
| `/` | Homepage: hero animat (scena din Bucovina), drumul puiului în 7 pași pe scroll, loturi deschise, gospodării, trasabilitate, FAQ |
| `/cum-functioneaza` | Procesul detaliat în 5 pași + ce gestionăm noi |
| `/precomanda` | Formular: cantitate, lot, zonă livrare, date contact, preț estimat live, confirmare cu număr |
| `/gospodarii`, `/gospodarii/[slug]` | Gospodării partenere: localizare, fotografii, practici, loturi |
| `/trasabilitate`, `/trasabilitate/[cod]` | Căutare după cod lot, etape, status, dată estimată |
| `/despre-noi`, `/contact`, `/confidentialitate` | Misiune, formular contact, GDPR |
| `/devino-partener` | Aplicare ca gospodărie parteneră sau ca investitor (`#gospodarie` / `#investitor`) |
| `/in-curand` | Produse în curând (curcani, rațe, fazani, legume din seră) + formular „Anunță-mă” |
| `/comanda`, `/comanda/[cod]` | „Comanda mea” (fără cont): căutare după număr + telefon; pagina comenzii cu plata avansului pentru hrană (IBAN-ul gospodăriei, sumă, referință, „Am făcut plata”), stadiul, lotul și livrarea |
| `/cont/autentificare` | Intrare în cont (email + parolă); `/cont` duce la dashboard-ul rolului |
| `/cont/activare/[cod]` | Setarea parolei din linkul de invitație / resetare (valabil 7 zile, o singură folosire) |
| `/cont/gospodar` | Dashboard gospodar: loturile, precomenzile pe loturile lui |
| `/cont/investitor` | Dashboard investitor (investiții, contracte, cronologie – în etapa 4) |
| `/cont/gospodar/etichete`, `/cont/gospodar/ture/[id]` | Etichete QR (tipărire), ture de livrare: traseu, PIN, cereri curier, jurnal |
| `/livrare/[cod]`, `/livrare/c/[cod]` | Curierul (acces temporar, fără cont): tura și pagina coletului (QR „CURIER”) |
| `/confirmare/[cod]`, `/evaluare/[cod]` | Clientul (QR „CLIENT”): progresul turei, confirmarea cu 4 fotografii, satisfacția |
| `/admin/loturi` | Loturi: creare, modificare, închidere la precomenzi; locurile rezervate se calculează din precomenzi |
| `/cont/gospodar/documente` | Registrul de cheltuieli pe lot (cost / pasăre) și documentele (facturi, avize, DSV, contracte), cu SHA-256 |
| `/admin/documente`, `/admin/investitii` | Verificarea documentelor; investiții: creare, status, cronologie, contracte |
| `/cont/investitor/[id]` | Investiția: cronologie, contracte, transparența gospodăriei susținute (loturi, cheltuieli, documente) |
| `/fisiere/[id]` | Descărcarea documentelor, doar pentru cei îndreptățiți |
| `/admin/livrari`, `/admin/calitate` | Livrări live (toate turele, alerte, prelungiri, etichete) și calitatea pe verigi |
| `/admin` | Precomenzi (schimbare status), loturi, mesaje – doar pentru administratori |
| `/admin/utilizatori` | Conturi: creare, link de activare (copiere / WhatsApp), resetare parolă, dezactivare |
| `/admin/parteneri` | Solicitări de la gospodării și investitori: status, note interne; gospodăriile aprobate devin profiluri publice |
| `/admin/gospodarii` | Gospodării: editare (cele create din admin), ascundere/afișare pe site |
| `/admin/interes` | Cerere pe județe pentru produsele noi, comparată cu gospodăriile care le pot produce |
| `/api/loturi/[cod]` | API JSON de trasabilitate |

Parametri utili: `/precomanda?lot=PM-2612-A03&pui=12`, `/contact?subiect=partener`.

## Plata hranei (avans)

1. La precomandă, sumarul arată separat **avansul pentru hrană** (acum) și **carnea** (la livrare, după greutate).
2. După trimitere, clientul primește numărul și linkul secret **„Comanda mea”** (ecran, email dacă e configurat
   Resend, buton WhatsApp). Îl regăsește oricând la `/comanda` cu numărul + telefonul.
3. Gospodarul își completează în panou **titularul, IBAN-ul, banca și prețul furajului** (lei/kg). Avansul =
   pui × 6 kg × preț. Clientul vede datele după ce comanda are lot.
4. Clientul face transferul (detalii: „Hrana <număr comandă>”) și apasă **„Am făcut plata”**; gospodarul (sau adminul)
   apasă **„Confirm primirea”**. Statusul apare la client, la gospodar și în admin.

## Livrări

1. **Precomanda**: la livrarea la adresă, clientul pune obligatoriu pinul pe hartă (OpenStreetMap; căutare adresă,
   „Folosește locația mea”) și poate adăuga repere pentru curier.
2. **Adminul** alocă lotul precomenzii (dacă clientul a ales „primul disponibil”).
3. **Gospodarul** generează eticheta (QR „CURIER” + QR „CLIENT”, lot, data limită de consum); regenerarea
   invalidează codurile vechi. Etichetele apar automat în admin.
4. **Tura**: gospodarul alege coletele, data și termenul (ore); traseul se calculează automat (cel mai apropiat vecin
   + 2-opt, pornind de la gospodărie) și se poate ajusta. PIN-ul de ridicare se trimite șoferului pe WhatsApp.
5. **Curierul** (fără cont) deschide linkul turei: datele lui și ale mașinii (ATP), apoi PIN-ul de ridicare sau
   „cere confirmarea gospodarului”; își alege PIN-ul personal (reintrare). Pornire: plăcuță, kilometraj, temperatură
   (foto), igienă. Încărcare: scanează QR „CURIER” pe fiecare colet, 4 fotografii, temperatură. Predare: QR, temperatură
   (foto), semnătura clientului, GPS. Final: kilometraj. Prelungirea se cere cu motiv + dovadă și o aprobă adminul.
6. **Clientul** urmărește progresul (la fiecare livrare încheiată), confirmă primirea cu căsuțe + 4 fotografii
   (comparate cu cele de la ridicare), apoi notează gospodăria, curierul și Puii mei.
7. **Jurnalul** fiecărei ture (`tour-events`) se completează doar prin adăugare. Fotografiile se servesc prin
   `/foto/[id]` doar celor îndreptățiți (admin, gospodar, curierul turei, clientul cu codul lui).

Setări în `src/lib/delivery.ts` (prag 0–4 °C, ore de confirmare, încercări PIN etc.). Fotografiile sunt comprimate în
browser și stocate deocamdată în baza de date; pentru volum mare se mută pe Vercel Blob.

## Ramă „UNDER CONSTRUCTION” (site live)

Site-ul public are o bandă de construcție negru-galben pe margini, un text uriaș aproape transparent „UNDER
CONSTRUCTION” și eticheta „Site în construcție · lansăm curând”. Nu blochează nimic. Se scoate la lansare cu
`UNDER_CONSTRUCTION=0` (Vercel → Environment Variables), apoi Redeploy. Panourile (admin, conturi) nu au ramă.

## Mod „în construcție”

Ascunde site-ul de public până la lansare. Se activează din variabilele de mediu (Vercel → Environment Variables), apoi Redeploy:

| Variabilă | Valoare | Efect |
|---|---|---|
| `MAINTENANCE_MODE` | `1` | Vizitatorii văd doar pagina „Site în construcție”; Google e rugat să nu indexeze |
| `PREVIEW_KEY` | un cuvânt secret | `https://www.puiimei.ro/acces?cheie=<PREVIEW_KEY>` deschide site-ul complet pe acel dispozitiv, 30 de zile |

- `/acces?iesire=1` șterge accesul (vezi site-ul ca un vizitator).
- Conturile (`/cont/...`, `/admin`) rămân accesibile, cu autentificare.

## Conturi

- Roluri: **admin**, **gospodar** (legat de o gospodărie), **investitor**. Curierii nu au cont: primesc acces
  temporar pe fiecare tură (etapa 2).
- Primul administrator e cel din `ADMIN_USER` / `ADMIN_PASSWORD`; restul conturilor se creează din
  `/admin/utilizatori`. Persoana primește un link de activare și își alege parola (min. 10 caractere, litere și cifre).
- Sesiune semnată (`SESSION_SECRET`), cookie `httpOnly`, 14 zile. Dezactivarea unui cont sau setarea unei parole noi
  închide imediat sesiunile vechi. După 5 parole greșite, contul e blocat 15 minute.
- Parolele sunt salvate doar ca hash `scrypt`.
- Lansare: șterge `MAINTENANCE_MODE` (sau pune `0`) și fă Redeploy.

## Arhitectură

```
src/
  app/(site)/          paginile publice (cu meniu și footer) și server actions
  app/(panou)/         panourile de control: /admin, /cont/gospodar, /cont/investitor (meniu lateral, fără meniul site-ului)
  app/in-constructie/  pagina afișată în modul „în construcție”
  app/                 layout rădăcină, sitemap, robots, /acces
  components/          layout, ui, sections, forms, farms, lots (componente reutilizabile)
  data/                date pilot: gospodării, loturi, zone, pași, FAQ
  lib/
    domain.ts          modelul de domeniu (Farm, Lot, Preorder, DeliveryZone…)
    lots.ts            logica loturilor: etape, status, disponibilitate
    pricing.ts         estimarea prețului (34 lei/kg, 5 kg/pui – configurabil)
    validation/        scheme Zod (validare server + mesaje în română)
    seo.ts, site.ts    metadate, JSON-LD, date companie
  server/
    repositories/      acces la date (catalog, precomenzi, mesaje) – punct unic de înlocuire cu DB
    db/json-store.ts   stocare JSON pe disc (prima versiune)
    notifications.ts   punct de integrare email/SMS
    auth.ts            autentificare admin (temporar)
  proxy.ts             protecția /admin
prisma/schema.prisma   schema completă pentru PostgreSQL: utilizatori, gospodării, loturi,
                       jurnal de trasabilitate, precomenzi, livrări
```

**Statusul loturilor** (precomenzi deschise → în creștere → procesare → disponibil → livrat) se calculează automat din data de început și durata creșterii; paginile se regenerează la fiecare oră.

**Precomenzile** sunt validate pe server (Zod) și verificate față de locurile libere din lot. Nu există plăți online – intenționat, până la definirea fluxului comercial.

**Stocarea datelor** (`src/server/db/store.ts`):
- cu `DATABASE_URL` (sau `POSTGRES_URL`) → PostgreSQL, permanent; tabelul se creează automat;
- fără bază de date, local → `.data/*.json` (ignorat de git);
- fără bază de date, pe Vercel → `/tmp` (temporar; panoul admin afișează un avertisment).

Pe Vercel: proiect → **Storage** → **Create Database** → **Neon (Postgres)** → conectează la proiect, apoi Redeploy.

## Pașii următori recomandați

1. Bază de date relațională completă: activează `prisma/schema.prisma` (loturi, gospodării, livrări în tabele proprii).
2. Notificări: email de confirmare către client și alertă internă (`src/server/notifications.ts`).
3. Conturi clienți (Auth.js) și înlocuirea Basic Auth din admin.
4. Admin: CRUD gospodării/loturi, alocarea precomenzilor pe loturi, jurnal de creștere, planificare livrări.
5. Conținut real: fotografii (`public/images`), date companie (`src/lib/site.ts`), zone și prețuri.

> Datele despre gospodării și loturi sunt demonstrative (faza pilot).
