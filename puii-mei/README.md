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
| `/admin` | Panou inițial (precomenzi + schimbare status, loturi, mesaje), protejat cu Basic Auth |
| `/api/loturi/[cod]` | API JSON de trasabilitate |

Parametri utili: `/precomanda?lot=PM-2612-A03&pui=12`, `/contact?subiect=partener`.

## Arhitectură

```
src/
  app/                 rute, server actions (precomanda/actions.ts, contact/actions.ts, admin/actions.ts)
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

**Precomenzile** sunt validate pe server (Zod), verificate față de locurile libere din lot și salvate în `.data/preorders.json` (ignorat de git). Nu există plăți online – intenționat, până la definirea fluxului comercial.

## Pașii următori recomandați

1. Bază de date: activează `prisma/schema.prisma` și implementează repository-urile cu Prisma.
2. Notificări: email de confirmare către client și alertă internă (`src/server/notifications.ts`).
3. Conturi clienți (Auth.js) și înlocuirea Basic Auth din admin.
4. Admin: CRUD gospodării/loturi, alocarea precomenzilor pe loturi, jurnal de creștere, planificare livrări.
5. Conținut real: fotografii (`public/images`), date companie (`src/lib/site.ts`), zone și prețuri.

> Datele despre gospodării și loturi sunt demonstrative (faza pilot).
