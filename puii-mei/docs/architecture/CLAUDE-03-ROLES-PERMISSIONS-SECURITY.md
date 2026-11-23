# CLAUDE — PUII MEI · 03 — Roluri, permisiuni și securitate

**Autor:** Claude Code · **Data:** 23 noiembrie 2026 · **Versiune:** 0.1 (draft pentru comparație cu varianta ChatGPT)
**Bază:** `CLAUDE-02-SYSTEM-AND-DATABASE-ARCHITECTURE.md` v0.2 (tabelele `identity.*`, `platform.audit_log`, catalogul de
erori §16, securitatea transversală §18), `CLAUDE-TECHNICAL-ARCHITECTURE-V1.md` (control de acces as-built §5),
`00-SYSTEM-CONSTITUTION.md` (SC-006, SC-007, SC-026–SC-031), `01-BUSINESS-ARCHITECTURE.md` (actori, BA-010).
**Convenții:** **[CONFIRMAT]** · **[PROPUS]** · **[DESCHIS]** · **[COD]** = cum e azi în cod.

---

## Cuprins
1. Principii
2. Identități și metode de autentificare
3. Catalogul de roluri și ierarhia
4. Modelul de permisiuni (RBAC + condiții pe obiect)
5. Matricea permisiunilor, pe module
6. Separarea atribuțiilor și aprobarea în doi
7. Autentificare: parole, MFA, sesiuni, recuperare
8. Accesul fără cont: client (PIN) și curier
9. Agenții AI: identitate și limite
10. Punctele de aplicare a autorizării
11. Jurnalizarea acțiunilor
12. Modelul de amenințări (STRIDE)
13. Protecția datelor și GDPR
14. Diferențe față de codul actual (de migrat)
15. Decizii deschise
16. Teste și criterii de acceptanță

---

## 1. Principii

| ID | Principiu | Statut |
|---|---|---|
| SEC-P01 | **Interzis implicit:** orice acțiune fără permisiune explicită e refuzată | [CONFIRMAT] SC-007 |
| SEC-P02 | **Verificare pe server, pe rol și pe obiect** (gospodăria, lotul, comanda, tura); interfața nu e control de securitate | [CONFIRMAT] SC-007 |
| SEC-P03 | **Privilegiu minim:** fiecare rol primește doar ce îi trebuie pentru sarcina lui | [PROPUS] |
| SEC-P04 | **Separarea atribuțiilor:** cine înregistrează nu aprobă singur (bani, deblocări, roluri) | [PROPUS] |
| SEC-P05 | **Fiecare acțiune e atribuită** unui actor identificabil, rol, obiect, gospodărie, motiv și, unde e cazul, mandat | [CONFIRMAT] SC-006 |
| SEC-P06 | **Refuzurile se jurnalizează** ca și reușitele, fără a divulga existența obiectelor ascunse (404 în loc de 403 pe obiecte străine) | [PROPUS] |
| SEC-P07 | **AI-ul nu are autoritate proprie:** acționează cu permisiunile identității lui tehnice și cere aprobare umană pentru acțiunile critice | [CONFIRMAT] SC-027 |

---

## 2. Identități și metode de autentificare

| Identitate | Cine | Autentificare | Durata accesului | Statut |
|---|---|---|---|---|
| Utilizator intern | echipa PUII MEI | email + parolă + **MFA obligatoriu** | sesiune 12 h, inactivitate 30 min | [PROPUS] |
| Utilizator al gospodăriei | gospodar, membru al gospodăriei | email sau telefon + parolă; MFA opțional (recomandat titularului) | sesiune 30 zile pe dispozitiv de încredere, 14 zile implicit | [PROPUS] (azi 14 zile [COD]) |
| Partener extern | contabil, investitor | email + parolă + MFA obligatoriu pentru contabil | sesiune 12 h | [PROPUS] |
| Client | cumpărătorul | număr precomandă + PIN 6 cifre pe telefon | 24 h | [CONFIRMAT de PO] |
| Curier | șofer, fără cont | link de tură + PIN de ridicare / PIN personal | durata turei, max. 24 h | [COD] |
| Agent AI | identitate tehnică | cheie API cu scopuri, rotită la 90 zile | per cerere | [PROPUS] SC-026 |
| Sistem | worker, joburi | credențiale de serviciu, fără login interactiv | — | [PROPUS] |
| Vizitator | public | — | — | — |

**Admin „de urgență” din variabilele de mediu** (`ADMIN_USER` / `ADMIN_PASSWORD`) [COD]: păstrat doar ca acces de
urgență („break-glass”), cu MFA și alertă la fiecare folosire [PROPUS]; utilizarea zilnică se face cu conturi nominale.

---

