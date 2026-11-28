# PUII MEI — NAV-001: Navigare contextuală și continuitatea spațiului de lucru

**Prioritate:** P0 UX / securitate de context · **Statut:** cerință a fondatorului CONFIRMATĂ; soluție tehnică PROPUSĂ; implementare NEEXECUTATĂ · **Data:** 2026-11-23.

## 1. Defect observat de fondator (reproducere raportată, nu testată independent)

Din panoul Admin → Gospodării → Gospodărie X → Jurnal, aplicația sare în spațiul Gospodarului. Butonul „Panou Admin” revine la pagina principală a Adminului, nu la pagina de origine, iar uneori navigarea iese chiar din spațiul autentificat Admin. Nu există o cale de întoarcere coerentă. Acesta este un defect de navigare și de separare a contextelor, nu o simplă problemă de etichetă.

## 2. Reguli obligatorii

- **NAV-01 [CONFIRMAT]** Fiecare spațiu este explicit: `public`, `customer`, `household`, `admin`, `courier`, alte spații specializate după caz. Trecerea dintr-un spațiu în altul este **explicită și vizibilă**, niciodată efect secundar al deschiderii unui jurnal, document, comandă sau lot.
- **NAV-02 [CONFIRMAT]** Deschiderea Jurnalului din Admin îl afișează în cadrul Admin, cu shell, breadcrumb, permisiuni și întoarcere de Admin. Nu se navighează la ruta Gospodarului pentru reutilizarea unei componente.
- **NAV-03 [CONFIRMAT]** „Înapoi” întoarce la contextul precedent din același spațiu: gospodărie, tab, filtre, căutare, pagină, scroll și selecție, când acestea sunt disponibile. Nu se înlocuiește cu un link fix spre dashboard.
- **NAV-04 [CONFIRMAT]** „Panou Admin” are semnificație separată de „Înapoi”: merge la rădăcina spațiului Admin sau la ultima stare Admin salvată, după o regulă unică și consecventă. **Propunere:** eticheta „Panou Admin” merge la `/admin`; acțiunea „Înapoi la Gospodăria X” păstrează contextul. Dacă se dorește „Reia Admin”, acesta este control separat.
- **NAV-05 [CONFIRMAT]** Nicio navigare internă nu produce logout, pierderea rolului sau schimbarea identității. Expirarea reală a sesiunii este tratată explicit cu reautentificare și `returnTo` sigur.
- **NAV-06 [PROPUS]** Schimbarea spațiului Admin ↔ Gospodar necesită acțiune explicită „Schimbă spațiul”; afișează rolul și gospodăria curentă; se verifică autorizarea server-side. Un Admin care inspectează o gospodărie nu se autentifică implicit drept gospodar.
- **NAV-07 [PROPUS]** Istoricul de navigare este separat pe spațiu, cu fallback determinist la pagina părinte când URL-ul de proveniență lipsește, a expirat sau nu mai este permis.
- **NAV-08 [PROPUS]** Navigarea trebuie să funcționeze și la refresh, link direct, browser Back/Forward, tab nou și pe mobil. Nu depinde exclusiv de `window.history.back()`.
- **NAV-09 [PROPUS]** Parametrii de returnare nu acceptă open redirects: doar rute relative interne, cu prefixul spațiului și verificare de autorizare. Niciodată URL extern, `//host`, `javascript:`, path traversal sau cross-space.
- **NAV-10 [PROPUS]** Componenta Jurnal este reutilizabilă la nivel de prezentare și servicii, dar ruta și autorizarea sunt specifice spațiului.

## 3. Model de rute propus (adaptare la rutele reale, fără breaking links)

```text
/admin
/admin/households
/admin/households/[householdId]?q=&page=&status=
/admin/households/[householdId]/journal?tab=&page=&filter=
/admin/households/[householdId]/lots/[lotId]
/household
/household/journal
/household/lots/[lotId]
```

Dacă proiectul folosește alte rute existente, păstrăm compatibilitatea prin redirect **în interiorul aceluiași spațiu**, nu spre alt rol. Un Admin poate vedea jurnalul aceleiași gospodării fără a fi redirecționat la `/household/journal`.

## 4. Arhitectura propusă

**Workspace shell per spațiu:** `AdminLayout`, `HouseholdLayout`, `PublicLayout`, etc. Fiecare oferă navigare laterală, breadcrumb, acțiuni de întoarcere, identitatea spațiului, sesiunea activă. Layout-ul Admin rămâne montat pentru toate rutele descendente Admin.

**Context de proveniență:** păstrează `workspace`, `originRoute`, `originQuery`, `entityId`, `tab`, `scrollKey` în URL sau într-un state manager per spațiu. Preferă URL-ul pentru filtre/paginare/tab și state pentru scroll, cu fallback la ruta părinte. Nu stoca tokenuri sau date sensibile în URL.

