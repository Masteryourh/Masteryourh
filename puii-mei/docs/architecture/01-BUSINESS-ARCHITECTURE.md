# PUII MEI — 01 BUSINESS ARCHITECTURE

**Versiune:** 0.1 — design de business pentru revizuire  
**Stare:** DRAFT, fără validare juridică/fiscală/sanitar-veterinară  
**Surse interne:** `docs/plan-platforma.md`, `docs/architecture/00-SYSTEM-CONSTITUTION.md`, `docs/TEAM-WORKFLOW.md`, `README.md`.  
**Regulă:** [DECIS] = confirmat de fondator; [PLAN] = descris în documentele existente, necesită reconciliere; [PROPUS] = recomandare de proiectare; [VALIDARE] = depinde de profesioniști/autoritate sau decizie suplimentară.

## 1. Teza de business și obiectivul operațional

**[DECIS]** PUII MEI este compania care organizează și administrează activitatea economică a gospodăriilor partenere. Identifică programe de producție adaptate spațiului și resurselor, organizează formalizarea legală și administrarea curentă, atrage clienți înaintea producției și asigură transparența evoluției comenzilor. Gospodarul se concentrează pe producție.

**[DECIS]** PUII MEI este remunerată **exclusiv de gospodării**, pentru consultanță, administrare, hosting, monitorizare, marketing și alte servicii contractate. Nu percepe prețul produselor de la consumatorul final.

**[DECIS]** Fondurile comerciale sunt în contul gospodăriei: clientul plătește avansul acolo, iar din contul gospodăriei sunt plătite păsările de o zi, furajele, contabilitatea și alte cheltuieli. PUII MEI operează administrativ și, numai când există mandat și mecanism bancar permis, inițiază/execută plăți în numele gospodăriei.

**[DECIS]** Contabilitatea se externalizează; PUII MEI coordonează prestatorul și achitarea facturilor din fondurile gospodăriei.

**[DECIS]** Compania organizează proactiv conformitatea întregului proces. Aceasta nu anulează răspunderea legală proprie a gospodăriei și nu garantează în mod absolut absența neconformităților.

## 2. Propunerea de valoare

### Pentru gospodărie
- Un punct unic de administrare: evaluare, formalizare, contracte, conformitate, evidențe, contabilitate externalizată, aprovizionare, clienți, logistică și raportare.
- Programe productive cu condiții de eligibilitate, investiție, cost, muncă, risc și venit **estimat**, nu garantat.
- Acces la precomenzi și monitorizare financiară transparentă.
- Interfață mobilă pentru acțiunile care necesită prezență fizică și dovezi din teren.

### Pentru client
- Cumpără produse de la producătorul identificat, printr-un proces digital administrat de PUII MEI.
- Primește termen estimat, preț/avans conform contractului, actualizări verificate despre lot și dovada livrării.
- Cunoaște clar vânzătorul, condițiile de anulare, reclamațiile și persoana responsabilă.

### Pentru PUII MEI
- Venituri B2B recurente sau per program/lot, de stabilit contractual.
- Economii de scară prin administrare centralizată, standardizare și prestatori externi.
- Control operațional prin Central Command, fără amestecarea banilor gospodăriilor cu veniturile companiei.

## 3. Actori, contracte și autoritate

| Actor | Relație principală | Încasează / plătește | Responsabilități |
|---|---|---|---|
| Gospodăria / entitatea economică | Contract de administrare cu PUII MEI; contract comercial cu clientul | Încasează produse; plătește furnizori și servicii | Producție, obligații proprii, evidențe din teren |
| PUII MEI | Prestator B2B, reprezentant în limita mandatului | Încasează doar servicii de la gospodărie | Administrare, coordonare, marketing, documentare, monitorizare |
| Client final | Contract comercial cu gospodăria, prin canalul digital | Plătește gospodăriei | Comandă, plată, recepție |
| Contabil / firmă contabilă | Prestator extern contractat pentru gospodărie [PROPUS] | Plătit de gospodărie | Acte profesionale contabile și fiscale asumate |
| Furnizor pui/furaje/echipamente | Relație comercială cu gospodăria | Încasează de la gospodărie | Bunuri, facturi, calitate |
| Transportator / procesator | Relație contractuală de stabilit | De stabilit | Operațiuni doar în condiții autorizate |
| Specialist conformitate | Contract/mandat conform rolului | De stabilit | Evaluări și avize în aria competenței |