## 3. Catalogul de roluri și ierarhia

### 3.1 Roluri globale (echipa PUII MEI) — `identity.user_roles`

| Cod | Rol | Responsabilitate | Statut |
|---|---|---|---|
| `admin_platforma` | Administrator platformă | conturi, roluri, setări, configurație program; nu operează bani singur | [PROPUS] (azi rolul unic `admin` [COD]) |
| `manager_operational` | Manager operațional | gospodării, loturi, alocări, excepții, monitorizare, ture | [PROPUS] |
| `financiar` | Financiar | plăți, confirmări cu dovadă, registre, închidere lot, onorariu, facturi, rambursări | [PROPUS] |
| `calitate` | Control calitate și conformitate | Compliance Gate, inspecții, neconformități, blocare / deblocare lot | [PROPUS] |
| `logistica` | Logistică | zone, aprovizionare, procesare, ture, curieri | [PROPUS] |
| `suport_clienti` | Suport clienți | vede comenzi și trimite PIN-uri manuale; nu modifică bani | [PROPUS] |
| `auditor` | Auditor intern / extern | doar citire, inclusiv jurnalul de audit | [PROPUS] |

### 3.2 Roluri pe gospodărie — `identity.memberships` (limitate la gospodăria lor)

| Cod | Rol | Responsabilitate |
|---|---|---|
| `gospodar` | Titularul gospodăriei | tot ce ține de propria producție, registru, documente, ture, contul pentru avans |
| `membru_gospodarie` | Membru al familiei / ajutor | jurnal de creștere, poze, mortalitate, consumuri; **fără** bani, conturi, contracte |
| `contabil` | Contabilul extern al gospodăriei | citire registru și documente; marcare „verificat contabil”; fără producție |
| `investitor_observator` | Investitorul care susține gospodăria | vede doar ce aprobă PO (BA-010, [DESCHIS]) |

### 3.3 Ierarhia și cine acordă rolurile

```
admin_platforma ─ acordă ─► roluri globale (cu aprobarea unui al doilea admin_platforma, §6)
admin_platforma / manager_operational ─ acordă ─► gospodar (titular), la activarea gospodăriei
gospodar ─ invită ─► membru_gospodarie, contabil (în propria gospodărie)
admin_platforma ─ acordă ─► investitor_observator (după contractul de investiție)
```

Un utilizator poate avea mai multe roluri și mai multe gospodării [PROPUS, ADR-006]; permisiunile efective = reuniunea
permisiunilor, fiecare limitată la scopul ei.

---

## 4. Modelul de permisiuni

### 4.1 Permisiuni
Format: `modul.resursa.actiune` (ex. `production.lot.approve`). Catalogul complet e în §5.

### 4.2 Scopuri
| Scop | Simbol | Înțeles |
|---|---|---|
| Global | **G** | orice obiect |
| Gospodăria proprie | **H** | obiecte cu `household_id ∈ memberships(user)` |
| Obiect propriu | **O** | obiectul creat de / aparținând actorului (comanda clientului, tura curierului, investiția investitorului) |
| Cu aprobare | **A** | acțiunea creează o cerere care devine efectivă după aprobarea altui rol (§6) |
| Interzis | — | |

### 4.3 Funcția de autorizare
```ts
authorize(ctx: ActorContext, action: Permission, resource: { type; id; householdId?; ownerId?; state? })
  → { allowed: true } | { allowed: false; code: 'ACCESS_DENIED' | 'RESOURCE_NOT_FOUND' | 'COMPLIANCE_BLOCKED' | 'LOT_ON_HOLD' }
```
Pași: (1) actorul are permisiunea prin vreun rol; (2) scopul se potrivește cu obiectul; (3) **condițiile de stare**:
gospodăria nu e suspendată / exclusă și are Compliance Gate valid pentru acțiunile comerciale; lotul nu e blocat;
mandatul acoperă acțiunea (pentru operațiunile PUII MEI în numele gospodăriei); fereastra de timp e validă (PIN, tură);
(4) MFA proaspăt (< 15 min) pentru acțiunile marcate **MFA** în §5.

---

## 5. Matricea permisiunilor

Coloane: **Adm** admin_platforma · **Op** manager_operational · **Fin** financiar · **Cal** calitate · **Log** logistica ·
**Sup** suport_clienti · **Aud** auditor · **Gsp** gospodar · **Mbr** membru_gospodarie · **Cont** contabil ·
**Inv** investitor_observator · **Cli** client (PIN) · **Cur** curier · **AI** agent (prin propunere aprobată).

