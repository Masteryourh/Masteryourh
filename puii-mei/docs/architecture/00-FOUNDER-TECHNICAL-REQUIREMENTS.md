# Cerințele tehnice originale ale fondatorului — PUII MEI

**Sursă:** instrucțiunea transmisă de fondator în conversația PUII MEI, 23 noiembrie 2026.  
**Statut:** cerință-sursă; nu este specificație implementată și nu constituie aprobare juridică.  
**Regulă:** păstrarea cerințelor originale; deciziile ulterioare se documentează separat prin ADR.  

---

Vreau să construiești documentația tehnică integrală pentru platforma PUII MEI, la nivel profesional de arhitectură software, analiză de sisteme și specificație de implementare.

Acționează simultan ca:

* Enterprise Software Architect;
* CTO al companiei;
* Senior Full-Stack Engineer;
* Database Architect;
* DevOps Engineer;
* AI Systems Architect;
* Cybersecurity Architect;
* Business Systems Analyst.

OBIECTIV:

Să documentezi integral infrastructura digitală PUII MEI, de la arhitectura generală până la cel mai mic detaliu tehnic necesar implementării.

Nu vreau o simplă prezentare conceptuală. Vreau o specificație tehnică executabilă, fără ambiguități, destinată dezvoltării asistate de AI și programatorilor.

PRINCIPIUL FUNDAMENTAL:

PUII MEI nu este doar un website de vânzare a cărnii de pui. Este o infrastructură digitală centralizată care coordonează o rețea de gospodării producătoare independente.

Compania PUII MEI reprezintă permanent gospodăriile contractate în administrarea și coordonarea operațiunilor, în limitele mandatului și contractelor aplicabile.

Gospodarul se concentrează pe producție. PUII MEI gestionează infrastructura administrativă, operațională, comercială și digitală.

Platforma trebuie construită ca un sistem modular, scalabil, cu interfețe diferite pentru fiecare categorie de utilizator și cu un nucleu central de comandă.

DOCUMENTAȚIA TREBUIE SĂ CONȚINĂ:

1. Arhitectura generală a sistemului

* Diagrama completă a infrastructurii.
* Componentele software.
* Relațiile dintre componente.
* Fluxurile de date.
* Interfețele dintre module.
* Arhitectura centralizată.
* Principiile de modularitate și scalabilitate.

2. Arhitectura aplicațiilor

* Website public.
* Central Command / Admin.
* Interfața gospodăriei.
* Interfața clientului.
* Interfața managerilor operaționali.
* Interfața financiară.
* Interfața logistică.
* Interfața de control al calității.
* Interfața agenților AI.

Pentru fiecare aplicație, definește paginile, componentele, funcționalitățile, permisiunile și acțiunile disponibile.

3. Arhitectura bazei de date

* Toate entitățile.
* Toate tabelele.
* Toate câmpurile.
* Tipurile de date.
* Cheile primare și externe.
* Relațiile dintre tabele.
* Indexurile.
* Constrângerile.
* Reguli de integritate.
* Istoricul modificărilor.
* Strategia de migrare.
* Separarea datelor între gospodării și utilizatori.

Include diagrama ERD și schema completă a bazei de date.

4. Sistemul de utilizatori și permisiuni

* Tipuri de utilizatori.
* Roluri.
* Permisiuni individuale.
* Acces la date.
* Ierarhia utilizatorilor.
* Autentificare.
* Autorizare.
* Recuperarea conturilor.
* Jurnalizarea acțiunilor.
* Securitatea sesiunilor.

5. Modulul gospodărie
    Documentează fiecare funcționalitate necesară gospodăriei:

* Înregistrare și validare.
* Profilul gospodăriei.
* Documente.
* Contracte.
* Loturi de producție.
* Număr de păsări.
* Mortalitate.
* Furaje.
* Consumuri.
* Cheltuieli.
* Livrări de materiale.
* Fotografii.
* Probleme operaționale.
* Raportări zilnice.
* Istoric.
* Indicatori de performanță.

Interfața trebuie să fie mobile-first, extrem de simplă și utilizabilă de persoane fără competențe digitale avansate.

6. Modulul de producție

* Planificarea producției.
* Crearea loturilor.
* Alocarea comenzilor.
* Capacitate de producție.
* Calendar.
* Evoluția loturilor.
* Monitorizarea consumurilor.
* Mortalitate.
* Greutate.
* Randament.
* Predicții.
* Alerte.
* Trasabilitate.

7. Modulul comercial

* Precomenzi.
* Clienți.
* Contracte tripartite.
* Produse.
* Prețuri.
* Plăți.
* Comenzi.
* Facturare.
* Anulări.
* Rambursări.
* Relația contractuală dintre client, gospodar și PUII MEI.

Nu presupune automat că PUII MEI este proprietarul produselor sau vânzătorul. Documentează rolurile comerciale și juridice ca decizii care trebuie validate.

8. Modulul de trasabilitate

* Trasabilitatea fiecărui lot.
* Originea păsărilor.
* Furaje.
* Tratamente și intervenții.
* Evoluția producției.
* Documente.
* Procesare.
* Transport.
* Livrare.
* Istoricul complet al produsului.
* Accesul clientului la informațiile relevante.