**Contract `navigateWithinWorkspace(target, origin)`:** validează target și origin ca rute interne autorizate din același spațiu, apoi navighează; dacă origin invalid, folosește părintele. Nu prelua automat `returnTo` din input nevalidat.

**Autorizare:** protecție server-side pe fiecare rută și pe fiecare serviciu; `workspace` este context UI, nu sursă de drepturi. Admin are `admin:household:journal:read` sau echivalent; gospodar are `household:journal:read` pe propria gospodărie. Nu schimba identitatea pentru a reutiliza un endpoint.

**Sesiune:** dacă expiră în timpul lucrului, păstrează doar un `returnTo` relativ, verificat după login, către aceeași rută dacă rolul este încă permis. Nu confunda 401 cu o navigare la homepage.

## 5. Exemple de flux corect

1. Admin → Gospodării (filtru județ, pagina 3) → Gospodăria X → Jurnal → Înregistrare. „Înapoi” revine la Jurnal, apoi la Gospodăria X, apoi la lista filtrată pe pagina 3.
2. Admin deschide direct `/admin/households/X/journal` într-un tab nou. „Înapoi la Gospodăria X” merge la pagina părinte; nu intră în `/household`.
3. Gospodarul intră în `/household/journal`; vede doar datele propriei gospodării. Nu apare shell-ul Admin.
4. Admin apasă „Schimbă spațiul” și alege o interfață permisă; acțiunea este explicită și verificată. Când revine în Admin, contextul anterior poate fi reluat.
5. Admin refresh pe jurnal: rămâne în Admin, cu același obiect și filtre. Nu ajunge în pagina publică.

## 6. Teste obligatorii (Playwright + unit)

| ID | Test | Acceptare |
|---|---|---|
| NAV-T01 | Admin → Gospodărie → Jurnal | URL începe cu `/admin`, shell Admin vizibil |
| NAV-T02 | Admin Jurnal → Back | revine la gospodăria și tabul de origine |
| NAV-T03 | Admin Jurnal → Back → Back | lista își păstrează filtrele și pagina |
| NAV-T04 | Admin Jurnal → „Panou Admin” | rămâne în `/admin`, niciodată public/household |
| NAV-T05 | Refresh în Jurnal | rămâne în Admin și pe același obiect |
| NAV-T06 | Browser Back/Forward | succesiune coerentă, fără schimbare de rol |
| NAV-T07 | Direct link / tab nou | fallback sigur la părintele Admin |
| NAV-T08 | Gospodar → Jurnal | rămâne în shell Gospodar, datele proprii |
| NAV-T09 | Admin fără permisiune pe jurnal | 403/redirect sigur, nu impersonare |
| NAV-T10 | `returnTo=https://evil.example` și `//evil.example` | refuzat, fără open redirect |
| NAV-T11 | Sesiune expirată | login explicit, return sigur după reautorizare |
| NAV-T12 | Două taburi Admin/Gospodar | context vizual independent, fără logout accidental |
| NAV-T13 | Mobil, breadcrumb și Back | controale accesibile și vizibile |
| NAV-T14 | Căutare/filtre/paginare/scroll | păstrate după navigarea la detalii și înapoi |

## 7. Instrucțiuni tehnice pentru Claude (PR separat de IBAN și #60)

1. Identifică rutele reale, layout-urile, butoanele „Panou Admin”, linkurile spre jurnal și codul care schimbă workspace/rol. Publică **traseul exact al defectului** cu fișiere și linii.
2. Repară **fluxul raportat** întâi: Admin → Gospodărie → Jurnal → Înapoi, fără să rescrii întregul router.
3. Refolosește componenta de Jurnal, nu ruta altui rol. Creează wrapper Admin pentru jurnal și păstrează verificarea de acces server-side.
4. Normalizează semantica Back vs Dashboard; păstrează query, tab, filtre și contextul. Nu folosi `history.back()` ca singură cale.
5. Adaugă testele NAV-T01…NAV-T14, inclusiv refresh, direct link, 401, IDOR și open redirect.
6. Rulează lint, typecheck, unit, Playwright și build. Raportează rezultatele reale și eventualele teste SKIP.
7. Creează PR dedicat, cu capturi before/after, rute afectate, riscuri, rollback. Nu modifica fișierele `CHATGPT-*` și nu face merge automat.

## 8. Decizii deschise care nu blochează corectarea

- „Panou Admin” revine la `/admin` sau la ultima pagină Admin? **Propunere:** `/admin`, iar „Înapoi” restaurează contextul.
- Păstrarea scrollului în sessionStorage vs history state; soluție tehnică în funcție de router.
- Denumirile și prefixele exacte ale spațiilor în aplicația curentă.

**Definition of Done:** niciun traseu de jurnal nu schimbă involuntar workspace-ul, „Înapoi” este predictibil, refresh și deep link funcționează, autorizarea este verificată server-side, iar testele E2E trec.