### 5.1 identity
| Permisiune | Adm | Op | Fin | Cal | Log | Sup | Aud | Gsp | Mbr | Cont | Inv | Cli | Cur | AI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| identity.user.invite | G | H¹ | — | — | — | — | — | H² | — | — | — | — | — | — |
| identity.user.disable | G·MFA | — | — | — | — | — | — | H² | — | — | — | — | — | — |
| identity.role.grant_global | A·MFA | — | — | — | — | — | — | — | — | — | — | — | — | — |
| identity.session.revoke | G | — | — | — | — | — | — | O | O | O | O | — | — | — |
| identity.pin.send_manual | G | G | — | — | — | G | — | — | — | — | — | — | — | — |
| identity.audit.read | G | — | — | — | — | — | G | — | — | — | — | — | — | — |

¹ doar titularul unei gospodării noi · ² doar `membru_gospodarie` și `contabil` în propria gospodărie.

### 5.2 household (Household OS)
| Permisiune | Adm | Op | Fin | Cal | Log | Sup | Aud | Gsp | Mbr | Cont | Inv | AI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| household.create / activate | G | G·A³ | — | — | — | — | — | — | — | — | — | propune |
| household.profile.edit (public) | G | G | — | — | — | — | — | H | — | — | — | propune |
| household.land.declare | G | G | — | — | — | — | — | H | — | — | — | — |
| household.land.verify | G | G | — | G | — | — | — | — | — | — | — | — |
| household.bank_account.edit | G·MFA | — | G·MFA | — | — | — | — | H·MFA⁴ | — | — | — | — |
| household.mandate.manage | G·A | — | — | — | — | — | — | H (semnare) | — | — | — | — |
| household.compliance.check | — | — | — | G | — | — | R | R(H) | — | — | — | propune |
| household.standing.change | G·A | G·A | — | G·A | — | — | R | R(H) | — | — | — | — |
| household.read | G | G | G | G | G | G | G | H | H | H | H⁵ | după scop |

³ activarea cere Compliance Gate valid (INV-08) · ⁴ schimbarea IBAN-ului: notificare pe toate canalele titularului +
intrare în vigoare după 24 h (protecție la fraudă) [PROPUS] · ⁵ doar câmpurile aprobate de PO (BA-010) · R = citire.

### 5.3 program
| Permisiune | Adm | Op | Fin | Cal | Gsp | AI |
|---|---|---|---|---|---|---|
| program.version.draft | G | G | G (costuri) | G (conformitate) | — | propune |
| program.version.approve | A·MFA | — | — | — | — | — |
| program.enroll_household | G | G | — | R | R(H) | propune |

### 5.4 production
| Permisiune | Adm | Op | Cal | Log | Gsp | Mbr | Cont | Inv | Cli | AI |
|---|---|---|---|---|---|---|---|---|---|---|
| production.lot.propose | G | G | — | — | H | — | — | — | — | propune |
| production.lot.approve / reject | G | G | — | — | — | — | — | — | — | — |
| production.pen.start | G | G | — | — | H | — | — | — | — | — |
| production.flock_event.record (intrare, mortalitate) | G | G | G | — | H | H | — | — | — | — |
| production.flock_event.correct | G·A | G·A | — | — | H·A⁶ | — | — | — | — | — |
| production.growth_entry.add (mutare, poză, tratament) | — | — | — | — | H | H | — | — | — | — |
| production.weighing.add | — | G | G | — | H | H | — | — | — | — |
| production.alert.resolve | G | G | G | — | H | — | — | — | — | propune |
| production.lot.read | G | G | G | G | H | H | H | H⁵ | O⁷ | după scop |

⁶ corecția efectivului cere aprobarea managerului operațional (append-only + rectificare, INV-06) · ⁷ clientul vede
lotul și țarcul **comenzii lui** (vedere publicată, fără date ale altor clienți).

### 5.5 inventory
| Permisiune | Op | Fin | Log | Gsp | Mbr | Cont | AI |
|---|---|---|---|---|---|---|---|
| inventory.supply_order.create | G | — | G | H | — | — | propune |
| inventory.stock.receive / consume | G | — | G | H | H | — | — |
| inventory.read | G | G | G | H | H | H | după scop |

### 5.6 commerce
| Permisiune | Adm | Op | Fin | Sup | Gsp | Cli | Public | AI |
|---|---|---|---|---|---|---|---|---|
| commerce.order.place | — | — | — | — | — | — | **da** (cu limită de rată) | — |
| commerce.order.allocate (manual) | G | G | — | — | — | — | — | propune |
| commerce.order.choose_split_or_wait | — | — | — | — | — | O | — | — |
| commerce.order.cancel | G·A⁸ | G·A⁸ | — | — | — | O⁸ | — | — |
| commerce.order.read | G | G | G | G | H⁹ | O | — | după scop |
| commerce.price_list.change | G·MFA | — | G·MFA | — | — | — | — | propune |
| commerce.zone.manage | G | G | — | — | — | — | — | — |

