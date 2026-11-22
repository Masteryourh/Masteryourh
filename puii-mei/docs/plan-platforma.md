# Puii mei – rezumatul deciziilor și planul platformei

Document de lucru: tot ce s-a stabilit până acum, ce e implementat și ce urmează.

## 1. Modelul de business

- **Puii mei este platformă și consultant**, nu producător și nu intermediar. Gospodăriile partenere cresc,
  sacrifică și vând **direct clientului**; Puii mei preia precomenzile, oferă consultanță și publică trasabilitatea.
- **Plata**: clientul plătește **un avans = puii de o zi + furajul** (aprox. 6 kg / pui), **direct în contul
  gospodăriei**. Avansul **se scade din prețul total** (greutate × preț/kg); la livrare plătește doar diferența,
  după greutatea reală.
- **Sacrificare tradițională**, în gospodăria în care au crescut puii (nu se mută între gospodării).
- **Intenția proiectului**: munca din gospodărie să devină un venit stabil și legal, fără ca gospodarul să plece de
  acasă. Fiecare gospodar are un **contract de consultanță**: intrarea în legalitate (producător local, atestat, DSV),
  taxe și contabilitate, plăți și facturare, gestiune și administrare completă.
- **Pilot**: Bucovina de munte, județul Suceava (Vama, Fundu Moldovei, Vatra Moldoviței; livrare în Câmpulung
  Moldovenesc, Vatra Dornei, Gura Humorului, Suceava, Rădăuți).
- **Extindere**: curcani, rațe, fazani, legume din seră, în funcție de regiune (deocamdată „În curând” + măsurarea
  cererii pe județe).

## 1b. Modelul de creștere (stabilit pe 22 nov. 2026)

- **Terminologie**: spunem **țarc** (nu „cușcă”) – în platformă, pe site și în comunicare.
- **Sistem**: pui pășunați în **țarc mobil de 4 × 3 m**, mutat zilnic pe suprafață nouă; suprafața se reface în
  **14 zile** ⇒ un țarc are nevoie de ~14 × 12 m² = **~168 m² de pășune** (+ rezervă). **40 de pui / țarc.**
- **Etape**: 0–21 zile la interior (becuri roșii, pat de rumeguș) → de la **21 de zile** în țarcul de pe pășune →
  **60 de zile** sacrificare (tradițional, în gospodărie). Ciclu complet 60–70 de zile.
- **Capacitatea gospodăriei** = numărul de țarcuri pe care le permite terenul × 40 (ex. Mureșan: 5 țarcuri ⇒ 200 pui / lot).
- **Un lot pe rând** în fiecare gospodărie; lotul următor începe după încheierea celui curent (60–70 zile).
  Mai multe loturi simultane doar dacă legea permite (de verificat).
- **Țarcurile ca subloturi**: precomenzile se strâng până la **cel puțin 40 de pui** (un țarc plin) și pornește
  creșterea acelui țarc; al doilea țarc pornește când se adună încă 40 etc. Pornirile din același lot să nu fie prea
  distanțate (pui de vârste apropiate).
- **Greutate**: ~4,8 kg în viu; puiul sacrificat ≈ 70% ⇒ **~3,4 kg carcasă** (prețul se calculează pe carcasă).
- **Furaj**: randament de asimilare ~70% ⇒ 4,8 / 0,7 ≈ **6,9 kg furaj / pui** (intră în avans).
- **Preț la client**: prețul pieței + 20–30% (acum 30 lei/kg + 20% = **36 lei/kg**).
- **Investiția în gospodărie** (o dată, amortizată în timp): spațiul pentru 1–21 zile, țarcurile, echipamentele pentru
  toate etapele și pentru sacrificare (opăritor, deplumator, conuri, masă inox, ladă frigorifică pentru păstrare
  scurtă). **Gospodarul plătește investiția în tranșe.**
- **Clienți**: comenzi mici pentru consum imediat și comenzi mari pentru congelator (consum ulterior).
- **Scop**: venit mai mare în gospodăria țărănească și acces la produse de calitate.
- **Pe viitor**: orice se produce în gospodărie poate fi precomandat (borcane, afumături, păstrăvi etc.).

## 2. Implementat (site public + administrare)

- Site: homepage, cum funcționează (cine ce face), gospodării, trasabilitate pe lot, despre noi (intenția și programul
  pentru gospodari), contact, confidențialitate, devino partener (gospodării și investitori), produse în curând.
- Precomandă cu estimare de preț, hrană în avans, zone de livrare din Bucovina; PostgreSQL (Neon) pentru date.
- Admin: precomenzi, solicitări parteneri (gospodării + investitori), gospodării (creare din solicitare, editare,
  ascundere), interes produse, utilizatori.
- Mod „în construcție” (`MAINTENANCE_MODE`) cu link secret de previzualizare; domeniul www.puiimei.ro.
- Logo: pui rotisat, desen original.
- **Etapa 1 – conturi**: admin, gospodar, investitor; email + parolă; invitații cu link de activare (WhatsApp);
  dashboard gospodar și investitor.

