# PUII MEI — 00 SYSTEM CONSTITUTION

**Versiune:** 0.1.0 — propunere pentru revizuire  
**Statut:** DRAFT; nu este aprobare juridică, operațională sau de lansare  
**Bază:** `docs/plan-platforma.md`, `README.md`, `docs/architecture/MASTER-TECHNICAL-SPECIFICATION.md`, `docs/audit/REAUDIT-2026-11-22.md`  
**Scop:** regulile fundamentale pentru toate modulele, interfețele, integrările și agenții AI ai platformei.

> Convenții: **[CONFIRMAT]** apare în documentele proiectului sau în direcția de business comunicată; **[PROPUS]** este o normă arhitecturală recomandată, încă neaprobată; **[DESCHIS]** necesită decizie explicită ori validare externă. Prezența în cod nu înseamnă funcționare verificată.

## 1. Misiune și limite

**SC-001 [CONFIRMAT]** PUII MEI urmărește să coordoneze o rețea de gospodării producătoare independente, începând cu pui de carne crescuți la precomandă. Website-ul public este o interfață, nu întregul sistem.

**SC-002 [CONFIRMAT / DE FORMALIZAT]** Gospodăria este operatorul producției. PUII MEI urmărește să asigure administrare, consultanță și reprezentare operațională permanentă în limitele mandatului acordat. Reprezentarea juridică efectivă, obligațiile și limitele trebuie definite contractual.

**SC-003 [DESCHIS]** Documentul `plan-platforma.md` descrie vânzarea directă de către gospodar și avansul plătit direct în contul gospodăriei; direcția ulterioară descrie contract tripartit și reprezentare operațională. Aceste variante nu se unifică prin presupunere: decizia finală se înregistrează în ADR și este validată juridic.

**SC-004 [PROPUS]** Niciun modul nu poate transforma tacit PUII MEI în proprietar al păsărilor, comerciant al cărnii, procesator, transportator sau beneficiar al încasărilor. Fiecare rol economic și legal trebuie să fie explicit în contract și modelul de date.

**SC-005 [PROPUS]** Conformitatea sanitar-veterinară, sacrificarea, procesarea, transportul, lanțul de frig, fiscalitatea și protecția consumatorului sunt condiții de lansare validate de specialiști și autorități competente; UI-ul nu poate substitui autorizațiile.

## 2. Actori și responsabilități

| Actor | Rol de principiu | Limită |
|---|---|---|
| Gospodar | Creștere, raportare efective și activități de producție | Doar gospodăria/loturile proprii |
| Client | Precomandă, contract, avans, urmărire, recepție | Doar propriile comenzi și date permise |
| PUII MEI / Admin | Coordonare și administrare conform mandatului | Fără drepturi nelimitate implicite |
| Manager operațional | Alocări, planificare, excepții | Permisiuni acordate explicit |
| Financiar | Evidență, reconciliere, raportare | Fără modificări nedetectabile |
| Calitate | Verificări, incidente, blocări | Deciziile reglementate rămân la persoane autorizate |
| Curier | Ridicare, transport, predare | Acces limitat la tura sa |
| Investitor | Vizualizare investiții și documente permise | Fără acces automat la datele clienților |
| Agent AI | Propuneri și acțiuni limitate prin politici | Fără autoritate proprie nelimitată |

**SC-006 [PROPUS]** Fiecare acțiune trebuie atribuită unui actor identificabil, unui rol, unei resurse, unei gospodării, unei justificări și, când e cazul, unui mandat.

**SC-007 [PROPUS]** Accesul la date este `deny by default`. Controlul se face pe server, la nivel de rol **și** obiect/resursă/gospodărie; UI-ul nu constituie control de securitate.

## 3. Invariante de date și trasabilitate

**SC-008 [PROPUS]** PostgreSQL relațional este sursa de adevăr în producție. Nicio scriere operațională nu poate depinde de `/tmp`, fișiere JSON locale ori memorie de proces.

**SC-009 [PROPUS]** Operațiunile care modifică mai multe entități (rezervare, alocare, plată, livrare, anulare) sunt atomice sau au compensări explicite. Cererile repetate nu trebuie să dubleze efectele (idempotency).

**SC-010 [PROPUS]** Gospodăria, lotul biologic, sublotul/țarcul, comanda, alocarea, rezervarea de capacitate și coletul sunt entități distincte. Un lot nu se deduce doar dintr-un număr editabil de păsări.

