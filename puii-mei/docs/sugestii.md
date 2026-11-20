# Sugestii uitate

Listă de sugestii și pași rămași, adunați din discuții. La expresia **„sugestii uitate”** se citește lista și se
actualizează (se bifează ce s-a făcut, se adaugă ce apare nou).

_Ultima actualizare: 20 noiembrie 2026_

## De construit (etapele următoare)

- [ ] **Etapa 3 – gospodar:** registrul de cheltuieli pe lot, cu documente justificative descărcabile și verificabile
      (facturi, avize, documente contabile, înregistrări DSV, contracte; cine și când a încărcat). Necesită Vercel Blob.
- [ ] **Etapa 4 – investitor:** investiții (sumă, dată, obiect, status), contracte și acte descărcabile, cronologie,
      rapoarte.
- [ ] **Notificări automate** către client, gospodar și admin (email, eventual WhatsApp Business API): precomandă
      nouă, plată anunțată, plată confirmată, livrare programată.
- [ ] **Pozele de la livrări** mutate pe Vercel Blob când crește volumul (acum stau în baza de date).
- [ ] **Google Maps** (opțional): geocodare și distanțe reale pe drum pentru trasee (acum OpenStreetMap + calcul propriu).
- [ ] **Bază de date relațională completă** (schema Prisma) când crește volumul de date.

## De configurat (Vercel / servicii)

- [ ] **SESSION_SECRET** în Vercel → Environment Variables (o valoare lungă, aleatorie), apoi Redeploy.
- [ ] **Resend** (`RESEND_API_KEY`, `EMAIL_FROM`, ex. „Puii mei <comenzi@puiimei.ro>”): emailul cu linkul
      „Comanda mea” și celelalte emailuri pleacă doar după configurare.
- [ ] **Vercel Blob** pentru fișiere (necesar la etapa 3).
- [ ] **Conectorul Higgsfield** (imagini/video AI): claude.ai/customize/connectors, apoi sesiune nouă.

## De completat pe site

- [ ] **Datele de plată ale fiecărei gospodării** (titular, IBAN, bancă, preț furaj): Contul meu → Vedere gospodar →
      „Contul pentru avansul de hrană”. Fără ele, clienții nu pot plăti avansul.
- [ ] **Prețul implicit al furajului:** 3,50 lei/kg e orientativ (`src/lib/pricing.ts`); de confirmat valoarea reală.
- [ ] **Date reale ale companiei** în `src/lib/site.ts`: telefonul e încă `+40 700 000 000`, firma „în curs de
      înființare”.
- [ ] **Fotografii reale** ale gospodăriilor în `public/images/gospodarii/` (acum se afișează imagini de rezervă).
- [ ] **Datele gospodăriilor și loturilor** sunt demonstrative (pilot); de înlocuit cu cele reale.
- [ ] **Conturile** gospodarilor și investitorilor, create din Admin → Utilizatori și trimise pe WhatsApp.

## De verificat juridic

- [ ] Rolul de consultant vs. intermediar; vânzarea directă și sacrificarea în gospodărie.
- [ ] Plata avansului pentru hrană direct gospodăriei (contract, chitanță/factură).
- [ ] Confirmarea primirii la livrare (să nu limiteze drepturile consumatorului).
- [ ] Formularea pentru investitori.
- [ ] GDPR: poziții GPS, fotografii, semnături, documente.

## La lansare

- [ ] Oprirea modului „în construcție”: `MAINTENANCE_MODE` șters (sau `0`) în Vercel, apoi Redeploy.
