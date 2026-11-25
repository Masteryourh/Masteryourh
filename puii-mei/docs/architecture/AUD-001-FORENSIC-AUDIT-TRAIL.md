# AUD-001 — Audit Trail, proveniență și investigații

**Prioritate:** P0 · **Statut:** cerință de produs CONFIRMATĂ de fondator; proiectare PROPUSĂ, neimplementată · **Data:** 2026-11-23.

## 1. Mandat și obiectiv

Toate acțiunile relevante din PUII MEI trebuie să lase o urmă verificabilă astfel încât o investigație ulterioară să poată determina **cine**, **în numele cui**, **din ce spațiu/interfață**, **de unde tehnic**, **când**, **ce a cerut**, **ce a modificat**, **ce a rezultat**, **cu ce justificare** și **prin ce lanț de operații**. Acoperă toate interfețele și modulele, inclusiv API, joburi, integrări, agenți AI și acțiuni de suport/admin. Nu este permisă impersonarea tacită a gospodarului de către Admin.

**Domeniu:** operațiuni de creare/modificare/ștergere logică, aprobări/refuzuri, plăți și IBAN, precomenzi/alocări, jurnal producție, documente și conformitate, logistică, acces la date sensibile, autentificare/autorizație, export, acțiuni administrative, schimbări de rol/mandat și execuții AI. Evenimentele de vizualizare obișnuită pot fi agregate/limitate prin politică de retenție și minimizare; accesul la date sensibile și exporturile se auditează individual. „Toate acțiunile” nu înseamnă colectarea nelimitată a fiecărui click fără scop.

## 2. Contract de eveniment — câmpuri obligatorii

| Grup | Câmpuri | Regula |
|---|---|---|
| Identitate | `actor_type` (human/ai/system/integration), `actor_id`, `principal_id`, `on_behalf_of_household_id` | nu se confundă actorul real cu entitatea reprezentată |
| Autorizare | `role_id`, `membership_id`, `mandate_id`, `authorization_decision` | snapshot/versiune a drepturilor relevante, fără secrete |
| Proveniență UI | `workspace` (admin/household/customer/courier/public/etc.), `route_template`, `origin_workspace`, `request_id` | o acțiune în Admin rămâne etichetată Admin chiar dacă operează pe gospodărie |
| Proveniență tehnică | `source_kind` (web/api/job/ai/integration), `ip_address` (dacă e justificat), `user_agent`, `device_or_session_id` pseudonimizat | IP și identificatori sunt date personale; acces/retention controlate |
| Context | `household_id`, `program_id`, `cycle_id`, `lot_id`, `order_id`, `resource_type`, `resource_id` | legături pentru căutare și reconstrucție |
| Operație | `action`, `event_schema_version`, `occurred_at`, `recorded_at`, `result` | timp UTC cu `timestamptz`, ordonare deterministă cu ID |
| Diferență | `before_digest`, `after_digest`, `change_set_redacted`, `reason_code`, `evidence_ids` | valorile brute sensibile nu se copiază în audit |
| Corelare | `correlation_id`, `causation_id`, `idempotency_key_hash`, `parent_event_id` | un request poate produce mai multe evenimente legate |
| Integritate | `previous_hash`, `event_hash`, `signature_key_id`, `export_batch_id` | hash chaining/semnătură și export extern, cu limitări documentate |

Câmpurile imposibil de cunoscut se marchează explicit `null` + `unavailable_reason`; nu se inventează IP, geolocație sau identitatea utilizatorului. **„De unde”** înseamnă în primul rând interfață, rută, sesiune și sursă tehnică; localizarea geografică exactă nu se deduce din IP și nu se colectează implicit.

## 3. Invariante P0

**AUD-INV-01:** O comandă de domeniu mutativă validă persistă modificarea de business, evenimentul de audit și outbox-ul **în aceeași tranzacție PostgreSQL**. Dacă inserarea auditului eșuează, tranzacția se anulează (fail closed). Pentru refuzuri/401/403 și evenimente fără mutație, jurnalizare securizată pe flux separat, fără a transforma fiecare eroare într-un blocaj global.

**AUD-INV-02:** Nicio interfață nu poate trimite `actor_id`, `role` sau `workspace` ca adevăr autoritativ. Serverul le derivă din sesiune/credentiale și din ruta/handlerul executat. Datele clientului pot fi păstrate separat ca *claimed*, niciodată ca identitate verificată.