**[VALIDARE]** Forma juridică a gospodăriei nu se presupune automat a fi SRL; eligibilitatea și forma potrivită depind de activitate, volum, regim fiscal și norme aplicabile. PUII MEI organizează formalizarea prin proceduri și profesioniști competenți.

**[PROPUS] Pachet contractual minim:** (a) contract de servicii și SLA PUII MEI–gospodărie; (b) mandat de reprezentare cu limite de autoritate și revocare; (c) contract/termeni comerciali gospodărie–client; (d) contracte cu contabilul, furnizorii și transportatorii; (e) acorduri de prelucrare date unde sunt necesare. Necesitatea unui contract tripartit rămâne [VALIDARE], nu se impune automat.

## 4. Fluxuri financiare — fără amestec de fonduri

### F1. Avans client → gospodărie
1. Clientul acceptă termenii și trimite precomanda.
2. Sistemul generează instrucțiuni de plată în contul gospodăriei și referință unică.
3. Clientul declară plata; această declarație nu reprezintă confirmare bancară.
4. Beneficiarul sau integrarea bancară autorizată confirmă încasarea.
5. Suma se asociază comenzii, gospodăriei și lotului; soldul este vizibil în Central Command.

### F2. Gospodărie → furnizori
1. Program Engine calculează necesarul; operatorul verifică prețul, cantitatea și disponibilul.
2. Se pregătește ordinul de plată în numele gospodăriei.
3. Se aplică regulile mandatului, drepturile bancare și limitele de autorizare.
4. Plata este executată prin mecanism legal și reconciliată cu extrasul/documentul.
5. Documentele se asociază lotului și categoriei de cost.

### F3. Gospodărie → contabilitate externă
1. Prestatorul emite factura către entitatea contractuală.
2. PUII MEI verifică documentul și scadența.
3. Plata se autorizează și se operează din contul gospodăriei.
4. Contabilul primește documentele necesare, cu acces limitat și jurnalizat.

### F4. Gospodărie → PUII MEI
1. PUII MEI facturează serviciile definite în contract.
2. Gospodăria achită din propriul cont.
3. Sistemul păstrează distinct creanța și încasarea PUII MEI de tranzacțiile comerciale ale gospodăriei.

### F5. Sold final client → gospodărie
**[PLAN]** Prețul final este determinat după greutatea reală; avansul confirmat se deduce, iar diferența se plătește gospodăriei. Regula de calcul, ajustările, anulările și rambursările necesită termeni contractuali și verificare legală.

**Invariante [PROPUS]:** fiecare mișcare are titular, beneficiar, cauză, lot/comandă, document, status, autor și referință externă; nu se confirmă bani doar prin click; nicio plată duplicată; nicio operațiune bancară peste mandat; corecții prin înregistrări de rectificare, nu ștergere.

## 5. Lifecycle gospodărie — Household OS

| Stare | Condiție de intrare | Rezultat | Gate |
|---|---|---|---|
| LEAD | Cerere de parteneriat | Profil preliminar | Consimțământ/informare date |
| ASSESSMENT | Evaluare teren, spații, resurse, timp, capacitate | Raport de eligibilitate | Evaluare umană |
| LEGAL_SETUP | Alegere formă juridică, contracte, mandat | Dosar de formalizare | Specialist competent |
| COMPLIANCE_PENDING | Verificare cerințe specifice programului | Checklist cu dovezi și termene | Compliance Gate |
| READY | Cerințe obligatorii validate | Gospodărie eligibilă pentru program | Aprobare explicită |
| ACTIVE | Program contractat, capacitate și clienți | Producție și raportare | Monitorizare continuă |
| SUSPENDED | Expirare, incident sau neconformitate relevantă | Operațiuni afectate blocate | Remediere și revalidare |
| EXITED | Contract încetat și obligații închise | Arhivare, export și retenție | Închidere auditată |

