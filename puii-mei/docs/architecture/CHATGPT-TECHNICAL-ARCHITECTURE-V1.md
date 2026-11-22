# CHATGPT — PUII MEI: audit și arhitectură tehnică (versiune independentă)

**Autor:** ChatGPT (GPT-6)  
**Data:** 2026-11-23  
**Scop:** versiune separată pentru comparație cu documentația Claude Code.  
**Stare:** draft, audit parțial; fără modificări de cod, fără teste executate.

## Protocol de comparație

- Acest document și branch-ul `docs/chatgpt-technical-architecture-v1` sunt rezervate variantei ChatGPT; nu se vor suprascrie fișierele lui Claude.
- Comparați: acoperirea celor 20 de capitole, inventarul codului, trasabilitatea cerință→date→API→permisiune→test, consistența fluxurilor de bani, separarea tenant, tratamentul incidentelor, validarea ipotezelor și complexitatea implementării.
- Niciun capitol care nu este încă scris nu este prezentat ca finalizat. Aceasta este **prima livrare**, nu specificația completă.
- O decizie comercială/juridică contradictorie rămâne deschisă până la confirmarea explicită a fondatorului.

---

# PUII MEI — AUDIT DE PORNIRE PENTRU SPECIFICAȚIA INTEGRALĂ

**Data:** 2026-11-23  
**Stare:** AUDIT PARȚIAL DE SURSE (citire directă din `main`); NU audit exhaustiv, NU audit al producției, NU rezultat de teste executate.  
**Scop:** bază verificabilă pentru specificațiile 02–20; fără implementare de cod.

## A. Material inspectat direct

- `package.json`, `README.md`, `docs/plan-platforma.md`, `docs/TEAM-WORKFLOW.md`, `docs/architecture/00-SYSTEM-CONSTITUTION.md`, `docs/architecture/MASTER-TECHNICAL-SPECIFICATION.md`, `docs/audit/REAUDIT-2026-11-22.md`;
- `prisma/schema.prisma`, `src/lib/domain.ts`, `src/server/db/store.ts`, `src/server/db/pg-store.ts`, `src/server/session-token.ts`.
- `docs/architecture/01-BUSINESS-ARCHITECTURE.md` este încă într-un PR separat, neaprobat; nu este tratat drept sursă de adevăr în `main`.

**Limitări:** nu s-a inventariat întreg arborele repo-ului, nu s-au citit toate server actions/rutele, nu s-au instalat dependențe, nu s-au executat lint, build, teste sau verificări de deployment. Auditul din 2026-11-22 privește un snapshot ZIP anterior; concluziile sale sunt folosite ca ipoteze de reverificat, nu ca stare actuală garantată.

## B. Constatări actualizate, bazate pe codul citit

| ID | Observație | Dovadă | Consecință |
|---|---|---|---|
| AUD-001 | Aplicație Next.js 16.4.6, React 19.3.0, TypeScript, pg, Zod; script `test` prezent | `package.json` | Auditul anterior spunea că lipsește scriptul; afirmația nu mai este actuală. Existența și rezultatele testelor rămân de verificat. |
| AUD-002 | Fallback la JSON local sau `/tmp` pe Vercel când lipsesc URL-urile DB | `src/server/db/store.ts` | P0: fail-closed în producție, healthcheck și verificare configurare. |
| AUD-003 | PostgreSQL folosește `documents(collection,id,data jsonb,created_at)`, cu `list/get/append/update/remove` | `src/server/db/pg-store.ts` | P0/P1: lipsă API tranzacțional multi-entitate în stratul inspectat; nevoie de schemă relațională, migrare și teste concurente. |
| AUD-004 | Configurația TLS DB a fost extrasă în `pgSslConfig`; comentariul spune verificare certificat | `src/server/db/pg-store.ts` | Remedierea S01 din auditul ZIP este **posibil realizată**, dar trebuie citit `pg-ssl.ts` și testată conexiunea; nu o marcăm închisă. |
| AUD-005 | `sessionSecret()` cere `SESSION_SECRET` de min. 32 caractere în producție; nu mai apare fallback la `ADMIN_PASSWORD` în fișierul citit | `src/server/session-token.ts` | S02 pare parțial remediat; auditul tuturor apelanților, tokenurilor și testelor este încă necesar. |
| AUD-006 | Schema Prisma declară explicit că nu este conectată; nu există Prisma în `package.json` | `prisma/schema.prisma`, `package.json` | Nu se rulează migrații Prisma vechi și nu se consideră schema drept model implementat. |
| AUD-007 | Domeniul existent include gospodărie, lot, precomandă, plată avans, livrare, acces client | `src/lib/domain.ts`, `README.md` | Specificația trebuie să păstreze compatibilitatea sau să prevadă migrare verificată. |
| AUD-008 | Avansul din README = pui × 6 kg furaj × preț; planul calculează 9,8 kg/pui prin „asimilare 70%” | `README.md`, `docs/plan-platforma.md` | **CONTRADICȚIE BLOCAJ**: FCR, hibrid, ținta de greutate, cantitatea și avansul necesită validare zootehnică. |
| AUD-009 | Planul și README au parametri de preț/greutate diferiți | `docs/plan-platforma.md`, `README.md` | Versiuni de rețetă și de preț; nu hardcodăm ipotezele. |
| AUD-010 | `README.md` descrie UI investitor, curier fără cont, QR, temperaturi și documente | `README.md` | Sunt descrieri ale proiectului, nu verificări de funcționare în producție. |
| AUD-011 | Remunerarea PUII MEI este încă neclară în conversațiile de decizie: 20% anterior, apoi 10% din venit minus cheltuieli standard | decizii fondator, neconsolidate în `main` | **BLOCAJ BA-005**: nu se implementează formula de comision până la confirmarea procentului și a costurilor standard. |