**SC-011 [PROPUS]** Modificările efectivului se înregistrează prin evenimente tipizate (intrări, mortalitate, transfer permis, ieșiri), cu autor, timp, cauză și dovadă, fără ștergerea istoricului.

**SC-012 [PROPUS]** Fiecare produs livrat trebuie legat de originea sa, lot, activități și documente relevante, procesare și transport. Istoricul trebuie să permită identificarea și izolarea unui incident.

**SC-013 [PROPUS]** Înregistrările confirmate cu impact financiar sau de conformitate se corectează prin operațiuni de rectificare, nu prin suprascriere nedetectabilă.

**SC-014 [PROPUS]** Fișierele private sunt în object storage cu acces controlat; baza de date păstrează metadate, hash-uri și referințe. Accesul public se face doar prin mecanisme explicite.

## 4. Flux comercial și financiar

**SC-015 [CONFIRMAT ÎN PLANUL ACTUAL, DAR DESCHIS PENTRU VALIDARE]** Planul descrie avansul achitat direct gospodăriei și scăzut din prețul final, după greutatea reală; fără plăți online în prima versiune. Nicio modificare a beneficiarului plății fără ADR și validare contractuală.

**SC-016 [PROPUS]** Sistemul separă: sumă estimată, obligație contractuală, avans declarat de client, avans confirmat de beneficiar, sold, sumă finală, comision PUII MEI și eventuale rambursări. Statusurile declarative nu sunt dovadă bancară.

**SC-017 [PROPUS]** O plată se reconciliază cu un identificator extern/document justificativ și un beneficiar. Un agent AI nu poate confirma încasarea doar pe baza unui mesaj al clientului.

**SC-018 [DESCHIS]** Titularul juridic al contractului, proprietatea păsărilor pe parcursul creșterii, încasarea, facturarea, comisionul și tratamentul fiscal trebuie decise înainte de modelul final al bazei de date.

## 5. Producție, calitate și siguranță

**SC-019 [CONFIRMAT CA IPOTEZE OPERAȚIONALE, NU CA NORME VALIDATE]** Planul folosește țarc mobil 4×3 m, 40 de pui/țarc, mutare zilnică, 0–21 zile la interior, apoi pășune, ciclu 60–70 zile. Aceste valori sunt configurabile și necesită verificare zootehnică și sanitar-veterinară; nu sunt reguli legale demonstrate.

**SC-020 [PROPUS]** Un incident privind sănătatea păsărilor, temperatura, trasabilitatea sau conformitatea poate bloca alocarea/livrarea lotului până la aprobarea persoanei competente. Toate deciziile și dovezile se păstrează.

**SC-021 [PROPUS]** Termenele de consum, temperaturile, eligibilitatea transportului și procedurile de sacrificare/procesare se bazează pe reguli validate extern, nu pe constante arbitrare în UI.

## 6. Arhitectura și limitele modulelor

**SC-022 [PROPUS]** Arhitectura inițială este modular monolith. Modulele de domeniu: Identity, Farms, Contracts, Orders, Allocation, Production, Inventory, Finance, Quality, Traceability, Logistics, Documents, Notifications, Investments (dacă rămâne în scop), Analytics și AI Orchestration.

**SC-023 [PROPUS]** Fiecare modul deține regulile și operațiunile sale; alte module îl accesează prin servicii/API/evenimente definite. Nu se permite accesul transversal necontrolat la tabele sau mutații de domeniu.

**SC-024 [PROPUS]** Central Command este strat de orchestrare și vizibilitate, nu un al doilea sistem de evidență. Nu duplică sursa de adevăr.

**SC-025 [PROPUS]** Extinderea la alte produse se face prin module/verticale și configurații de domeniu, fără presupunerea că regulile pentru pui sunt universal aplicabile.

## 7. Agenți AI

**SC-026 [PROPUS]** Agenții AI primesc identitate tehnică, scop, permisiuni minime, instrumente aprobate, limite de cost și timp, jurnale și posibilitate de oprire imediată.

**SC-027 [PROPUS]** Orice acțiune financiară, contractuală, de sănătate/siguranță alimentară, ștergere masivă sau schimbare de permisiuni necesită aprobare umană explicită și verificare server-side.