**[PROPUS]** Eligibilitatea este per program, nu un singur buton „gospodărie legală”. O gospodărie poate fi eligibilă pentru un program și neeligibilă pentru altul.

## 6. Lifecycle program economic — Program Engine

1. Catalogul descrie activitatea, spațiul necesar, investiția, condițiile legale, furnizorii, munca, costurile, riscurile și scenariile de venit.
2. Gospodăria declară resursele; PUII MEI verifică în teren și evaluează potrivirea.
3. Se calculează capacitatea **validată**, nu doar capacitatea teoretică.
4. Se verifică Compliance Gate și finanțarea/echipamentele.
5. Marketplace colectează cerere/precomenzi; politica de prag de pornire este specifică programului.
6. Se alocă comenzile și se pornește producția numai după verificarea condițiilor comerciale, financiare și de conformitate.
7. Gospodarul raportează progres, efective, mortalitate, consum, fotografii și incidente.
8. Se organizează procesarea/livrarea legală, se reconciliază plățile și se închide lotul.
9. Se calculează rentabilitatea reală și se compară cu estimarea inițială.

**[PLAN — pilot pui]** Țarc mobil 4×3 m, 40 pui/țarc, ciclu 60–70 zile și producție în Bucovina. Sunt ipoteze din plan, nu norme validate. **Atenție:** documentele existente diferă la furajul estimat (6 kg vs aproximativ 9,8 kg/pui), greutate și preț; nu codificăm aceste valori drept adevăr unic până la reconciliere.

## 7. Lifecycle client — Marketplace & Traceability

**[PROPUS]** `DRAFT → SUBMITTED → AWAITING_ALLOCATION → ALLOCATED → AWAITING_ADVANCE → ADVANCE_CONFIRMED → PRODUCTION → READY_FOR_DELIVERY → IN_DELIVERY → DELIVERED → CLOSED`. Anulare, rambursare, reclamație și incident sunt ramuri distincte, cu reguli per stare.

**[PLAN]** Clientul nu alege implicit lotul: sistemul încearcă prima gospodărie disponibilă care poate primi întreaga comandă; dacă nu există, clientul alege împărțirea în mai multe gospodării sau așteptarea. La împărțire există obligații comerciale și plăți distincte per gospodar.

**[PROPUS]** Progresul vizibil clientului provine din evenimente verificabile ale lotului și comenzii; nu se prezintă drept certitudine o etapă doar estimată. Datele altor clienți și informațiile interne ale gospodăriei rămân private.

## 8. Compliance Gate — mecanism operațional

Pentru fiecare combinație `gospodărie × program × activitate × regiune`, registrul de conformitate conține:
- `requirement_id`, versiune, bază legală verificată, autoritate competentă, domeniu și condiție de aplicare;
- dovadă, emitent, data emiterii, expirare, responsabil, verificator, data ultimei verificări;
- stare `NOT_APPLICABLE / MISSING / UNDER_REVIEW / VALID / EXPIRED / REJECTED`;
- acțiuni corective, termen, impact asupra programului și istoric imuabil.

**[PROPUS]** Activarea programului necesită toate cerințele obligatorii în stare VALID sau NOT_APPLICABLE justificat. Expirarea ori incidentul relevant blochează acțiunile cu risc; deblocarea cere verificare umană. Sistemul nu inventează autorizări și nu substituie controlul autorităților.

**[VALIDARE]** Înainte de pilot, un jurist și specialiștii sanitar-veterinari/fiscali trebuie să confirme lista reală de cerințe pentru fiecare operațiune: creștere, sacrificare, procesare, ambalare, depozitare, vânzare și transport.

## 9. Central Command — responsabilități și delegare

**[PROPUS]** Central Command orchestrează task-uri și alerte, dar nu devine un registru financiar paralel. Modulele dețin datele și regulile proprii; evenimentele asigură vizibilitatea inter-module.