⁸ clientul anulează gratuit până la confirmare [COD]; după avans, regulile de rambursare sunt [DESCHIS BA-007] ·
⁹ gospodarul vede comenzile alocate gospodăriei sale: nume, telefon, adresă de livrare **doar** pentru comenzile aflate
în livrare [PROPUS, minimizare].

### 5.7 contracts
| Permisiune | Adm | Op | Fin | Gsp | Cli | Inv | Jurist ext. |
|---|---|---|---|---|---|---|---|
| contracts.template.edit | G | — | — | — | — | — | propune |
| contracts.template.validate_legal | — | — | — | — | — | — | **da** (cont `auditor` + marcaj) [DESCHIS] |
| contracts.contract.issue | G | G | — | — | — | — | — |
| contracts.contract.accept / sign | — | — | — | H (ca parte) | O | O | — |
| contracts.contract.read | G | G | G | H | O | O | — |

### 5.8 finance
| Permisiune | Adm | Op | Fin | Aud | Gsp | Cont | Inv | Cli | AI |
|---|---|---|---|---|---|---|---|---|---|
| finance.payment.declare (am plătit) | — | — | — | — | — | — | — | O | — |
| finance.payment.confirm (cu referință bancară) | — | — | G·MFA | — | H¹⁰ | — | — | — | **niciodată** |
| finance.refund.propose | — | G | G | — | H | — | — | — | propune |
| finance.refund.approve | — | — | A·MFA | — | — | — | — | — | — |
| finance.ledger.draft | — | — | G | — | H | H | — | — | propune |
| finance.ledger.confirm | — | — | G | — | H | H | — | — | — |
| finance.ledger.void | — | — | G·A | — | H·A | — | — | — | — |
| finance.lot.close (calcul venituri − cheltuieli) | — | — | G | R | R(H) | R(H) | — | — | propune |
| finance.fee.approve (onorariu 10%, ADR-001) | — | — | A·MFA¹¹ | R | accept (H) | R(H) | — | — | — |
| finance.invoice.issue | — | — | G·MFA | R | R(H) | R(H) | — | — | — |
| finance.investment.manage | G·A | — | G | R | R(H) | — | O (citire) | — | — |
| finance.repayment.record | — | — | G | R | R(H) | — | O (citire) | — | — |

¹⁰ beneficiarul plății (gospodăria) confirmă primirea cu referința extrasului; confirmarea de către PUII MEI în numele
gospodăriei doar dacă mandatul o permite (SC-041, BA-002 [DESCHIS]) · ¹¹ onorariul îl aprobă financiarul; gospodarul
îl acceptă sau îl contestă; cine a confirmat registrul lotului nu poate aproba onorariul (§6).

### 5.9 logistics
| Permisiune | Op | Log | Sup | Gsp | Cli | Cur |
|---|---|---|---|---|---|---|
| logistics.label.generate | G | G | — | H | — | — |
| logistics.tour.create / route / cancel | G | G | — | H | — | — |
| logistics.courier.grant_access | G | G | — | H | — | — |
| logistics.parcel.load / deliver | — | — | — | — | — | O (tura lui) |
| logistics.extension.request | — | — | — | — | — | O |
| logistics.extension.decide | G | G | — | — | — | — |
| logistics.parcel.confirm_receipt / rate | — | — | — | — | O | — |
| logistics.processing.record | G | G | — | H | — | — |

### 5.10 quality
| Permisiune | Op | Cal | Gsp | Cli | AI |
|---|---|---|---|---|---|
| quality.inspection.record | G | G | — | — | — |
| quality.nonconformity.open | G | G | H (autosemnalare) | O (reclamație) | propune |
| quality.corrective_action.complete | G | G | H | — | — |
| quality.lot_hold.place | G | G | — | — | propune |
| quality.lot_hold.release | — | A·MFA¹² | — | — | **niciodată** |

¹² deblocarea unui lot cere persoana competentă (calitate) + al doilea aprobator pentru severitate „critică” (SC-020).

### 5.11 documents, platform, ai
| Permisiune | Adm | Op | Fin | Cal | Aud | Gsp | Mbr | Cont | Inv | Cli |
|---|---|---|---|---|---|---|---|---|---|---|
| documents.upload | G | G | G | G | — | H | H (poze) | H | — | O (poze reclamație) |
| documents.verify | G | G | G | G | — | — | — | H (contabil) | — | — |
| documents.download | G | G | G | G | G | H | H¹³ | H | după link | O |
| platform.settings.change | G·MFA | — | — | — | — | — | — | — | — | — |
| platform.export.data (rapoarte) | G·A | G | G | G | G | H | — | H | — | — |
| ai.agent.enable / scopes | A·MFA | — | — | — | — | — | — | — | — | — |
| ai.proposal.decide | conform permisiunii acțiunii propuse | | | | | | | | | |

