# Instrucțiuni pentru Claude – proiectul Puii mei

- Comunicarea cu utilizatorul se face în **română**; tot textul din site e în română.
- Codul site-ului e în `puii-mei/` (vezi și `puii-mei/AGENTS.md` pentru regulile Next.js).
- La începutul unei conversații noi citește `puii-mei/docs/istoric-conversatie.md` (ce s-a construit, decizii,
  setări), `puii-mei/docs/plan-platforma.md` și `puii-mei/docs/sugestii.md`.

## Sugestii uitate

- Lista se află în `puii-mei/docs/sugestii.md`.
- **Orice sugestie sau propunere la care utilizatorul nu răspunde** (schimbă subiectul, o ignoră sau nu o aprobă
  explicit) se adaugă automat în listă, la secțiunea potrivită, cu data. Lista se actualizează în același commit cu
  lucrul curent.
- Ce se rezolvă se bifează (`[x]`) sau se scoate din listă.
- La expresia **„sugestii uitate”**: citește lista și spune-i utilizatorului ce a rămas deschis, grupat, pe scurt.

## Coordonarea cu ChatGPT

- Utilizatorul a cerut (23 nov. 2026): **ChatGPT se ține mereu la curent cu progresul**, fără să mai fie cerut.
  După fiecare PR deschis / unit sau pas important, Claude scrie pe GitHub un comentariu de stadiu (în PR-ul curent):
  ce s-a făcut, teste, ce e deschis, următorul pas. Regulile de lucru: `puii-mei/docs/TEAM-WORKFLOW.md`.
