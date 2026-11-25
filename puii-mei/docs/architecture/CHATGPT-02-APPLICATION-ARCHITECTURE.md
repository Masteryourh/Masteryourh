# 02 — Arhitectura aplicațiilor
v0.1 / 24.11.2026 / DRAFT. CONFIRMAT = mandat; PROPUS = design; DESCHIS = decizie. Depinde de capitolul 01, NAV-001, AUD-001, viitorul capitol 04 IAM. Nu autorizează cod nou.
## 1. Inventar și limite
Mandatul PR58 cere nouă interfețe. Matricea CLAUDE-NAV-MATRIX.md din branch claude/admin-command-center (PR73, neintegrat) a fost consultată: admin, household, customer, courier, investor, public, auth și shared sunt spații detectate. Nu dovedește inventarul complet al paginilor sau autorizarea. PR73 adaugă detalii comandă, contract, documente, etichete Admin; PR69 jurnal. Manager, finanțe, calitate și AI dedicate rămân ținte, nu funcții confirmate. Investor există în matrice, dar nu este una dintre cele nouă interfețe mandatate; păstrăm separat, fără a inventa drepturi sau model de investiții.
## 2. Contract comun
O aplicație = workspace logic, nu deployment obligatoriu. Shell distinct, meniu derivat din capabilități, breadcrumb, stare filtre/pagină/ancoră, selector de scope autorizat, notificări, sesiune, erori locale. Serverul validează fiecare query/command independent de meniu. Componentele de prezentare primesc DTO explicit, niciodată obiect DB complet, credențiale sau token client în Admin. Contextul de autorizare nu este derivat din URL. Fiecare pagină declară workspace, query, commands, scope, câmpuri permise, fallback și test. Rutele de mai jos sunt propuneri dacă nu sunt marcate OBSERVAT (matrice PR73).
Contract query: {name,input,ctx} -> {data,pageInfo?,asOf,version?}. Command: {name,input,idempotencyKey,expectedVersion?} -> {result,version,requestId}. ctx exclusiv server. Numele sunt contracte logice, nu endpoint-uri implementate. Paginare cursor pentru liste mari; filtre aplicate în DB. Date sensibile nu intră în URL, cache public, analytics sau log.
## 3. Website public
Scop: informare și intrare comercială; fără acces operațional. OBSERVAT: /, /cum-functioneaza, /gospodarii, /gospodarii/[slug], /trasabilitate, /precomanda, /devino-partener, /in-curand, /despre-noi, /confidentialitate (destinații din matrice).
| Pagină | Query / date | Acțiuni | Componente |
|---|---|---|---|
| Acasă, explicații | publicContent | navigare | Hero, Story, CtaBand |
| Gospodării, profil | publicFarms/publicFarm; profil aprobat | selectare | FarmCard, profil |
| Trasabilitate | publicTrace; proveniență publicabilă | căutare | LotCard, timeline |
| Precomandă | availableOffers; disponibilitate informativă | submitPreorder | PreorderForm |
| Partener, interes, contact | publicContent | submitApplication/Interest/Contact | formulare |
| Politici | publishedPolicy(version) | consultare | document |
Reguli: nicio adresă privată, IBAN, date client, document intern sau efectiv nepublicat; precomanda revalidează capacitate și compliance atomic; prețul și termenii versionați; solicitare nu înseamnă acceptare. Rate limit și protecție spam. Test PUB-01: acces anonim nu expune date private; PUB-02: concurență și ofertă expirată; PUB-03: retry fără duplicat.
## 4. Admin Central Command
CONFIRMAT: toate entitățile administrabile au reprezentare Admin; nu se navighează implicit în alte workspace-uri. OBSERVAT în PR73: /admin, /admin/loturi, /admin/comenzi/[number], /admin/comenzi/[number]/contract, /admin/gospodarii/[slug], /admin/gospodarii/[slug]/jurnal, /admin/gospodarii/[slug]/documente, /admin/livrari, /admin/livrari/[id], /admin/livrari/etichete, /admin/documente, /admin/interes, /admin/parteneri.
| Secțiune | Query / date | Comenzi propuse, numai cu drept explicit |
|---|---|---|
| Dashboard | operationalSummary, alerts | acknowledgeAlert |
| Gospodării | listHouseholds, householdDetail | reviewApplication, assignManager |
| Loturi/țarcuri | lots, penAllocations | planLot, allocateOrder |
| Comenzi/client | orderDetail, paymentSummary, contractRef | requestCorrection, cancelOrder |
| Documente | evidenceRegister, complianceStatus | verifyEvidence, rejectEvidence |
| Livrări | tours, parcels, labels | scheduleTour, assignCourier |
| Finanțe | settlementSummary | proposeSettlement |
| Calitate | incidents, holds | requestInspection |
| Utilizatori/mandate | memberships, grants | grant/revoke (aprobare după politică) |
| Audit | scopedAuditHistory | exportAudit (drept separat) |
| AI | runs, proposals | approve/rejectProposal |
Componente: PanelShell, PanelCrumbs, tabele paginated, filtre, EntityDetail, GrowthJournalView, ContractDocument, LabelsView, audit timeline. Ultimele trei sunt raportate de PR69/73; restul propuse. Admin nu poate modifica jurnalul ca gospodar; corecția are actor real și motiv. Link comandă fără token secret; întoarcere /admin/loturi?deschis=<lot>#tarc-<lot>-<n> (PR73). Link public explicit în tab nou. Test ADM-01 traseu țarc-comandă-retur; ADM-02 contract/etichetă/jurnal fără ieșire; ADM-03 acces direct neautorizat; ADM-04 păstrare filtre, scroll și tab; ADM-05 audit actor real.
## 5. Gospodar
OBSERVAT: /cont/gospodar, /cont/gospodar/jurnal, /cont/gospodar/documente (rută referită în NAV-001), /cont/gospodar/etichete. PROPUS sub același prefix:
| Pagină | Query | Command |
|---|---|---|
| Acasă / sarcini | ownTasks, ownLotSummary | acknowledgeTask |
| Profil / contracte | ownProfile, ownContracts | proposeProfileChange, acknowledgeContract |
| Documente | ownEvidence | uploadEvidence |
| Loturi / jurnal | ownLots, dailyObservations | recordMortality, recordWeight, recordFeed |
| Cheltuieli | ownExpenses | submitExpense |
| Materiale | ownStock, incomingSupply | confirmReceipt |
| Probleme | ownIncidents | reportIncident |
| Fotografii | ownMedia | uploadPhoto |
| Livrări / etichete | ownHandover, ownLabels | confirmHandover |
| Financiar | ownReceipts, ownSettlement | submitPaymentEvidence, requestBankChange |
| Istoric | ownHistory | requestCorrection |
Mobile-first: acțiuni mari, numere și unități explicite, valori implicite nefinanciare, confirmare, progres upload, stare offline/pending/synced/rejected. Nu modifica direct efectivul, prețul sau decontul. Offline doar observații permise, revalidare server, deduplicare UUID; nu afișa confirmare centrală înainte de commit. Test HH-01 tenant străin refuzat; HH-02 offline retry; HH-03 mortalitate invalidă; HH-04 document încărcat nu ridică automat hold; HH-05 IBAN cu procedura aprobată.
## 6. Client
OBSERVAT: /comanda, /comanda/[token] și contract (PR73). PROPUS: cont client cu acces la comenzile proprii; migrarea accesului token/PIN necesită ADR.
| Pagină | Query | Command |
|---|---|---|
| Acces / recuperare | challengeStatus | requestChallenge, verifyChallenge |
| Comanda | ownOrder | requestCancellation |
| Contract | ownContractVersion | acknowledgeContract |
| Plăți | ownPaymentInstructions | submitPaymentEvidence |
| Creștere / proveniență | customerTrace | none |
| Livrare | ownDelivery | confirmReceipt, reportIssue |
| Suport / istoric | ownTickets, ownOrders | openTicket |
Clientul vede datele necesare contractului și provenienței, nu costurile interne sau alți clienți. Plata direct gospodăriei; afișare instrucțiuni doar din cont bancar activ validat; încărcarea dovezii nu confirmă încasarea. Tokenurile nu apar în log, referer sau Admin; sesiuni limitate, rate limit. Test CUS-01 acces la altă comandă refuzat; CUS-02 PIN concurent; CUS-03 schimbare IBAN pending nu devine activă; CUS-04 contract istoric nemodificat.
## 7. Manager operațional — PROPUS /manager
| Pagină | Query | Command |
|---|---|---|
| Regiune / dashboard | scopedRegionalSummary | acknowledgeAlert |
| Gospodării | assignedHouseholds | proposeAssignment |
| Loturi / calendar | scopedProductionPlan | proposeLotPlan |
| Monitorizare | scopedAlerts, growthTrends | createInterventionTask |
| Vizite | assignedVisits | recordVisit |
| Incidente | scopedIncidents | escalateIncident |
| Rapoarte | scopedKPIs | requestExport |
Scope prin atribuiri explicite și perioadă, nu județ din URL. Nu aprobă plăți, documente sau corecții fără capabilitate distinctă. Test MGR-01 revocare imediată; MGR-02 agregări fără scurgeri cross-region; MGR-03 delegare expirată.
## 8. Financiar — PROPUS /financiar
| Pagină | Query | Command |
|---|---|---|
| Dashboard | scopedFinanceSummary | none |
| Încasări | paymentEvidence, reconciliationQueue | reconcilePayment |
| Cheltuieli | expenseRegister | validateExpense |
| Loturi / deconturi | cycleLedger, settlementDraft | proposeSettlement, closeCycle |
| Facturi / rambursări | invoiceRefs, refundQueue | proposeInvoice, proposeRefund |
| Conturi bancare | maskedBankAccounts, changeStatus | reviewBankChange |
| Audit / export | financeAudit | requestExport |
Sume în unități monetare exacte, monedă explicită, documente și versiuni; fără floating point. ADR-001: 10% × max(0, venituri−cheltuieli) per ciclu închis; definițiile fiscale și contabile DESCHIS, blocăm automatizarea decontului final până la aprobare. Nu transferăm banii clienților prin platformă. Separarea inițierii și aprobării operațiunilor sensibile PROPUS. Test FIN-01 reconciliere duplicată; FIN-02 concurență la închidere; FIN-03 cont mascat și acces limitat; FIN-04 corecție auditabilă.
## 9. Logistică — PROPUS /logistica; curier existent ca sub-workspace separat
OBSERVAT: spațiul courier în matrice; rutele exacte necesită inventar.
| Pagină | Query | Command |
|---|---|---|
| Aprovizionare | supplyNeeds | proposeSupplyOrder |
| Stocuri | stockByLocation | recordStockMovement |
| Procesare | processingSchedule | proposeProcessingSlot |
| Ture / transport | deliveryPlan | assignTour |
| Etichete / colete | parcelManifest | generateLabel |
| Predare / livrare | handoverStatus | confirmHandover, confirmDelivery |
| Incidente | logisticsExceptions | reportException |
Curierul vede doar tura atribuită și datele strict necesare livrării, fără informații financiare interne. Validare compliance înainte de procesare/transport, temperatură și condiții legale DESCHIS. Test LOG-01 curier altă tură refuzat; LOG-02 PIN predare single-use; LOG-03 stoc negativ refuzat; LOG-04 hold blochează operațiunea.
## 10. Calitate și conformitate — PROPUS /calitate
| Pagină | Query | Command |
|---|---|---|
| Dashboard | complianceOverview | none |
| Documente | evidenceQueue, expiryCalendar | verifyEvidence, rejectEvidence |
| Inspecții | inspectionPlan | recordInspection |
| Neconformități | nonconformityRegister | openNonconformity |
| Acțiuni corective | correctiveTasks | submitCorrectiveEvidence |
| Hold / eliberare | activeHolds | imposeHold, proposeRelease |
| Trasabilitate incident | incidentTrace | requestInvestigationExport |
Document nou nu este document validat; expirarea și suspendarea afectează operațiunile conform regulilor aprobate. Nu inventăm lista documentelor obligatorii, autoritatea veterinară sau criterii de eliberare. Test QA-01 document pending nu ridică hold; QA-02 hold în cursul lotului; QA-03 eliberare neautorizată refuzată; QA-04 istoric intact.
## 11. Interfața agenților AI — PROPUS /ai + gateway intern
| Pagină / capabilitate | Query | Command |
|---|---|---|
| Registru agenți | agentDefinitions | proposeAgentConfig |
| Execuții | scopedRuns | pauseRun |
| Propuneri | pendingProposals | approve/rejectProposal |
| Instrumente | allowedTools | requestToolGrant |
| Evaluare | evaluationResults | scheduleEvaluation |
| Incidente / audit | agentAudit | revokeAgentGrant |
Agentul are identitate proprie, scope, buget, timeout și instrumente allowlist. Acces numai prin Librarian; nici SQL arbitrar, nici secrete, nici impersonare. Propunerea, aprobarea și execuția sunt evenimente distincte; executorul revalidează autoritatea și versiunea. Conținutul documentelor este input neîncrezător, nu instrucțiune de sistem. Test AI-01 prompt injection nu extinde accesul; AI-02 grant revocat; AI-03 propunere stale; AI-04 acțiune sensibilă fără aprobare refuzată.
## 12. Matrice de autoritate orientativă
R=consultare autorizată, C=comandă semantică în scope, P=propunere; —=fără acces implicit. Nu este politică IAM executabilă.
| Resursă | Public | Admin | Gospodar | Client | Manager | Financiar | Logistică | Calitate | AI |
|---|---|---|---|---|---|---|---|---|---|
| Profil public | R | R/P | R/P propriu | R | R | — | — | R | grant |
| Lot/jurnal | R public | R/P | R/C propriu | R proiecție | R/P | R cost | R necesar | R/P | grant |
| Comandă | C precomandă | R/C | R alocată | R/C proprie | R scope | R/C plăți | R livrare | R trace | grant |
| Financiar | — | R/P | R/C propriu | R propriu | R agregat | R/C | — | — | grant |
| Conformitate | R public | R/C explicit | R/C dovezi | R publicabil | R/P | R gate | R gate | R/C | grant |
| Audit | — | R explicit | R istoric propriu | R istoric propriu | R scope | R financiar | R scope | R scope | grant |
## 13. Stări, navigare, erori și performanță
Loading skeleton, empty state, error cu requestId fără detalii interne, conflict cu reîncărcare, hold cu explicație autorizată, offline cu stare persistentă. 401 autentificare; 403 capabilitate; 404 obiect inaccesibil; 409 conflict; 422 validare; 429 limită; 503 indisponibil. Păstrare draft local numai dacă politica de date permite; logout șterge cache sensibil. URL return validat same-workspace; fallback părinte; context de scroll/filtre/ancoră; tab nou public explicit. Shared components fără redirect implicit. Meniul nu acordă drepturi. Accesibilitate WCAG 2.2 AA propus, tastatură, focus, contrast, etichete, erori asociate câmpurilor; test pe mobil și conexiune lentă. Dashboard paginat/proiectat, fără .list() integral; asOf pentru date eventual consistente.
## 14. Gate de acceptanță și decizii deschise
APP-T01 toate rutele inventariate și mapate la capabilități; APP-T02 test negativ pe fiecare query/command și obiect cross-tenant; APP-T03 contract DTO fără câmpuri secrete; APP-T04 navigare în fiecare workspace, deep link, refresh, back, multi-tab; APP-T05 accesibilitate și mobil; APP-T06 concurență și retry; APP-T07 cache revocat; APP-T08 test de volum cu p95/p99; APP-T09 fiecare comandă auditată; APP-T10 fiecare entitate administrabilă reprezentată.
DESCHIS: matrice IAM finală, model de autentificare client, mandat manager, drepturi financiare/calitate, interfață investitor, politici AI, retenție offline, stări juridice, catalog complet de rute și componente. Inventarul PR73 nu dovedește completitudinea; trebuie audit source-to-route și reconciliere cu Claude. Contractele de mai sus sunt propuse, nu OpenAPI final și nu rezultate testate. Capitolul 03 va defini schema; 04 autoritatea; 13 contractele HTTP; 16 design system. Nu se implementează pe baza acestui draft fără rezolvarea dependențelor.