¹³ membrul gospodăriei descarcă doar poze și documente de producție, nu financiare.

---

## 6. Separarea atribuțiilor și aprobarea în doi

| Acțiune | Regula | Statut |
|---|---|---|
| Acordarea unui rol global | propus de un `admin_platforma`, aprobat de **alt** `admin_platforma` | [PROPUS] |
| Confirmarea unei plăți | doar beneficiarul / mandatarul autorizat, cu referință bancară; **niciodată** clientul sau AI-ul | [CONFIRMAT] SC-017 |
| Rambursare | propusă de operațional / gospodar, aprobată de financiar cu MFA | [PROPUS] |
| Onorariul (ADR-001) | calculat de sistem, aprobat de financiar, acceptat sau contestat de gospodar; cine a confirmat registrul nu aprobă | [PROPUS] |
| Corecția efectivului / anularea în registru | autorul propune, alt rol aprobă; originalul rămâne | [PROPUS] |
| Deblocarea lotului | calitate; pentru „critic” + al doilea aprobator | [PROPUS] SC-020 |
| Schimbarea IBAN-ului gospodăriei | MFA + notificare pe toate canalele + întârziere 24 h | [PROPUS] |
| Versiunea de program (parametri, costuri standard) | redactată de operațional / financiar / calitate, aprobată de admin cu MFA | [PROPUS] |

Cererile de aprobare se păstrează în `ai.proposals` (pentru AI) și într-un tabel general `platform.approvals`
(`id, action, object, requested_by, requested_at, payload, decided_by, decided_at, decision, reason`) [PROPUS, de
adăugat în CLAUDE-02 v0.3].

---

## 7. Autentificare

### 7.1 Parole
- Hash **scrypt** [COD] (parametrii impliciți Node: N=2^14, r=8, p=1; salt 16 B; cheie 64 B) — păstrat, cu N crescut la 2^15
  la următoarea schimbare de parolă; migrare transparentă la Argon2id posibilă la login [PROPUS].
- Minim 10 caractere [COD: 10]; verificare față de lista de parole compromise (k-anonymity, offline) [PROPUS].
- Fără reguli de compoziție forțată; fără expirare periodică (recomandare NIST 800-63B).

### 7.2 MFA [din ChatGPT, PROPUS]
- Obligatoriu pentru toate rolurile globale și pentru contabil; recomandat pentru gospodar.
- TOTP (aplicație) și WebAuthn (cheie / biometric). **Fără SMS ca factor** pentru roluri interne (SIM swap).
- 10 coduri de recuperare de unică folosință, afișate o singură dată, păstrate ca amprente.
- „MFA proaspăt” (< 15 min) pentru acțiunile marcate **MFA** în §5.

### 7.3 Sesiuni
| Regulă | Valoare | Statut |
|---|---|---|
| Cookie | `httpOnly`, `Secure`, `SameSite=Lax`, semnat HMAC-SHA256 cu `SESSION_SECRET` (min. 32 caractere) | [COD] după #46 |
| Durată | intern 12 h + 30 min inactivitate; gospodărie 14 zile | [PROPUS] (azi 14 zile pentru toți [COD]) |
| Invalidare | `session_version` crește la schimbarea parolei, dezactivare, revocare roluri | [COD] |
| Sesiuni pe server | tabel `identity.sessions` (id, user, device, ip, creată, ultima activitate, revocată) pentru lista „unde sunt conectat” și revocare individuală | [PROPUS] |
| Rotirea cheii | `SESSION_SECRET` rotit la 6 luni sau la incident; suport pentru 2 chei active (curentă + anterioară) în perioada de tranziție | [PROPUS] |

### 7.4 Recuperarea contului
- Link de resetare: o singură folosință, valabil **1 h**, păstrat ca amprentă (`identity.invitations`), trimis pe emailul
  contului; răspuns identic dacă emailul nu există (fără enumerare) [PROPUS]. Azi [COD]: linkul de resetare e generat de
  admin, valabil 7 zile, iar tokenul e păstrat în clar în contul utilizatorului.
- Invitații: valabile **7 zile** [COD].
- Pierderea MFA: resetare doar de un `admin_platforma` **diferit** de utilizator, după verificarea identității pe alt
  canal; jurnalizată și notificată.

