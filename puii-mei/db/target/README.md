# Schema-țintă (relațională): draft + patch-uri + harness de validare

**Nu e migrare.** Aici se validează, pe un PostgreSQL 16 de **test**, schema relațională propusă pentru etapa E1. Aplicația
folosește în continuare `documents` (JSONB) din `src/server/db`. Nimic de aici nu rulează pe producție.

| Director | Conținut |
|---|---|
| `upstream/` | Copii **nemodificate** ale SQL-ului ChatGPT din PR #60, branch `docs/chatgpt-database-architecture-v1`, commit `8801df201b4271978e7bb3ca3038fa9bc5d533be`. Se actualizează doar prin recopiere |
| `patches/` | Remedierile propuse de Claude, aplicate peste upstream în ordinea numelui: `01-r01-r07-hardening.sql` (R01–R07, review #75), `02-pr82-invariante.sql` (F1, F3, G1, S1, Q1, review #82) |
| `harness/run.mjs` | Creează baze noi `puii_target_*`, aplică „upstream” și „upstream + patch-uri”, încarcă date de test și rulează testele cu **rolul runtime real** (non-owner, `NOBYPASSRLS`). Bazele se șterg la final |

```bash
HARNESS_ADMIN_URL=postgresql://postgres@localhost:5433/postgres npm run test:sql-target
```

Ieșire: un tabel cu fiecare test pe cele două variante. Codul de ieșire e 1 dacă varianta cu patch are vreun defect.
CI rulează harness-ul în jobul E2E, pe serviciul `postgres:16`.

Rezultatul de pe 26.11.2026: 17 defecte reproduse pe PR60 pentru R01–R07 (patch 01) și încă 10 pentru invariantele din review-ul 06–11 (patch 02, F1 / F3 / G1 / S1 / Q1). După patch-uri: 0. Detaliile sunt în PR-urile #84 și următorul.