9. Modulul financiar

* Evidența cheltuielilor.
* Costuri pe gospodărie.
* Costuri pe lot.
* Încasări.
* Decontări.
* Comisioane.
* Repartizarea veniturilor.
* Rapoarte.
* Reconcilierea plăților.
* Audit financiar.

10. Modulul logistic

* Aprovizionare.
* Stocuri.
* Furaje.
* Materiale.
* Distribuție.
* Programări.
* Transport.
* Procesare.
* Livrări.
* Urmărirea comenzilor.

11. Modulul de calitate și conformitate

* Verificări.
* Documente obligatorii.
* Controale.
* Neconformități.
* Alerte.
* Acțiuni corective.
* Istoric.
* Trasabilitatea incidentelor.

12. Sistemul de agenți AI
    Definește arhitectura unui ecosistem de agenți AI specializați:

* Agent administrativ.
* Agent pentru gospodării.
* Agent de producție.
* Agent comercial.
* Agent financiar.
* Agent logistic.
* Agent de calitate.
* Agent pentru clienți.
* Agent de analiză și management.

Pentru fiecare agent definește:

* Rolul.
* Responsabilitățile.
* Datele la care are acces.
* Instrumentele disponibile.
* Acțiunile permise.
* Limitele de autoritate.
* Condițiile de aprobare umană.
* Jurnalizarea.
* Gestionarea erorilor.

13. API și comunicarea dintre module

* Endpoint-uri.
* Metode HTTP.
* Parametri.
* Request/response.
* Validări.
* Coduri de eroare.
* Autentificare.
* Rate limiting.
* Webhooks.
* Evenimente interne.
* Documentație OpenAPI.

14. Arhitectura tehnică

* Frontend.
* Backend.
* Baza de date.
* ORM.
* Servicii externe.
* Stocare fișiere.
* Procesare asincronă.
* Cache.
* Notificări.
* E-mail.
* SMS.
* Monitorizare.
* Logging.
* Backup.
* Recuperare în caz de dezastru.

15. Securitate

* Protecția datelor.
* Izolarea gospodăriilor.
* Controlul accesului.
* Criptare.
* Protecția documentelor.
* Audit.
* Prevenirea accesului neautorizat.
* Gestionarea secretelor.
* Protecția împotriva atacurilor uzuale.
* GDPR.

16. Interfață și experiență utilizator

* Structura meniurilor.
* Navigare.
* Componente.
* Formulare.
* Validări.
* Mesaje.
* Stări de încărcare.
* Erori.
* Responsive design.
* Accesibilitate.
* Design system.

17. Infrastructură și deployment

* Medii de dezvoltare.
* Testare.
* Producție.
* CI/CD.
* Configurare.
* Variabile de mediu.
* Deployment.
* Rollback.
* Monitorizare.
* Backup.
* Scalare.

18. Testare și controlul calității software

* Teste unitare.
* Teste de integrare.
* Teste end-to-end.
* Teste de securitate.
* Teste de performanță.
* Teste de acceptanță.
* Criterii de validare pentru fiecare modul.

19. Arhitectura de extindere
    Platforma trebuie să permită adăugarea ulterioară a altor categorii de producție și produse fără restructurarea nucleului sistemului.

Documentează cum pot fi adăugate module și verticalele noi.

20. Planul de implementare

* Ordinea dezvoltării.
* Dependențele dintre module.
* Priorități.
* MVP.
* Versiuni ulterioare.
* Criterii de finalizare.
* Riscuri tehnice.
* Riscuri operaționale.

REGULI OBLIGATORII:

1. Nu inventa decizii de business sau juridice care nu au fost confirmate.
2. Marchează explicit fiecare presupunere.
3. Separă cerințele confirmate de recomandările tale.
4. Identifică toate contradicțiile și deciziile nerezolvate.
5. Nu simplifica arhitectura prin eliminarea funcționalităților importante.
6. Nu introduce complexitate tehnică fără justificare.
7. Nu construi microservicii doar pentru a părea scalabil. Recomandă arhitectura potrivită etapei actuale.
8. Proiectează sistemul astfel încât să poată crește fără rescrierea nucleului.
9. Fiecare funcționalitate trebuie să aibă reguli, date, permisiuni, fluxuri și criterii de testare.
10. Nu începe implementarea codului înainte ca documentația să fie suficient de clară.

METODĂ DE LUCRU:

Începe prin auditarea codului și documentației existente.

Apoi construiește documentația etapizat. Nu încerca să produci totul într-un singur răspuns.

Pentru fiecare modul:

* Descrie arhitectura.
* Definește funcționalitățile.
* Definește structura datelor.
* Definește fluxurile.
* Definește regulile de business.
* Definește API-urile.
* Definește permisiunile.
* Definește erorile și excepțiile.
* Definește testele.
* Definește criteriile de acceptanță.

La final, toate documentele trebuie să formeze o singură specificație coerentă, fără contradicții.

Documentația trebuie să fie suficient de precisă încât un agent AI de programare să poată implementa modulele independent, respectând aceeași arhitectură centrală.
