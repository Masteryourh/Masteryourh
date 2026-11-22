# ADR-001 — Onorariul PUII MEI

**Data:** 23 noiembrie 2026 · **Statut:** ACCEPTAT de Product Owner (decizia de business); formula detaliată și
tratamentul fiscal: [VALIDARE] contabil + jurist.
**Înlocuiește:** `01-BUSINESS-ARCHITECTURE.md` §14 („20% din profitul operațional eligibil”).

## Context
`01-BUSINESS-ARCHITECTURE.md` §14 marca [DECIS] un onorariu de 20% din profitul operațional eligibil (POE).
Varianta ChatGPT (PR #50, AUD-011) a semnalat o mențiune ulterioară a fondatorului: 10% din venit minus cheltuieli.
Auditul Claude (CLAUDE-TECHNICAL-ARCHITECTURE-V1, §12) a marcat subiectul [DESCHIS] până la confirmare.

## Decizie [CONFIRMAT de Product Owner, în conversație, 23 nov. 2026]
**Onorariul PUII MEI = 10% din (venituri − cheltuieli)**, calculat pe gospodărie, pentru fiecare lot / ciclu închis.
Rămân valabile din BA: onorariu de servicii facturat gospodăriei (SC-041); fără abonament; dacă diferența e ≤ 0,
onorariul e 0.

## De stabilit înainte de implementare [DESCHIS]
1. Ce intră în „venituri” (fără TVA? după reduceri, rambursări, anulări?) și momentul recunoașterii (avansul nu e venit
   realizat până la închiderea lotului — regulă preluată din BA §14, de confirmat).
2. Ce intră în „cheltuieli”: reale documentate sau „standard” (normative per pui); regula pentru abateri; amortizarea
   echipamentelor; munca gospodarului (inclusă sau nu).
3. Reportarea pierderilor între loturi.
4. Facturarea (TVA pe serviciul PUII MEI) și documentele justificative.

## Consecințe
- §14 din `01-BUSINESS-ARCHITECTURE.md` trebuie actualizat la 10% (de proprietarul documentului).
- Modulul Finance va calcula, la închiderea lotului: venituri, cheltuieli, diferență, onorariu = 10% × max(0, diferență),
  cu fiecare linie legată de document, lot și categorie (regulile de trasabilitate din BA §14 rămân valabile).
- Nu se implementează formula până la închiderea punctelor 1–4.