### 7.5 Limitarea încercărilor (persistentă, comună tuturor serverelor)
| Țintă | Limită | Statut |
|---|---|---|
| Login per cont | 5 eșecuri / 15 min → blocare 15 min | [COD] valorile, [PROPUS] persistența |
| Login per IP | 30 eșecuri / 15 min | [PROPUS] |
| Cerere PIN client | 1 / minut / comandă; max. 5 / zi / comandă; max. 20 / zi / IP | [PROPUS] (azi 1 / minut [COD]) |
| Verificare PIN client | 5 greșeli / PIN → PIN invalidat | [COD] |
| PIN curier | blocarea turei după prea multe greșeli | [COD] |
| Formulare publice (precomandă, contact, parteneri) | 10 / oră / IP + câmp-capcană | [PROPUS] (capcana [COD]) |

---

## 8. Accesul fără cont

### 8.1 Client [CONFIRMAT de PO]
- Intrare: număr precomandă → PIN 6 cifre pe telefonul din comandă (SMS; până la configurare: email sau trimis manual
  din admin) → acces **24 h** la comanda lui și la părțile ei (cookie semnat pe numărul comenzii-mamă).
- Cel care tocmai a plasat comanda primește automat acces 24 h pe același dispozitiv [COD].
- Clientul vede: panoul comenzii, trasabilitatea lotului, jurnalul cu poze (doar lotul lui), plățile, contractul,
  livrarea. **Nu** vede: alți clienți, datele financiare ale gospodăriei, documentele interne.
