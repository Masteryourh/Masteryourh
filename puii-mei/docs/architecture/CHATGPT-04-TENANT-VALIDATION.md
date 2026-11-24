# CHATGPT-04 v0.3 — protocol de validare tenant și integritate

**Status:** DRAFT, fără execuție PostgreSQL. **Ordine fișiere:** core → extensions → tenant-hardening. Niciunul nu este o migrare pentru date existente.

## Modificări concrete față de v0.2

1. `commerce.order_lines.household_id` și FK compozit către `orders`; `allocations` are FK compozit către linie, închizând asocierea dintre lot și comandă prin gospodărie.
2. `shipments → parcels → temperature_readings` și `inspections → nonconformities → corrective_actions` au chei compozite de tenant.
3. `stock_movements → stock_locations` interzice folosirea locației altei gospodării. **Stocurile centrale nu sunt rezolvate**; cer un flux separat de transfer de proprietate și custody.
4. `lot_units` interzice suprapunerea intervalelor pentru aceeași unitate fizică.
5. RLS suplimentar pe 21 tabele operaționale (numărare manuală; verificare în `pg_policies` obligatorie).

## Teste de acceptare ce trebuie rulate, nu doar descrise

| ID | Pregătire | Operație | Așteptare |
|---|---|---|---|
| TEN-01 | Două gospodării A/B, o comandă A, o linie A, lot B | `INSERT allocations(household_id=B,lot_id=B,order_line_id=A)` | `23503 foreign_key_violation` |
| TEN-02 | Comandă A | `INSERT order_lines(order_id=A,household_id=B)` | `23503` |
| TEN-03 | Shipment A | `INSERT parcels(household_id=B,shipment_id=A)` | `23503` |
| TEN-04 | Parcel A | `INSERT temperature_readings(household_id=B,parcel_id=A,...)` | `23503` |
| TEN-05 | Inspection A | `INSERT nonconformities(household_id=B,inspection_id=A)` | `23503` |
| TEN-06 | Stock location A | `INSERT stock_movements(household_id=B,location_id=A,...)` | `23503` |
| TEN-07 | Unit X atribuită lotului A între 1–10 | Atribuie X lotului B între 5–15 | `23P01 exclusion_violation` |
| TEN-08 | Rol DB neprivilegiat, gospodărie A | SELECT/INSERT/UPDATE/DELETE în tabelele B | 0 rânduri sau permission denied; fără modificări |
| TEN-09 | Același pool connection, tranzacții A apoi B apoi fără context | Interogări în trei tranzacții | Nu se scurg rânduri A în B sau în context gol |
| TEN-10 | Owner SQL sau rol cu BYPASSRLS | Rulează probe TEN-08 | Test **invalid**: trebuie rerulat cu rol real al aplicației |
| TEN-11 | Cont IBAN pending pentru A | SELECT din public checkout | Niciodată afișat; test E2E, nu doar SQL |
| TEN-12 | Mandat revocat / hold activ | Mutare lot, alocare, plată | Refuz server-side, audit; RLS singur nu este suficient |

## Contract de test RLS

```sql
-- Exemplu numai într-un test izolat; executat sub un rol fără BYPASSRLS.
BEGIN;
SELECT set_config('app.household_id', '00000000-0000-0000-0000-000000000001', true);
SELECT count(*) FROM production.lots; -- doar loturi A
COMMIT;

BEGIN;
SELECT current_setting('app.household_id', true); -- fără valoarea A
SELECT count(*) FROM production.lots; -- zero rânduri când lipsește contextul
COMMIT;
```

**Notă:** `SET LOCAL` trebuie aplicat în tranzacția efectivă de business; în afara tranzacției, o conexiune din pool poate fi reutilizată nesigur dacă se folosește `SET` global. Politicile RLS sunt doar o a doua linie de apărare; aplicația verifică actorul, apartenența și mandatul.

## Restanțe P0 explicite

- **RLS nu este complet:** `platform.documents`, `identity.memberships`, `contracts.parties`, `inventory.stock_locations`, `ai.runs/proposals/approvals`, `notifications.deliveries` și registrele globale cer politici separate și uneori context de platform admin. Nu expune SQL-ul în producție.
- **AI global vs tenant:** FK compozit cu `household_id NULL` nu protejează relația în cazul valorilor NULL; sunt necesare două căi distincte, cu constrângeri și permisiuni explicite.
- **Documente cross-tenant:** toate `document_id` trebuie să respecte proprietarul sau să treacă printr-un grant controlat.
- **Audit:** `platform.audit_events` necesită rol append-only, interdicție UPDATE/DELETE, retenție și export securizat.
- **Capacitate:** `reserved_units` și suma `allocations` necesită tranzacții, reconcilieri și teste de crash; CHECK singur nu dovedește invarianta.
- **Date existente:** `ADD COLUMN household_id NOT NULL` funcționează pe tabele goale, nu este o migrare sigură pentru tabele populate. Migrarea reală cere backfill și validare înainte de `SET NOT NULL`.

## Criteriul de închidere

PR-ul poate fi considerat pregătit pentru comparație cu Claude după execuția SQL pe PostgreSQL 16, testele TEN-01…TEN-12, inventarul complet al politicilor și remedierea P0. Până atunci este **design de lucru**, nu implementare.
