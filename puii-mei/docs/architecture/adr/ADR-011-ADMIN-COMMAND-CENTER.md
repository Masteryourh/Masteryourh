# ADR-011 — Admin Central Command Center și spațiile de lucru

**Data:** 24 noiembrie 2026 · **Statut:** ACCEPTAT de fondator (decizie consemnată de ChatGPT în PR #62, comentariul din
24.11.2026); implementare de Claude (PR „Admin Central Command Center”, după #69 / #70).
**Modifică:** `00-SYSTEM-CONSTITUTION.md` §6A (SC-048 … SC-053), conform SC-038.

## Context
- Din Admin, mai multe linkuri duceau în alte spații: jurnalul și documentele gospodăriei (spațiul gospodarului),
  comanda din țarc (panoul clientului), etichetele (spațiul gospodarului).
- „Înapoi” pierdea contextul.
- Defectul raportat: Admin → Loturi → țarc → comanda PM2611-B83BD ieșea din Admin.

## Decizie
1. Fiecare entitate administrabilă are o pagină în Admin (SC-048). Implementat acum:

   | Entitate | Pagina în Admin |
   |---|---|
   | Comanda (client, gospodărie, lot, țarc, plăți, livrare, etichetă, contract, audit) | `/admin/comenzi/[număr]` |
   | Contractul comenzii | `/admin/comenzi/[număr]/contract` |
   | Jurnalul de creștere | `/admin/gospodarii/[slug]/jurnal` |
   | Documentele și registrul gospodăriei | `/admin/gospodarii/[slug]/documente` |
   | Etichetele coletelor | `/admin/livrari/etichete` |

2. Navigarea rămâne în spațiu. Trecerile sunt explicite (SC-049).
3. „Înapoi” la origine, validată pe server, cu fallback (SC-050): `lib/safe-return.ts`, `PanelCrumbs`. De la o comandă
   deschisă din țarc, „Înapoi” duce la `/admin/loturi?deschis=<lot>#tarc-<lot>-<n>`: lotul e deschis, iar pagina se
   oprește la țarc.
4. Fără impersonare; drepturile rămân cele aprobate (SC-051). Paginile Admin de jurnal și documente sunt doar citire
   (plus verificarea documentelor de către admin, cum era deja).
5. Fără coduri secrete ale clientului în adresele Admin (SC-052).
6. Verificare automată în CI (SC-053):
   - `src/lib/nav-policy.test.ts` scanează codul Admin;
   - `e2e/admin-command-center.spec.ts` parcurge 21 de pagini Admin și verifică toate linkurile.

## Variante respinse
- Repararea doar a linkului raportat: cerință explicită a fondatorului, „nu repara doar acest link”.
- Reutilizarea paginilor altui spațiu cu un parametru „vedere admin”: amestecă spațiile și autorizarea.

## Consecințe
- Paginile Admin noi reutilizează componentele de prezentare (`GrowthJournalView`, `LabelsView`, `ContractDocument`,
  `DocumentTable`). Rutele și autorizarea sunt separate.
- Rămân pentru pașii următori:
  - păstrarea scroll-ului la „Înapoi”;
  - investițiile și calitatea pe gospodărie, revăzute ca entități separate;
  - „Reia Admin” (ultima stare Admin salvată), dacă se dorește.
