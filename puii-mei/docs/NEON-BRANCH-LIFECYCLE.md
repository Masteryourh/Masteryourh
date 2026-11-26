# Neon: ciclul de viață al branch-urilor (plan Free)

**Decizia fondatorului (26.11.2026, #62):** rămânem pe Neon Free, fără upgrade plătit. Maximum 8 branch-uri simultane pe
proiect (2 rezervă din 10). Branch-urile temporare au TTL 24–72 h. Nu se șterg branch-uri necunoscute.

## Ce spune documentația oficială (citită pe 26.11.2026, neon.com/docs)
| Subiect | Fapt (cu sursa) |
|---|---|
| Branch-uri Free | „Free: 10 branches/project”; „Extra branches are not available on the Free plan” (`introduction/plans`) |
| Istoric / restaurare Free | „up to 6 hours, limited to 1 GB of change history per project” (`introduction/plans`) |
| Branch-uri protejate | „available on Neon's paid plans” ⇒ pe Free protecția o face managerul (`manage/branches`) |
| TTL nativ | `expires_at` (RFC 3339), „Maximum expiration is 30 days”, nu se poate pune pe branch-ul implicit / protejat / părinte (`guides/branch-expiration`) |
| Integrarea Vercel (Neon-managed) | un branch `preview/<git-branch>` pe deploy de preview; opțiunea „Automatically delete obsolete Neon branches”, care rulează „the next time a preview deployment is created” (`guides/neon-managed-vercel-integration`) |
| Object Storage | Free: 5 GB / proiect; regiuni `aws-us-east-2`, `aws-us-east-1`, `aws-eu-central-1`, `aws-ap-southeast-1` (skill-ul `neon-object-storage`, `introduction/plans`) |
| Chei API | personale: meniul de profil (dreapta sus) → **Settings → API keys**; de proiect (doar admin de organizație): organizația → **Settings → API keys** (`manage/api-keys`) |

## Managerul (`npm run neon:branches`)
- **Implicit dry-run:** listează proiectele și branch-urile și afișează planul. Nu modifică nimic.
- **Protejat (nu se atinge):** branch-ul implicit, cele marcate protejat, numele `main / production / prod / staging /
  development / dev`, orice branch cu branch-uri copil și **orice branch care nu are prefix temporar** (`preview/`, `tmp/`,
  `ci/`). Un branch necunoscut rămâne neatins.
- **Temporar:**
  - fără expirare ⇒ propune `expires_at` = creare + 72 h (minimum o oră de acum);
  - `preview/<git>` al cărui branch git nu mai există, cu vârstă ≥ 24 h ⇒ propune ștergerea;
  - fără lista branch-urilor git ⇒ nicio ștergere (fail-safe).
- **Limită:** avertizează dacă după plan rămân peste 8. Branch-urile protejate nu se șterg automat ca să intre în limită.
- **`--apply`:** execută doar acțiunile planificate. Înainte de fiecare, recitește branch-ul; dacă s-a schimbat sau a
  dispărut (alt rulaj, protejat între timp), îl sare.

**Inventarul real e blocat** până fondatorul creează cheia API Neon (pașii de mai sus) și o salvează în formularul securizat
al mediului.

## Inventar real (dry-run, 2026-11-26T14:54Z, doar citire)
```
DRY-RUN (nicio modificare) · 1 proiect(e) · PR-uri deschise: 17

## neon-crimson-basket (tiny-term-79368655, aws-eu-central-1, organizația „Vercel: DaRe”) — 10 branch-uri, după plan 9 (țintă 8, limită 10)
| Branch | Creat | Expiră | Tip | Acțiune | Motiv |
|---|---|---|---|---|---|
| main | 2026-11-19T07:05 | — | protejat | keep | branch-ul implicit al proiectului |
| preview/claude/puii-mei-website-cow4ch | 2026-11-19T07:44 | — | temporar | set-ttl → 2026-11-29T14:54:29Z | PR deschis: TTL 72 h de acum |
| preview/docs/chatgpt-technical-architecture-v1 | 2026-11-22T22:13 | — | temporar | set-ttl → 2026-11-29T14:54:29Z | PR deschis: TTL 72 h de acum |
| preview/docs/aud-001-forensic-audit | 2026-11-23T19:03 | — | temporar | set-ttl → 2026-11-29T14:54:29Z | PR deschis: TTL 72 h de acum |
| preview/claude/cum-functioneaza-buton | 2026-11-24T13:06 | — | temporar | delete | PR-ul pentru „claude/cum-functioneaza-buton” nu mai e deschis (unit / închis), vârstă 49 h |
| preview/docs/chatgpt-database-architecture-v1 | 2026-11-23T18:48 | — | temporar | set-ttl → 2026-11-29T14:54:29Z | PR deschis: TTL 72 h de acum |
| preview/docs/chatgpt-pr55-independent-review | 2026-11-23T18:48 | — | temporar | set-ttl → 2026-11-29T14:54:29Z | PR deschis: TTL 72 h de acum |
| preview/docs/founder-technical-requirements | 2026-11-23T18:48 | — | temporar | set-ttl → 2026-11-29T14:54:29Z | PR deschis: TTL 72 h de acum |
| preview/docs/navigation-context-contract | 2026-11-23T18:58 | — | temporar | set-ttl → 2026-11-29T14:54:29Z | PR deschis: TTL 72 h de acum |
| preview/docs/technical-spec-audit-baseline | 2026-11-22T22:09 | — | temporar | set-ttl → 2026-11-29T14:54:29Z | PR deschis: TTL 72 h de acum |
> după plan rămân 9 branch-uri, peste ținta de 8 (limita planului: 10); cele protejate / necunoscute se curăță doar manual, cu aprobare
```

**Constatări:**
1. **Proiectul e în `aws-eu-central-1` (Frankfurt)**, iar funcțiile Vercel rulează în `iad1` (SUA). Asta explică RTT-ul live
   de 93 ms (#90). Remedierea: Vercel → Settings → Functions → Function Region = **fra1**.
2. **10 / 10 branch-uri: limita Free e atinsă.** PR-urile noi nu mai pot primi branch de bază pentru preview.
   Planul propune ștergerea unui singur branch (`preview/claude/cum-functioneaza-buton`, PR #71 unit) și TTL de 72 h pe
   celelalte, toate legate de PR-uri încă deschise. Rămân 9 (peste ținta de 8) până se închid PR-urile de documentație.
3. **Object Storage e disponibil în regiune**, dar POC-ul are nevoie de un branch izolat, deci de un loc liber, deci de
   aprobarea curățeniei de mai sus.