**AUD-INV-03:** Auditul este **append-only** pentru rolul aplicației: `INSERT` prin serviciu dedicat; `UPDATE`/`DELETE` interzise, inclusiv pentru administratorii obișnuiți. Superuser/DBA poate tehnic altera DB; de aceea exportul către depozit extern cu retenție protejată și semnătură este necesar pentru dovadă mai puternică.

**AUD-INV-04:** Nu se păstrează parole, PIN-uri, tokenuri, secrete API, cookie-uri, IBAN în clar, date card, fotografii sensibile sau payloaduri integrale de cereri. Diferențele se redactează conform unei liste de câmpuri permisă, nu unei liste de excluderi incomplete.

**AUD-INV-05:** Acțiunile agenților AI înregistrează separat cine a cerut execuția, agentul, versiunea, tool-ul, propunerea, aprobatorul uman, execuția efectivă și rezultatul. Nicio aprobare AI nu se atribuie fals unui om.

**AUD-INV-06:** Corecțiile de jurnal, contabilitate, stoc și trasabilitate sunt evenimente noi de compensare/reversare, nu ștergerea dovezii inițiale.

**AUD-INV-07:** Exportul unui dosar de investigație este el însuși auditat, cu actor, motiv, interval, filtre, număr evenimente, checksum, acces limitat și termen de retenție.

**AUD-INV-08:** Evenimentele sunt legate de tenant, dar o investigație cross-tenant necesită rol dedicat, scop, aprobare și audit al accesului. Un gospodar nu poate vedea auditul altuia.

**AUD-INV-09:** La eșecul rețelei sau al procesorului de evenimente, outbox-ul poate retrimite fără dublare; ID-ul și cheia de idempotency deduplică. `occurred_at` (moment logic) și `recorded_at` (persistare) nu se confundă.

**AUD-INV-10:** Jurnalizarea operațională și logurile tehnice sunt diferite: logurile de aplicație nu sunt sursă de adevăr pentru acțiuni financiare, aprobări sau modificări de date.

## 4. Design PostgreSQL propus

- `platform.audit_events` existent în schema ChatGPT este doar **scheletul**: are actor, household, action, resource, request, hashuri, metadata; nu acoperă integral contractul de mai sus. Necesită evoluție versionată, fără schimbări destructive.
- Recomandare: `platform.audit_events_v2` cu câmpurile contractului, indexuri pe `(household_id,occurred_at,id)`, `(actor_id,occurred_at)`, `(correlation_id)`, `(resource_type,resource_id,occurred_at)`; payloaduri redactate și metadate cu schemă.
- `audit_integrity_batches` cu `from_event_id`, `to_event_id`, `merkle_root/hash`, `signed_at`, `key_id`, `immutable_object_key`. Hash chain simplu pe evenimente concurente are costuri și condiții de ordonare: definirea segmentelor/loturilor și a ordinii trebuie testată, nu presupusă.
- Chei de criptare și semnătură gestionate separat de baza de date; exporturi periodice către object storage cu retenție protejată (WORM/object lock dacă infrastructura permite). Nu pretindem „imposibil de falsificat” fără model de amenințări și verificare independentă.
- Rolurile SQL: aplicația fără `UPDATE/DELETE` pe audit; worker separat pentru export; rol de investigații read-only cu politici specifice; administratorul obișnuit nu are acces la toate datele sensibile.
- Retenția pe categorii și baza legală se stabilesc cu responsabilul GDPR/jurist; se aplică minimizare, control de acces, ștergere/anonimizare unde legea permite, fără a compromite obligațiile legale de păstrare.

## 5. Exemple de proveniență

**Admin modifică jurnalul gospodăriei X:** `actor_type=human`, `workspace=admin`, `on_behalf_of_household_id=X`, `action=production.journal.correct`, `resource_id=<journal-id>`, `reason_code=correction`; actorul este Admin, nu gospodar. Originea rămâne `/admin/households/:id/journal` chiar dacă componenta UI este reutilizată.

**Gospodar declară mortalitate:** `workspace=household`, `action=production.mortality.record`, `household_id=X`, `lot_id=Y`, actor gospodar; cantitatea nouă și motivul, cu document/evidență după politică.

