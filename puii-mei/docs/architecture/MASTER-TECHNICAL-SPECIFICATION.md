# PUII MEI — Master Technical Specification (cerință de documentare)

**Statut:** mandat pentru redactarea specificației, nu specificație implementată și aprobată.

## Obiectiv

Construirea unei documentații complete, verificabile și executabile de către ingineri și agenți AI pentru PUII MEI: infrastructură digitală de coordonare a gospodăriilor producătoare independente. Website-ul este doar interfața comercială; nucleul este **Central Command**.

## Principii obligatorii

1. Auditează codul și documentele înainte de a propune implementări.
2. Separă cerințele confirmate, ipotezele, recomandările și deciziile deschise.
3. Nu presupune că PUII MEI este proprietarul produselor sau vânzătorul; stabilește responsabilitățile contractuale și validează-le juridic.
4. Gospodarul produce; PUII MEI poate asigura reprezentare operațională permanentă numai în limitele mandatului legal și contractual.
5. Proiectează un **modular monolith** cu limite explicite între domenii; nu introduce microservicii fără justificare.
6. PostgreSQL relațional este sursa de adevăr; tranzacții ACID, FK, indexuri, migrații și backup.
7. Fișierele private se păstrează în object storage; niciun secret în repository.
8. Securitate by design: verificări server-side pe rol, resursă și gospodărie, jurnalizare și GDPR.
9. AI operează doar cu permisiuni limitate și audit; deciziile financiare, contractuale și de siguranță alimentară au aprobări umane.
10. Fiecare cerință are identificator, responsabil, date, fluxuri, API, erori, criterii de acceptanță și teste.

## Livrabile obligatorii

### 00 — System Constitution
Reguli imuabile ale platformei, rolurile actorilor, autoritatea de decizie, proprietatea datelor, mandatul, fluxurile de bani, audit, aprobări și evoluția modulelor. Registru de decizii (ADR) și excepții.

### 01 — Business Architecture
Modelul companiei, gospodării, clienți, parteneri, investitori, reprezentare operațională, contract tripartit, flux financiar, răspunderi, riscuri, scenarii și decizii neconfirmate.

### 02 — Operational Architecture
Procese cap-coadă: onboarding gospodar, validare, planificare, precomandă, alocare, producție, monitorizare, mortalitate, furaje, documente, procesare, livrare, decontare, reclamații, incidente și închidere lot.

### 03 — System Architecture
Context C4, containere, componente, dependențe, granițe de domeniu, sincron/asincron, evenimente, outbox, idempotency, retry, observabilitate, scenarii de eșec și evoluție.

### 04 — Database Architecture
ERD complet, entități, câmpuri și tipuri, PK/FK, indexuri, constrângeri, reguli de integritate, istoricul modificărilor, multi-tenancy, politici de retenție, migrarea JSON/JSONB și rollback. Distingere între lot biologic, lot contractual, țarc, mișcări de efectiv și rezervări de capacitate.

### 05 — Security Architecture
Threat model, identitate, MFA unde este necesar, sesiuni, rotația secretelor, TLS verificat, RBAC/ABAC, protecție IDOR, rate limiting distribuit, audit, CSRF, încărcare fișiere, GDPR, backup și răspuns la incidente.

### 06 — Roles and Permissions
Matrice explicită de roluri și operațiuni pentru admin, gospodar, client, curier, investitor, manager, financiar, calitate și agenți AI; inclusiv verificări pe proprietatea resursei și gospodărie.

### 07 — API Specification
OpenAPI, endpoint-uri, metode, autentificare, parametri, request/response, validări, erori, rate limits, idempotency, webhooks, evenimente și versionare.

### 08 — Module Specifications
Pentru fiecare modul: scop, entități, reguli, fluxuri normale și excepționale, mașini de stare, permisiuni, API, UI, notificări, audit, performanță, teste și criterii de acceptanță.

Module obligatorii: Identity, Farms, Production, Capacity & Allocation, Inventory, Orders & Preorders, Contracts, Finance & Reconciliation, Documents, Quality & Compliance, Traceability, Logistics, Notifications, Investments (dacă rămâne în scop), Analytics.

### 09 — AI Agent Architecture
Orchestrator, registru de agenți, instrumente, context, permisiuni, aprobare umană, limite de cheltuieli și autoritate, jurnal, observabilitate, evaluare, protecție împotriva prompt injection, fallback manual și oprire de urgență.

### 10 — UI/UX Specification
Sitemap, navigare, design system, formulare, erori, stări goale/încărcare, accesibilitate, responsive, PWA/mobile-first pentru gospodar, introducere rapidă de date, fotografii, QR și operațiuni offline numai dacă sunt justificate.

### 11 — Infrastructure & DevOps
Mediile dev/staging/prod, CI/CD, configurare, secrete, migrații, deploy/rollback, monitorizare, alerte, backup/restore, RPO/RTO, object storage și costuri operaționale.

### 12 — Testing Strategy
Unit, integration, contract, E2E, concurrency, security, load, accessibility, disaster recovery și UAT. Definiție clară de Done, criterii de lansare și matrice de trasabilitate cerință → implementare → test.

### 13 — Implementation Roadmap
Audit → decizii business/juridice → constituție → model de date → securitate → migrare → module prioritare → teste → pilot → extindere. Fiecare task are dependențe, estimări, criterii de acceptanță și rollback.

### 14 — Audit & Technical Debt
Constatări cu severitate, dovadă, impact, reproducere, remediere, owner și stare; diferențe între cod, documentație și producție.

### 15 — Decision Register
Întrebări nerezolvate: titularul încasărilor, mandatul, contractele, responsabilitatea sanitar-veterinară, proprietatea păsărilor, procesarea și transportul, comisioanele, remunerația gospodăriilor, regulile de investiții.

## Cerințe de execuție

Nu produce toate documentele într-un singur răspuns. Începe cu audit și decizii, apoi publică documentele incremental. Nu inventa implementări sau rezultate de test. Nu schimba codul de producție înainte de aprobare. Documentele trebuie versionate în GitHub și revizuite prin Pull Request.
