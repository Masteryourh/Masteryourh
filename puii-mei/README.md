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
| `/` | Homepage: hero, propunere de valoare, 5 pași, loturi deschise, gospodării, căutare lot, FAQ |
| `/cum-functioneaza` | Procesul detaliat în 5 pași + ce gestionăm noi |
| `/precomanda` | Formular: cantitate, lot, zonă livrare, date contact, preț estimat live, confirmare cu număr |
| `/gospodarii`, `/gospodarii/[slug]` | Gospodării partenere: localizare, fotografii, practici, loturi |
| `/trasabilitate`, `/trasabilitate/[cod]` | Căutare după cod lot, etape, status, dată estimată |
| `/despre-noi`, `/contact`, `/confidentialitate` | Misiune, formular contact, GDPR |
| `/devino-partener` | Aplicare ca gospodărie parteneră sau ca investitor (`#gospodarie` / `#investitor`) |
| `/in-curand` | Produse în curând (curcani, rațe, fazani, legume din seră) + formular „Anunță-mă” |
| `/admin` | Precomenzi (schimbare status), loturi, mesaje – protejat cu Basic Auth |
| `/admin/parteneri` | Solicitări de la gospodării și investitori: status, note interne; gospodăriile aprobate devin profiluri publice |
| `/admin/gospodarii` | Gospodării: editare (cele create din admin), ascundere/afișare pe site |
| `/admin/calitate` | Confirmări de primire și satisfacție: note medii (gospodărie, curier, Puii mei), probleme semnalate |
| `/curier`, `/curier/livrare/[cod]` | Livrările curierului; pagina deschisă din QR-ul „Curier” de pe colet |
| `/confirmare/[cod]`, `/evaluare/[cod]` | Confirmarea primirii (QR „Client”, cu 4 fotografii) și lista de satisfacție |
| `/admin/interes` | Cerere pe județe pentru produsele noi, comparată cu gospodăriile care le pot produce |
| `/api/loturi/[cod]` | API JSON de trasabilitate |

Parametri utili: `/precomanda?lot=PM-2612-A03&pui=12`, `/contact?subiect=partener`.

## Livrare și confirmarea primirii

1. **Etichetă** – în admin, la fiecare precomandă, „Etichetă QR” deschide o etichetă de 15 × 10 cm cu două coduri QR,
   de tipărit și lipit pe colet.
2. **QR „Curier”** → `/curier/livrare/<cod>` (cont de curier: `COURIER_USER` / `COURIER_PASSWORD`; adminul are și el
   acces). Curierul apasă „Livrat”: precomanda devine livrată, pornește termenul de confirmare
   (`CONFIRMATION_WINDOW_HOURS`, 12 ore) și clientul primește linkul și pe email (dacă e configurat Resend).
   Lista tuturor livrărilor: `/curier`.
3. **QR „Client”** → `/confirmare/<cod>`: lista de verificare (număr de pui, ambalaj intact, carne rece, aspect și
   miros) + 4 fotografii ale coletului (comprimate în browser). Dacă ceva nu e în regulă, descrierea problemei e
   obligatorie. După trimitere nu se mai poate modifica.
4. **Satisfacție** – trimiterea deschide imediat `/evaluare/<cod>` (mulțumire + note 1–5 pentru gospodărie, curier și
   Puii mei, valabil `RATING_WINDOW_DAYS`).
5. **Admin** – starea fiecărei confirmări în tabelul de precomenzi, detalii și fotografii la `/admin/confirmare/<id>`,
   mediile și problemele la `/admin/calitate`.

Pentru ca nota să ajungă la gospodăria corectă, alocă lotul precomenzii înainte de a tipări eticheta.

## Mod „în construcție”

Ascunde site-ul de public până la lansare. Se activează din variabilele de mediu (Vercel → Environment Variables), apoi Redeploy:

| Variabilă | Valoare | Efect |
|---|---|---|
| `MAINTENANCE_MODE` | `1` | Vizitatorii văd doar pagina „Site în construcție”; Google e rugat să nu indexeze |
| `PREVIEW_KEY` | un cuvânt secret | `https://www.puiimei.ro/acces?cheie=<PREVIEW_KEY>` deschide site-ul complet pe acel dispozitiv, 30 de zile |

- `/acces?iesire=1` șterge accesul (vezi site-ul ca un vizitator).
- `/admin` rămâne accesibil cu utilizator și parolă.
- Lansare: șterge `MAINTENANCE_MODE` (sau pune `0`) și fă Redeploy.

## Arhitectură

```
src/
  app/(site)/          paginile publice (cu meniu și footer) și server actions
  app/in-constructie/  pagina afișată în modul „în construcție”
  app/                 layout rădăcină, sitemap, robots, /acces
  components/          layout, ui, sections, forms, farms, lots (componente reutilizabile)
  data/                date pilot: gospodării, loturi, zone, pași, FAQ
  lib/
    domain.ts          modelul de domeniu (Farm, Lot, Preorder, DeliveryZone…)
    lots.ts            logica loturilor: etape, status, disponibilitate
    pricing.ts         estimarea prețului (34 lei/kg, 2,2 kg/pui – configurabil)
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