## C. Registre de decizie și clasificare

- **CONFIRMAT:** gospodăriile sunt producători independenți; PUII MEI administrează în limita mandatelor, coordonează contabilitatea externalizată și conformitatea; clientul plătește gospodăriei; PUII MEI facturează gospodăria; precomenzile preced producția; transparență lot/comandă.
- **CONFIRMAT CA DIRECȚIE:** un sistem centralizat, modular, mobile-first, cu interfețe separate și AI asistiv.
- **PROPUS TEHNIC:** modular monolith, PostgreSQL relațional, outbox, object storage privat, tranzacții ACID, RBAC/ABAC, jurnal imuabil, verificări server-side; trebuie validate prin ADR și specificații.
- **NECONFIRMAT/BLOCANT:** procent final 10% vs 20%, politica costurilor standard și abaterilor, mecanism bancar autorizat, model contractual final, traseul sanitar-veterinar, parametri de furaj/greutate, contract tripartit, rolul investitorilor.

## D. Contract de documentare — cerințe obligatorii

Fiecare modul viitor trebuie să conțină: (1) ID cerință, sursă și statut; (2) limite și dependențe; (3) actori și permisiuni inclusiv tenant/resource scope; (4) stare și tranziții; (5) tabele/câmpuri/tipuri/PK/FK/indexuri; (6) API HTTP, payload și validări; (7) evenimente, tranzacții, idempotency, retry; (8) erori, compensări, jurnal; (9) UI și accesibilitate; (10) teste unitare/integrare/E2E/securitate; (11) criterii de acceptanță verificabile; (12) decizii deschise.

Nu se implementează operațiuni bancare, comisioane, autorizări sau fluxuri de sacrificare pe presupuneri.

## E. Plan etapizat de livrare a documentației

1. **Audit extins**: inventar rute, server actions, repository-uri, modele, configurații, test files și CI; probe cu linii/fișiere; matrice implementat vs descris vs lipsă.
2. **02 Operational Architecture**: fluxuri complete, state machines, excepții, ownership și criterii de acceptare.
3. **03 System Architecture**: C4 context/container/component, limite module, diagrame Mermaid, contracte de integrare și NFR.
4. **04 Database Architecture**: ERD complet, DDL versionat, indexuri/constraint-uri, tenant isolation, migrări și reconciliere.
5. **05 Security + 06 Roles/Permissions**: threat model, matrice acțiune-resursă, politici de securitate și teste.
6. **07 API + 08 UI**: OpenAPI 3.1, JSON Schema, erori, webhooks, design system și fluxuri per rol.
7. **09–15**: module Household, Production, Commercial, Finance, Logistics, Quality, Traceability; specificații identic structurate.
8. **16 AI Architecture + 17 Platform/DevOps + 18 QA + 19 Extensibility + 20 Delivery Plan**: agenți și approval gates, CI/CD, observabilitate, backup/restore, performanță, extensie verticală și roadmap.
9. **Consistency audit**: referințe bidirecționale între cerințe, DDL, OpenAPI, permisiuni și teste; registru de contradicții cu status; semnătură de acceptare Product Owner.

## F. Primele criterii de acceptare a auditului extins

- Inventar complet de rute și acțiuni server cu autentificare/autorizare documentată.
- Matrice `feature → sursă cod → status implementare → risc → test`.
- Verificare explicită `pg-ssl.ts`, `order-access.ts`, object storage, `json-store.ts`, toate punctele de mutație.
- Execuție CI/lint/typecheck/build/test într-un mediu reproductibil; loguri și coduri de ieșire.
- Backlog P0/P1/P2 justificat cu probe, fără afirmații de testare neexecutată.

**Regulă de guvernanță:** documentul este o bază de lucru; nu modifică deciziile comerciale și nu autorizează implementarea. PR-ul trebuie revizuit înainte de merge.