**AI propune schimbare:** `actor_type=ai`, `action=ai.proposal.create`, `correlation_id` comun; apoi aprobare distinctă `actor_type=human`; execuție distinctă `actor_type=system` cu referință la aprobarea umană.

**Schimbare IBAN:** evenimente `bank.change.requested`, `bank.change.verified`, `bank.change.activated` sau `rejected`; fără IBAN în clar în log, numai fingerprint protejat și referință la cont.

## 6. Teste de acceptanță

| ID | Test | Rezultat |
|---|---|---|
| AUD-T01 | Modificare jurnal Admin | actor Admin, workspace Admin, gospodărie țintă, before/after redactat |
| AUD-T02 | Modificare jurnal Gospodar | actor Gospodar, workspace Household, tenant corect |
| AUD-T03 | Acțiune fără permisiune | refuz 403 și eveniment de securitate fără leak |
| AUD-T04 | Tranzacție business cu eroare audit | rollback complet, fără mutație orfană |
| AUD-T05 | Audit `UPDATE`/`DELETE` cu rol aplicație | permission denied |
| AUD-T06 | IBAN schimbat | 3 evenimente distincte, fără IBAN brut |
| AUD-T07 | Agent AI propune, om aprobă, worker execută | 3 actori/etape distincte, corelate |
| AUD-T08 | Retry/replay request | fără dublarea efectului de business/audit |
| AUD-T09 | Investigare cross-tenant fără drept | refuz și eveniment de securitate |
| AUD-T10 | Export dosar | manifest, checksum, audit acces/export |
| AUD-T11 | Session refresh / schimbare workspace | proveniența păstrată corect |
| AUD-T12 | Corecție sau reversare | originalul rămâne, eveniment nou îl referă |
| AUD-T13 | Scriere concurentă | evenimente identificabile și ordonare deterministă |
| AUD-T14 | Logare cu payload ce conține PIN/token | datele sensibile nu apar în audit/log |
| AUD-T15 | Crash după commit, înainte de dispatch | outbox retrimite fără duplicare |
| AUD-T16 | Export extern și verificare semnătură | tampering detectabil în modelul de amenințări |

**Toate testele sunt NESCRISE/NERULATE la momentul documentării.** Un test PASS necesită execuție și dovadă.

## 7. Instrucțiuni tehnice pentru Claude

1. Inventariază toate punctele de mutație din codul actual: server actions, API, `store.append/update/remove/transact`, admin, gospodărie, client, curier, cron, integrări și AI.
2. Raportează diferența dintre jurnalul existent și contractul AUD-001, cu fișiere și linii; nu afirma că auditul este complet dacă sunt căi de scriere neinstrumentate.
3. Creează serviciu central de audit cu identitate verificată din server, `request_id` și `correlation_id`; interzice spoofing de actor și workspace.
4. Pentru codul actual JSONB, documentează limitele atomicității cross-collection. **Nu pretinde atomicitate între modificare și audit dacă `DocumentStore.transact` permite doar o colecție/un document**. Dacă este necesar, introdu mecanism tranzacțional nou sau marchează gap P0 înainte de a declara rezolvat.
5. Instrumentează întâi P0: IBAN, PIN/acces, precomenzi și alocări, jurnal, loturi, documente/compliance, livrare, roluri și mandat; apoi restul acțiunilor relevante.
6. Testează AUD-T01…AUD-T16; raportează PASS/FAIL/SKIP și probe. Un PR dedicat, fără amestec cu IBAN sau navigare; nu face merge automat.
7. Documentează minimizarea datelor, retenția și exportul pentru investigații; consultă jurist/DPO pentru termene și baza legală.

## 8. Decizii deschise

- Perioadele de retenție și scopurile legale pe clase de evenimente.
- Pragul de jurnalizare pentru vizualizări nesensibile și clickuri fără efect.
- Soluția de stocare WORM și politica cheilor de semnătură.
- Cine poate autoriza și accesa un export de investigație.
- Pseudonimizarea IP și identificatorilor de dispozitiv, în raport cu necesitatea investigațiilor.

**Definition of Done:** fiecare operație relevantă este mapată la eveniment și test; actorul real și spațiul sunt verificabile; modificările nu pot exista fără audit în tranzacțiile mutative; jurnalul este protejat, redactat, căutabil și exportabil conform politicii.