- Linkurile secrete existente (`/comanda/<token>`) cer PIN [COD după #40]; tokenurile pentru poze (`?o=`) [COD] se
  înlocuiesc cu linkuri semnate cu expirare scurtă [PROPUS] (nu ajung în istoricul browserului pe termen lung).
- PIN-ul manual (`manual_pin`) dispare din flux după configurarea SMS-ului (ADR-TECH-009).

### 8.2 Curier [COD]
- Link de tură + PIN de ridicare de la gospodar sau PIN personal aprobat; sesiune legată de tură, max. 24 h;
  revocată la resetarea accesului.
- Vede: opririle turei, adresele și telefoanele **doar pe durata turei**, temperaturile; nu vede prețuri.

---

## 9. Agenții AI

| Regulă | Detaliu |
|---|---|
| Identitate | fiecare agent are `ai.agents` + un utilizator tehnic cu roluri dedicate (`agent_*`) |
| Permisiuni | scopuri explicite pe API v1 (ex. `production.lot.read`, `production.alert.propose`); **niciodată** `finance.payment.confirm`, `quality.lot_hold.release`, `identity.role.*` |
| Acțiuni | doar **propuneri** (`ai.proposals`) pentru orice scriere cu efect real; omul aprobă cu permisiunea acțiunii propuse |
| Date | acces minim, fără date personale ale clienților în afara scopului (agentul pentru clienți vede doar comanda din conversație) |
| Intrări externe | tratate ca date, nu ca instrucțiuni (SC-028); conținutul documentelor nu poate cere acțiuni |
| Limite | buget zilnic, număr de cereri, timeout; oprire de urgență (`enabled = false`) |
| Jurnal | `ai.runs` (model, digest input, instrumente, cost, rezultat) + `audit_log` pentru acțiunile aprobate |

Detaliile pe fiecare agent (administrativ, gospodării, producție, comercial, financiar, logistic, calitate, clienți,
analiză) urmează în documentul dedicat agenților.

---

## 10. Punctele de aplicare a autorizării

| Punct | Cum se aplică |
|---|---|
| Server actions (UI web) | fiecare acțiune apelează o comandă de domeniu care apelează `authorize()`; nicio acțiune nu scrie direct în baza de date |
| Rute HTTP (`/api/v1`, `/fisiere`, `/foto`) | middleware de identitate + `authorize()` pe obiect; descărcările prin linkuri semnate |
| Joburi și worker | rulează ca identitate `system` cu permisiuni explicite; jurnalizate |
| Gateway AI | traduce cererea agentului într-o comandă de domeniu cu identitatea agentului; propunere dacă e critică |
| Baza de date | Row Level Security pe `household_id` (a doua barieră); `GRANT` minim (fără `UPDATE` / `DELETE` pe tabelele append-only) |
| Interfață | ascunde ce nu e permis (comoditate), dar **nu** e barieră |

---

## 11. Jurnalizarea acțiunilor

- Se jurnalizează: autentificări (reușite / eșuate), MFA, schimbări de rol, toate mutațiile de domeniu, refuzurile de
  acces, descărcările de documente, exporturile, deciziile pe propuneri AI, folosirea contului de urgență.
- Câmpuri (`platform.audit_log`): actor, tip actor, acțiune, obiect, gospodărie, înainte / după (câmpuri permise; IBAN,
  CNP, telefoane mascate), motiv, `request_id`, lanț de amprente [CLAUDE-02 v0.2].
- Acces la jurnal: `admin_platforma`, `auditor`; gospodarul vede jurnalul obiectelor gospodăriei lui (cine a modificat
  ce), fără datele altor gospodării.
- Retenție [DESCHIS]: propun 5 ani pentru jurnalul de securitate, 10 ani pentru cel financiar (de verificat cu
  contabilul).
- Alerte: login de urgență, MFA resetat, rol global acordat, schimbare IBAN, prea multe refuzuri de la același actor.

---

## 12. Modelul de amenințări (STRIDE, prioritizat)

| # | Amenințare | Categorie | Probabilitate / impact | Măsuri |
|---|---|---|---|---|
| T01 | Acces la datele altei gospodării schimbând un ID în URL (IDOR) | Information disclosure | mare / mare | `authorize()` pe obiect + RLS + 404 pe obiecte străine; teste negative pe fiecare rută |
| T02 | Ghicirea PIN-ului clientului | Spoofing | medie / mediu | 6 cifre, 5 încercări, expirare 24 h, limită pe IP și pe zi |
| T03 | Scurgerea tokenurilor din URL (istoric, loguri, referrer) | Information disclosure | medie / mediu | PIN obligatoriu; linkuri semnate cu expirare scurtă; `Referrer-Policy: same-origin`; tokenuri mascate în loguri |
| T04 | Furtul sesiunii | Spoofing | scăzută / mare | cookie `httpOnly` + `Secure`; sesiuni scurte pentru intern; revocare; MFA |
| T05 | CSRF pe acțiuni | Tampering | scăzută / mediu | verificarea `Origin` (server actions); API fără cookie |
| T06 | XSS (text introdus de utilizatori, ex. observații, descrieri) | Tampering | scăzută / mare | escapare React; fără `dangerouslySetInnerHTML` pe date de utilizator; CSP strict |
| T07 | Injecție SQL | Tampering | scăzută / mare | doar interogări parametrizate (ORM / `pg`) |
| T08 | Fișier malițios încărcat | Tampering | medie / mare | tip real, scanare antivirus, servit doar după „curat”, `Content-Disposition: attachment` |
| T09 | Escaladare de privilegii prin editarea rolurilor | Elevation | scăzută / foarte mare | aprobare în doi + MFA + alertă |
| T10 | Abuz din interior (admin) | Repudiation | scăzută / mare | conturi nominale, audit cu lanț de amprente, separarea atribuțiilor |
| T11 | Schimbarea IBAN-ului pentru a deturna avansurile | Tampering | medie / foarte mare | MFA, întârziere 24 h, notificare pe toate canalele titularului |
| T12 | Injecție de instrucțiuni în agenții AI (prin documente sau mesaje) | Elevation | medie / mare | intrările = date; acțiunile critice doar prin propunere + aprobare umană |
| T13 | Spam / supraîncărcare pe formularele publice | Denial of service | medie / mediu | limită de rată, câmp-capcană, CAPTCHA doar la nevoie |
| T14 | Dependențe npm compromise | Tampering | scăzută / mare | `npm ci` cu lockfile, actualizări revizuite, scanare de vulnerabilități în CI |
| T15 | Scurgerea secretelor | Information disclosure | scăzută / foarte mare | doar în managerul de secrete; rotire; scanarea secretelor pe GitHub |
| T16 | Export masiv de date personale | Information disclosure | scăzută / mare | export doar cu permisiune + jurnalizare + aprobare pentru exporturi globale |

---

## 13. Protecția datelor și GDPR

### 13.1 Inventarul datelor personale [PROPUS, de validat juridic]
| Categorie | Exemple | Cine vede | Protecție | Retenție propusă |
|---|---|---|---|---|
| Identitatea clientului | nume, telefon, email, adresă | client, suport, operațional; gospodarul doar pentru comenzile în livrare; curierul pe durata turei | criptare la nivel de furnizor; mascare în loguri | anonimizare la 24 luni după livrare; comanda rămâne pentru trasabilitate |
| Locație | pin pe hartă, GPS la predare | client, operațional, curier (tura) | idem | 12 luni |
| Semnături și poze la livrare | semnătură, poze colet | client, operațional | object storage privat | 12 luni (sau termenul de reclamații) |
| Gospodar | nume, CNP / CUI, IBAN, adresă, teren | gospodar, intern după rol, contabil | **criptare pe coloană** pentru CNP și IBAN (cheie în managerul de secrete) | durata contractului + termen legal |
| GPS în jurnalul de creștere | mutările țarcului | gospodar, intern, client (traseul lotului lui) | — | durata lotului + 5 ani (trasabilitate) [DESCHIS] |
| Conturi | email, telefon, jurnal de autentificare | utilizatorul, admin | hash parole, MFA | până la închiderea contului + 1 an |

### 13.2 Drepturile persoanelor
Export al datelor proprii (client: din panoul comenzii; utilizatori: din cont), rectificare, ștergere / anonimizare
unde legea permite (nu documentele fiscale), cereri înregistrate și rezolvate în 30 de zile, cu jurnal.

### 13.3 Incidente
Plan de răspuns: detectare → izolare → evaluare → notificarea ANSPDCP în 72 h dacă e cazul → notificarea persoanelor →
analiză post-incident. Responsabil [DESCHIS].

### 13.4 Transparența publică
Pagina `/cifre` publică azi venituri / cheltuieli / profit **pe fiecare gospodărie** [COD] — de restrâns la totaluri
până la decizia BA-010 (CX-02).

---

## 14. Diferențe față de codul actual (de migrat)

| Azi [COD] | Ținta | Prioritate |
|---|---|---|
| Un singur rol intern `admin` | 7 roluri globale | P1 |
| Gospodar = un singur `farmSlug` | membership pe mai multe gospodării, cu roluri | P1 |
| Fără MFA | MFA obligatoriu pentru intern și contabil | P0 înainte de pilotul real |
| Rate limiting în memorie (login) | persistent | P0 |
| Admin din variabile de mediu folosit zilnic | cont de urgență + conturi nominale | P1 |
| Investitorul vede cheltuielile / veniturile gospodăriei | doar ce aprobă PO (BA-010) | P1 |
| `/cifre` pe gospodărie | totaluri | P1 |
| Fără jurnal central de audit | `platform.audit_log` cu lanț | P0 |
| Poze cu token în URL (`?o=`) | linkuri semnate cu expirare | P2 |
| Confirmarea avansului fără referință bancară | referință + document (INV-04) | P0 pentru pilot |
| Membrul gospodăriei nu există | rol `membru_gospodarie` fără acces la bani | P2 |

---

## 15. Decizii deschise

| ID | Întrebare | Propunerea mea |
|---|---|---|
| SEC-D01 | Ce vede investitorul din gospodăria susținută (BA-010) | doar progresul investiției, rambursările și indicatori agregați ai lotului; fără clienți și fără registru detaliat |
| SEC-D02 | Ce vede gospodarul din datele clienților | numele și localitatea la alocare; adresa și telefonul doar când comanda intră în livrare |
| SEC-D03 | Poate PUII MEI confirma plăți în numele gospodăriei | doar cu mandat explicit (BA-002) |
| SEC-D04 | Retenția datelor | tabelul §13.1, de validat cu juristul și contabilul |
| SEC-D05 | Furnizorul de MFA / WebAuthn | bibliotecă open-source în aplicație (TOTP + WebAuthn), fără serviciu extern la start |
| SEC-D06 | Cine e responsabilul cu protecția datelor | de numit de PO |

---

## 16. Teste și criterii de acceptanță

**Teste obligatorii înainte de implementarea fiecărui modul:**
1. **Matricea negativă:** pentru fiecare permisiune din §5 și fiecare rol care are „—”, un test care confirmă refuzul
   (403 / 404) — generate automat din matrice.
2. **IDOR:** un gospodar din gospodăria A încearcă citire / scriere pe fiecare tip de obiect al gospodăriei B → 404.
3. **Client:** cu PIN-ul comenzii X, încercarea de a deschide comanda Y → redirect la login; PIN greșit de 5 ori →
   invalidat; cerere PIN peste limită → 429.
4. **Curier:** sesiunea turei A nu poate încărca / preda colete din tura B.
5. **Separarea atribuțiilor:** același utilizator nu poate confirma registrul și aproba onorariul aceluiași lot.
6. **MFA:** acțiunile marcate MFA refuzate fără MFA proaspăt.
7. **AI:** cheia unui agent nu poate apela `finance.payment.confirm` / `quality.lot_hold.release` (403), iar
   acțiunile lui de scriere devin propuneri.
8. **Audit:** fiecare mutație din testele E2E produce o intrare în `audit_log`; modificarea manuală a unei intrări e
   detectată de jobul de verificare.
9. **Headere:** CSP, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors` verificate.

**Criterii de acceptanță ale documentului:**
- [ ] PO aprobă catalogul de roluri (§3) și răspunde la SEC-D01 … D06.
- [ ] Fiecare acțiune existentă în cod (26 de fișiere de acțiuni, auditul V1 §5) are o permisiune în §5.
- [ ] Matricea e convertită în fișierul de politici din cod (`policies.ts`), sursa unică pentru verificări și teste.
- [ ] Varianta ChatGPT pentru același capitol e comparată; diferențele se rezolvă prin ADR.
