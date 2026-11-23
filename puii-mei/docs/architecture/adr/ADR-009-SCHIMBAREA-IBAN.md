# ADR-009 — Schimbarea contului bancar (IBAN) al gospodăriei

**Data:** 23 noiembrie 2026 · **Statut:** politica ACCEPTATĂ de Product Owner (varianta b, în conversație, 23.11.2026);
etapa 1 (fără MFA) implementată în PR `claude/sec-iban-schimbare`; MFA rămâne de implementat.
**Răspunde la:** CG-03 (`CHATGPT-REVIEW-CLAUDE-PR55.md`), V-04 (`CLAUDE-VERIFICATION-V1.md`), T11 (`CLAUDE-03`).

## Context
Clienții plătesc avansul (pui de o zi + furaj) **direct în contul gospodăriei**, după IBAN-ul afișat pe pagina comenzii.
Până acum, IBAN-ul se schimba imediat din panoul gospodarului, fără verificare. O sesiune compromisă putea redirecționa
toate avansurile într-un cont străin.

## Variante
| Variantă | Ce cere | Risc rămas | Cost operațional |
|---|---|---|---|
| (a) | MFA + întârziere 24 h + notificare pe toate canalele | atacator cu telefonul / emailul titularului | mic |
| **(b)** | **(a) + confirmare telefonică de la PUII MEI la un număr cunoscut dinainte** | atacator care controlează și numărul cunoscut | un apel per schimbare |
| (c) | (b) + aprobarea unui al doilea administrator | foarte mic | doi administratori disponibili |

## Decizie [CONFIRMAT PO, 23.11.2026]
**Varianta (b).** Varianta (c) rămâne pentru când PUII MEI are mai mulți administratori.

## Implementare — etapa 1 (fără MFA, care nu există încă în aplicație)
Fail-closed: **clienții văd numai contul activ**; contul cerut nu apare nicăieri pentru plată până nu e activ.

Stări: `in-verificare → confirmat → activ`, sau `respins` / `anulat`.

1. Gospodarul (sau adminul în numele lui) salvează un cont diferit → cerere `in-verificare`. Contul activ rămâne cel vechi.
   Prețurile (furaj, pui de o zi) se schimbă imediat, fără verificare.
2. Notificare imediată: email către conturile gospodăriei, email către administratori, SMS la numerele cunoscute
   (dacă SMS e configurat). Dacă notificarea eșuează, se scrie în jurnal; cererea rămâne în verificare.
3. Operatorul PUII MEI sună **doar** la un număr din lista `knownPhones`. Lista e reținută în cerere, la momentul
   cererii, din conturile active ale gospodăriei; numerele le schimbă doar adminul. Operatorul confirmă. Confirmarea
   e refuzată dacă:
   - o face aceeași persoană care a cerut;
   - numărul nu e cunoscut;
   - cererea e veche sau înlocuită (replay);
   - cererea a fost deja tratată (dublă confirmare).
4. Contul devine activ la prima citire după confirmare **și** după 24 h de la cerere. Primul cont al unei gospodării nu
   are un cont vechi de protejat, deci nu așteaptă 24 h; confirmarea telefonică rămâne obligatorie.
5. „Nu am cerut eu” (gospodar sau admin):
   - cererea se anulează;
   - contul de gospodar care a cerut-o se dezactivează, iar sesiunile lui se închid;
   - administratorii primesc o alertă de incident.

   Un cont de administrator nu se blochează automat; se trimite doar alerta.
6. Jurnal `iban-audit`, numai cu adăugare: cerere, înlocuire, notificare, confirmare, respingere, anulare, activare,
   cont blocat. IBAN-ul apare **mascat** (`RO49 •••• 0000`).
7. IBAN validat: format RO + cifra de control (mod 97).
8. Fiecare pas e o singură tranzacție pe documentul gospodăriei (`store.transact`). Cererea identică repetată e
   idempotentă; o cerere nouă o înlocuiește pe cea în curs și reîncepe verificarea.

## De făcut (etapa 2) [DESCHIS]
- **MFA** pentru cererea de schimbare, cerut de politica (b). Etapa 1 îl înlocuiește temporar cu notificarea și apelul.
- Cererea expiră dacă titularul nu poate fi sunat în 5 zile lucrătoare [PROPUS, neimplementat].
- Sursa de adevăr bancară: verificarea că titularul contului e gospodăria (extras, confirmarea băncii) [DESCHIS].
- Mandatul de reprezentare (`household.mandates`) nu există încă în cod. Când apare, schimbarea IBAN-ului cu mandat
  revocat trebuie refuzată.
- Schimbarea numărului de telefon al gospodarului (azi doar de admin) ar trebui să aibă aceeași protecție, altfel
  devine calea de atac pentru (b).

## Blocaj de lansare
Lansarea cu plăți reale cere cel puțin etapa 1 (acest PR). MFA e recomandat înainte de lansare, dar nu blochează dacă
procedura de apel e respectată.