| Eveniment | Automatizare posibilă | Aprobare umană |
|---|---|---|
| Gospodărie nouă | Dosar, checklist, solicitare documente | Validare identitate și eligibilitate |
| Avans declarat | Notificare, reconciliere propusă | Confirmare dacă nu există dovadă bancară |
| Prag de precomenzi | Propunere aprovizionare | Lansare producție și angajare cheltuieli |
| Factură furnizor | Clasificare, pregătire plată | Autorizare conform mandatului/băncii |
| Autorizație expirată | Alertă, blocare operațiuni relevante | Revalidare |
| Incident temperatură | Alertă și carantină operațională | Decizie persoană competentă |
| Lot închis | Calcul costuri, raport, propunere factură servicii | Verificare financiară |

## 10. Model economic și KPI

**[PROPUS]** Pentru fiecare program/lot se măsoară: venit brut gospodărie, avansuri, sold final, costuri directe, costuri indirecte, cost contabilitate, cost PUII MEI, pierderi, profit estimat și profit realizat, ore de muncă, reclamații, mortalitate, respectarea termenelor și gradul de utilizare a capacității.

**[VALIDARE]** Formula remunerației PUII MEI (abonament, tarif per lot, procent din vânzări sau combinație), baza de calcul, TVA, scadențele și serviciile incluse rămân de decis. Ipoteza anterioară de ~10% nu este încă tarif aprobat.

## 11. Riscuri și controale

| Risc | Control propus |
|---|---|
| Confuzie între titularul fondurilor și operator | Conturi distincte, mandate, registru operațiuni, reconciliere |
| Acces bancar neautorizat / servicii de plată reglementate | Verificare juridică și bancară; delegare limitată; fallback aprobare gospodar |
| Program activat fără condiții legale | Compliance Gate și verificator competent |
| Promisiuni de venit nerealiste | Scenarii, costuri complete, riscuri, rezultate reale |
| Supravânzare capacitate | Rezervări tranzacționale, idempotency, blocare concurentă |
| Lipsă trasabilitate / incident alimentar | Evenimente, documente, loturi, blocare și recall |
| Expunere date financiare/personale | RBAC/ABAC, izolare per gospodărie, audit și retenție |
| Dependență de un singur prestator | Contracte, SLA, substituire și proceduri de continuitate |

## 12. Decizii obligatorii înainte de proiectarea detaliată

| ID | Întrebare | Stare / proprietar |
|---|---|---|
| BA-001 | Ce formă juridică și ce regim se potrivesc gospodăriilor din pilot? | VALIDARE jurist + contabil |
| BA-002 | Cum arată mandatul PUII MEI, ce poate semna și ce poate plăti? | VALIDARE jurist + bancă |
| BA-003 | Care este traseul legal complet pentru sacrificare, procesare și livrare? | VALIDARE DSVSA + specialist |
| BA-004 | Ce contracte încheie gospodăria cu clientul și prestatorii? | VALIDARE jurist |
| BA-005 | Ce tarif plătește gospodăria PUII MEI și când? | DECIZIE fondator |
| BA-006 | Cine contractează transportul și cine răspunde pe fiecare verigă? | DECIZIE + VALIDARE |
| BA-007 | Care sunt regulile avansului, anulării, rambursării și diferenței finale? | DECIZIE + VALIDARE |
| BA-008 | Cum se rezolvă discrepanțele de greutate, furaj și preț între documente? | DECIZIE + test economic |
| BA-009 | Ce program, gospodării și volume intră în pilot? | DECIZIE fondator |
| BA-010 | Ce date și documente poate vedea fiecare actor? | DECIZIE + GDPR |

## 13. Criterii de acceptanță pentru arhitectura de business

- [ ] Fondatorul confirmă modelul actorilor, proprietatea fondurilor și remunerația B2B.
- [ ] Contractele și mandatele sunt revizuite juridic.
- [ ] Fluxurile bancare sunt validate cu prestatorul financiar ales.
- [ ] Compliance Gate este populat cu cerințe reale, verificabile, pentru pilot.
- [ ] Modelul economic al unui lot este reconciliat cu date/estimări justificabile.
- [ ] Claude Code primește doar specificații aprobate pentru implementare.
- [ ] Fiecare flux critic are owner, statusuri, erori, dovezi și teste asociate.

**Următoarele livrabile propuse:** `02-OPERATIONAL-ARCHITECTURE.md`, `04-DATABASE-ARCHITECTURE.md` și registrul ADR; ordinea depinde de închiderea BA-001–BA-008.
