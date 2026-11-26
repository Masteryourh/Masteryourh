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