### Comanda mea și plata hranei (implementat)
- Link secret „Comanda mea” pentru fiecare precomandă (fără cont) + căutare după număr și telefon; butoane „Comanda mea”
  și „Contul meu” în header.
- Avansul pentru hrană: datele de plată ale gospodăriei (IBAN, preț furaj), „Am făcut plata” la client, „Confirm
  primirea” la gospodar/admin. Fără plăți online.

## 3. Etapa 2 – livrări (implementată)

### Precomanda
- La livrarea la adresă, clientul **pune sau corectează pinul pe hartă** (obligatoriu). Coordonatele se folosesc la
  traseu și la navigație; poziția de la prima livrare reală se salvează la adresa clientului.

### Etichetele coletelor
- Le **generează gospodarul**, din contul lui; apar automat în admin și se salvează la comandă / lot.
- Pe etichetă: număr comandă, client, zonă, pui, **lot, data de expirare**, două coduri QR: **CURIER** și **CLIENT**.
- Regenerarea unei etichete invalidează codurile vechi (rămân în istoric, marcate „înlocuită”).

### Tura de livrare
- Creată de **gospodar** (pentru comenzile lui) sau de **admin**: data, comenzile, durata permisă.
- **Traseu optim generat automat** din coordonatele clienților, pornind de la gospodărie; ordinea se poate ajusta
  manual. Curierul deschide traseul în Google Maps.
- **Termen de livrare**: accesul curierului e limitat la un număr de ore de la ridicare. **Prelungirea** se cere cu
  motiv, descriere și dovadă (foto + GPS) și se aprobă doar de admin.

### Accesul curierului (fără cont)
- **PIN de ridicare**: generat în contul gospodarului, predat personal la ridicare sau trimis pe WhatsApp (rămâne
  salvat la șofer). Introducerea lui **împerechează temporar** gospodarul cu șoferul pentru acea tură.
- Șoferul poate **cere PIN-ul**: mesaj WhatsApp către gospodar cu link de confirmare; gospodarul apasă „Confirm”.
- Apoi șoferul își alege **PIN-ul personal** (4 cifre); dacă închide pagina, rescanează orice QR „Curier” al turei și
  intră cu PIN-ul lui. După 5 PIN-uri greșite: blocare, deblocare de gospodar/admin.
- Totul expiră la finalul turei.

### Date înregistrate de curier
- La pornire: nume, telefon, mașina (nr. înmatriculare + foto, tip), **certificat ATP**, kilometraj (foto),
  temperatura compartimentului (foto), igienă.
- La ridicare: fiecare colet scanat (QR „Curier”) cu **4 fotografii** (4 laturi), temperatura mărfii; ora și lotul
  automat.
- La fiecare livrare: temperatura (foto), **GPS**, ora, **semnătura clientului**.
- La final: kilometraj (foto), observații.
- **Lanț de frig**: prag configurabil (0–4 °C); depășirea = alertă.

### Clientul
- Vede progresul turei („curierul a predat 2 din 5”), ora ridicării, temperatura și pozele de la ridicare.
- La primire scanează QR „Client”: **listă de verificare** (pui, ambalaj, rece, aspect/miros) + **4 fotografii ale
  acelorași laturi**; nu se mai poate modifica după trimitere; apoi **lista de satisfacție** (note pentru
  gospodărie, curier, Puii mei).

### Admin
- **Livrări live** (semi-live: se actualizează la fiecare livrare încheiată): cronologia tuturor turelor, alerte
  (temperatură, întârzieri, PIN-uri greșite), cereri de prelungire.
- **Jurnal complet și nemodificabil** pentru fiecare tură; comparație foto ridicare ↔ primire; raport „Calitate”.

## 4. Etapa 3 – dashboard gospodar
- Loturi, comenzi, calitate; **registrul de cheltuieli pe lot** cu documente justificative; facturi, avize,
  documente contabile, înregistrări DSV, contracte – toate descărcabile și verificabile (cine, când a încărcat).

## 5. Etapa 4 – dashboard investitor
- Investiții (sumă, dată, obiect, status), contracte și acte descărcabile, cronologie, rapoarte.

## 6. De configurat / de verificat
- Implementat fără servicii externe: hartă OpenStreetMap, traseu calculat local, navigație prin link Google Maps,
  poze în baza de date. De adăugat ulterior: notificări automate (email/WhatsApp Business API), Google pentru
  geocodare și distanțe reale pe drum.
- Vercel: `SESSION_SECRET`; **Vercel Blob** (fișiere – documente; pozele pornesc în baza de date);
  **cheie Google Maps** (opțional: geocodare și trasee mai precise; fără ea se folosesc OpenStreetMap și un calcul
  propriu al traseului); **Resend** (emailuri automate); WhatsApp Business API (opțional, mesaje automate).
- Juridic: rolul de consultant vs. intermediar, vânzarea directă și sacrificarea în gospodărie, confirmarea primirii
  (nu limitează drepturile consumatorului), formularea pentru investitori, GDPR (poziții GPS, fotografii, documente).