**SC-028 [PROPUS]** Intrările externe, inclusiv documente și mesaje, sunt date neîncredere. Un agent nu poate executa instrucțiuni extrase din ele ca autoritate de sistem.

**SC-029 [PROPUS]** Fiecare acțiune AI trebuie să fie reproductibilă/auditabilă: actor, model/versiune, input relevant protejat, instrumente, propunere, aprobare, rezultat și eventual rollback.

## 8. Securitate, confidențialitate, disponibilitate

**SC-030 [PROPUS]** Secretele sunt distincte, gestionate extern și rotite; conexiunile TLS verifică certificatul; conturile administrative folosesc autentificare consolidată.

**SC-031 [PROPUS]** Se definesc politici de minimizare, retenție, acces și ștergere pentru date personale, GPS, fotografii, contracte și documente. Cererile GDPR au flux auditat și respectă obligațiile legale de păstrare.

**SC-032 [PROPUS]** Backup-urile se testează prin restaurare; se definesc RPO/RTO, alerte, jurnalizare structurată, incident response și plan de continuitate.

**SC-033 [PROPUS]** Nu se activează automat funcționalități cu risc ridicat dacă serviciile externe lipsesc; sistemul intră în stare sigură și notifică operatorii.

## 9. Reguli de dezvoltare și release

**SC-034 [PROPUS]** Nicio schimbare în producție fără review, migrare reversibilă sau plan de recuperare, criterii de acceptanță și teste relevante.

**SC-035 [PROPUS]** Fiecare cerință are ID, sursă, status, responsabil, contract de date/API, erori, permisiuni și teste. Deciziile arhitecturale se documentează ca ADR.

**SC-036 [PROPUS]** Înainte de pilot real sunt obligatorii: persistenta stabilă, tranzacții, control acces, backup/restore, teste E2E, verificări de securitate, documentație contractuală și validare sanitar-veterinară.

**SC-037 [PROPUS]** Documentele de proiect nu pot prezenta ca „implementat și testat” un flux doar descris sau observat static.

## 10. Reguli de schimbare a Constituției

**SC-038 [PROPUS]** Modificarea unui principiu constituțional necesită ADR, analiză de impact, plan de migrare, teste și aprobare explicită a proprietarului produsului. Normele juridice și de siguranță prevalează asupra acestui document.

**SC-039 [PROPUS]** Pentru contradicții, se suspendă implementarea regulii afectate până la decizie. Nu se alege tacit varianta mai nouă ori cea mai convenabilă.

## 11. Registrul deciziilor deschise (de soluționat înainte de înghețarea v1)

| ID | Decizie | Stare |
|---|---|---|
| DEC-001 | Contract tripartit: părți, obligații, mandat, semnături | DESCHIS — validare juridică |
| DEC-002 | Beneficiarul încasărilor și fluxul decontărilor | DESCHIS — planul indică gospodar |
| DEC-003 | Proprietatea păsărilor și riscurile pe durata creșterii | DESCHIS |
| DEC-004 | Sacrificare/procesare, autorizări și responsabilități | DESCHIS — validare DSVSA |
| DEC-005 | Transport, lanț de frig, certificări și responsabilități | DESCHIS — validare externă |
| DEC-006 | Comision, facturare, taxe și raportare | DESCHIS |
| DEC-007 | Investitorii: statut juridic, obligații și flux financiar | DESCHIS |
| DEC-008 | Valori de preț, greutate, furaj, capacitate și condiții de producție | DESCHIS — reconciliere documente |
| DEC-009 | Ce date pot vedea clientul, investitorul și partenerii | DESCHIS — GDPR |
| DEC-010 | Pilot: gospodării, zone, volume și criterii de lansare | DESCHIS |

## 12. Criterii de acceptare a acestui document

- [ ] Proprietarul produsului aprobă sau modifică fiecare regulă [PROPUS].
- [ ] Contradicțiile dintre plan, README, contracte și cod sunt înregistrate.
- [ ] DEC-001–DEC-010 au responsabili și termene; deciziile critice sunt rezolvate înainte de implementarea lor.
- [ ] Juristul și specialiștii sanitar-veterinari verifică aspectele de competența lor.
- [ ] Se creează matricea cerință → modul → test.
- [ ] Versiunea aprobată primește tag și istoric de modificări.

**Următorul document:** `01-BUSINESS-ARCHITECTURE.md`, numai după clarificarea rolurilor economice și contractuale esențiale.
