# ADR-010 — Stocarea fișierelor (poze și documente) în afara bazei de date

**Data:** 23 noiembrie 2026 · **Statut:** ACCEPTAT de PO („începe cu fișierele”); furnizorul concret [DESCHIS].
**Închide parțial:** ADR-003 (CLAUDE-02, §14).

## Context
Pozele (livrare, jurnalul la 7 zile, confirmarea clientului) și documentele (contracte, facturi, acte) se salvau în
baza de date, ca base64 (+33%). Baza gratuită (Neon: 0,5–1 GB) s-ar umple în câteva loturi, în timp ce datele propriu-
zise (comenzi, loturi) ocupă foarte puțin.

## Decizie
- Conținutul fișierelor se salvează într-o **stocare S3 compatibilă, cu bucket privat** (Cloudflare R2, Backblaze B2,
  AWS S3 etc.), configurată prin `FILES_S3_*`. În baza de date rămân doar metadatele: nume, tip, mărime, amprenta
  SHA-256, `blobKey`.
- Fișierele **nu au adrese publice**: se servesc numai prin `/fisiere/[id]` și `/foto/[id]`, cu aceleași verificări de
  acces ca înainte.
- La citire se verifică amprenta SHA-256; un fișier modificat în stocare nu se servește (502).
- Fără configurare, totul funcționează ca înainte (în baza de date): dezvoltare locală, teste, tranziție.
- Ordinea la salvare: întâi fișierul, apoi înregistrarea (o înregistrare nu indică niciodată un fișier inexistent).
- Fișierele vechi se mută din Admin → Documente, câte 25: încărcare → recitire → comparare SHA-256 → abia apoi se
  scoate conținutul din baza de date. Idempotent.

## Furnizor [DESCHIS — decizia PO]
Recomandare: **Cloudflare R2** (spațiu gratuit generos, fără costuri de trafic la descărcare). Alternative: Backblaze
B2, AWS S3. De verificat la alegere: limita gratuită actuală, regiunea UE (GDPR), dacă cere card la înscriere.

## De făcut
- Ștergerea fișierelor la ștergerea înregistrărilor (azi: resetarea datelor demo lasă fișierele în stocare).
- Backup-ul stocării (separat de backup-ul bazei de date).