## Addendum v0.2 — decizii teritoriale și sarcini
Sursa PR62 comentarii 7144648431, 7144750950. Înlocuiește ipoteza de scope regional generic din §7: manager local = comună/UAT; zonal = grup de comune din circumscripția unei judecătorii; admin vizibilitate națională, fără drepturi de scriere implicite. Același workspace manager, două perspective autorizate (PROPUS). Gospodar: pagina Astăzi cu sarcini și programări, fiecare sarcină are justificare; submitJustification notifică local. Local: coadă justificări, rezolvare/escaladare; zonal: justificări și rezolvări din zonă; admin: tablou național. Notificare zilnică CONFIRMAT; outbox, stări, rezumat dimineața, escaladare automată PROPUS. SLA și termene DESCHISE. Test: manager local nu vede comuna vecină, zonal vede toate comunele atribuite și niciuna externă; mutarea gospodăriei/revocarea actualizează scope; justificare notificată o singură dată. AI automatizează tot ce este permis, lista aprobărilor umane rămâne DESCHISĂ; default deny pentru acțiuni neaprobate.


## Revizie 25.11.2026 — PR75 / PR62 (prevalează asupra afirmațiilor anterioare incompatibile)
R11/R19: Claude raportează #73/#77/#79/#80/#81 integrate. Admin mesaje netrimise /admin/mesaje (rezumat fără destinatar/conținut, retry dead auditat), /admin/diagnostic read-only, precomenzi paginare 50 cursor microsecunde+id, căutare număr/nume/telefon/email, revenire context. APP-T01 include src/lib/nav-policy.test.ts și e2e/admin-command-center.spec.ts; rezultate Claude, nu rerulate aici. Inventarul complet de rute rămâne deschis.
Sursa: main docs/architecture/CLAUDE-REVIEW-CHATGPT-01-05.md și PR62 comentarii 7145958043,7148609439,7148826959,7156917335. Rezultate raportate Claude, nu rerulate. Draft, nu baseline.
