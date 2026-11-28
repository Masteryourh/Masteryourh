-- =====================================================================================================================
-- PATCH PROPUS (DRAFT) — remedierea constatărilor P0 R01–R07 din review-ul #75 asupra schemei candidate PR60.
-- Se aplică DUPĂ upstream/chatgpt-04-{core-schema,extensions,tenant-hardening}.draft.sql, pe o bază de TEST goală.
-- NU este migrare de producție. Validat de harness/run.mjs (PostgreSQL 16, rol runtime non-owner NOBYPASSRLS).
--
--  R01  FORCE ROW LEVEL SECURITY pe toate tabelele cu politici (owner-ul nu mai ocolește RLS).
--  R02  contextul de acces se setează DOAR local tranzacției, prin app.set_scope(...) (set_config(..., true)).
--  R03  politici pentru toate tabelele cu date de tenant / personale; cataloagele globale: doar citire pentru runtime;
--       auditul / outbox: runtime poate doar adăuga.
--  R04  chei străine compuse (id, household_id) spre documente și conturi bancare (fără referințe între gospodării,
--       fără oracol de existență prin eroarea FK).
--  R05  propunerile AI: gospodăria propunerii = gospodăria rulării (inclusiv NULL), verificat la scriere.
--  R06  capacitatea lotului: reserved_units ținut în aceeași tranzacție cu alocarea; CHECK-ul existent refuză depășirea.
--  R07  scope pe mai multe gospodării (manager local / zonal) pentru CITIRE; scrierea rămâne pe o singură gospodărie;
--       vedere națională (admin) doar citire, fără BYPASSRLS.
-- =====================================================================================================================

-- ---------------------------------------------------------------------------------------------------- roluri și context
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'puii_runtime') THEN CREATE ROLE puii_runtime NOLOGIN NOBYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'puii_worker') THEN CREATE ROLE puii_worker NOLOGIN NOBYPASSRLS; END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS app;

-- R02: singura cale de a seta contextul; is_local = true ⇒ dispare la COMMIT / ROLLBACK (fără scurgere în pool).
CREATE OR REPLACE FUNCTION app.set_scope(principal uuid, write_household uuid, read_households uuid[], kind text DEFAULT 'tenant')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF kind NOT IN ('tenant', 'national', 'system') THEN RAISE EXCEPTION 'scope invalid: %', kind; END IF;
  PERFORM set_config('app.principal_id', coalesce(principal::text, ''), true);
  PERFORM set_config('app.household_id', coalesce(write_household::text, ''), true);
  PERFORM set_config('app.household_ids', coalesce(array_to_string(read_households, ','), ''), true);
  PERFORM set_config('app.scope_kind', kind, true);
END $$;

CREATE OR REPLACE FUNCTION app.principal() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT NULLIF(current_setting('app.principal_id', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION app.write_household() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT NULLIF(current_setting('app.household_id', true), '')::uuid $$;
-- Citire: gospodăria de scriere + lista din scope (R07). Fără context ⇒ listă goală ⇒ nimic vizibil (fail closed).
CREATE OR REPLACE FUNCTION app.read_households() RETURNS uuid[] LANGUAGE sql STABLE AS $$
  SELECT array_remove(
    string_to_array(NULLIF(current_setting('app.household_ids', true), ''), ',')::uuid[]
      || NULLIF(current_setting('app.household_id', true), '')::uuid,
    NULL)
$$;
CREATE OR REPLACE FUNCTION app.is_national() RETURNS boolean LANGUAGE sql STABLE AS
  $$ SELECT coalesce(current_setting('app.scope_kind', true), '') = 'national' $$;
CREATE OR REPLACE FUNCTION app.can_read(h uuid) RETURNS boolean LANGUAGE sql STABLE AS
  $$ SELECT h IS NOT NULL AND (h = ANY (app.read_households()) OR app.is_national()) $$;

GRANT USAGE ON SCHEMA app TO puii_runtime, puii_worker;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO puii_runtime, puii_worker;

-- ------------------------------------------------------------------------------------------------- R04: FK compuse
ALTER TABLE platform.documents ADD CONSTRAINT documents_id_household_unique UNIQUE (id, household_id);
ALTER TABLE finance.bank_accounts ADD CONSTRAINT bank_accounts_id_household_unique UNIQUE (id, household_id);

DO $$
DECLARE r record; cols text; tgt text;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, c.conname, a.attname AS col, c.confrelid::regclass AS ref
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND array_length(c.conkey, 1) = 1
      AND c.confrelid IN ('platform.documents'::regclass, 'finance.bank_accounts'::regclass)
  LOOP
    -- Doar tabelele cu household_id obligatoriu primesc FK compus (documentul / contul trebuie să fie al aceleiași gospodării).
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema || '.' || table_name = r.tbl::text AND column_name = 'household_id' AND is_nullable = 'NO') THEN
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
      EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I, household_id) REFERENCES %s (id, household_id)',
                     r.tbl, r.conname || '_tenant', r.col, r.ref);
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------------------------- R05: AI fără bypass
CREATE OR REPLACE FUNCTION app.ai_proposal_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run_household uuid; found_run boolean;
BEGIN
  -- Citirea rulării respectă RLS: o rulare a altei gospodării e invizibilă ⇒ refuz.
  SELECT true, household_id INTO found_run, run_household FROM ai.runs WHERE id = NEW.run_id;
  IF found_run IS NULL THEN RAISE EXCEPTION 'rulare AI inaccesibilă' USING ERRCODE = '42501'; END IF;
  IF NEW.household_id IS DISTINCT FROM run_household THEN
    RAISE EXCEPTION 'propunerea AI trebuie să aibă aceeași gospodărie ca rularea' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ai_proposals_scope BEFORE INSERT OR UPDATE ON ai.proposals FOR EACH ROW EXECUTE FUNCTION app.ai_proposal_scope();

-- ------------------------------------------------------------------------------------------- R06: capacitatea lotului
-- Alocarea activă ocupă locuri; eliberarea le dă înapoi. UPDATE pe lot = lock pe rând ⇒ cererile simultane se
-- serializează, iar CHECK (reserved_units <= capacity_units) refuză depășirea (tranzacția alocării se anulează).
CREATE OR REPLACE FUNCTION app.allocation_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE delta integer := 0;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.status = 'active' THEN delta := delta - OLD.units; END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.status = 'active' THEN delta := delta + NEW.units; END IF;
  IF TG_OP = 'UPDATE' AND OLD.lot_id <> NEW.lot_id THEN
    RAISE EXCEPTION 'mutarea pe alt lot se face prin eliberare + alocare nouă' USING ERRCODE = '23514';
  END IF;
  IF delta <> 0 THEN
    UPDATE production.lots SET reserved_units = reserved_units + delta, version = version + 1
    WHERE id = coalesce(NEW.lot_id, OLD.lot_id);
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
CREATE TRIGGER allocations_capacity AFTER INSERT OR UPDATE OR DELETE ON commerce.allocations
  FOR EACH ROW EXECUTE FUNCTION app.allocation_capacity();

-- --------------------------------------------------------------------------------------- R01 + R03 + R07: politici
DO $$
DECLARE t text; p record; nn boolean;
BEGIN
  FOR t, nn IN
    SELECT table_schema || '.' || table_name, bool_or(is_nullable = 'NO')
    FROM information_schema.columns
    WHERE column_name = 'household_id' AND table_schema NOT IN ('pg_catalog', 'information_schema', 'app')
      AND table_name NOT IN ('audit_events')
    GROUP BY table_schema, table_name
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname || '.' || tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON %s', p.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);                                       -- R01
    EXECUTE format('CREATE POLICY tenant_read ON %s FOR SELECT USING (app.can_read(household_id))', t); -- R07
    EXECUTE format('CREATE POLICY tenant_insert ON %s FOR INSERT WITH CHECK (household_id = app.write_household())', t);
    EXECUTE format('CREATE POLICY tenant_update ON %s FOR UPDATE USING (household_id = app.write_household()) WITH CHECK (household_id = app.write_household())', t);
    EXECUTE format('CREATE POLICY tenant_delete ON %s FOR DELETE USING (household_id = app.write_household())', t);
  END LOOP;
END $$;

-- Documentele globale (fără gospodărie) sunt vizibile doar dacă sunt aprobate public (R03).
CREATE POLICY documents_public_read ON platform.documents FOR SELECT
  USING (household_id IS NULL AND classification = 'public-approved');

-- Gospodăriile: doar cele din scope (R03).
ALTER TABLE household.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household.households FORCE ROW LEVEL SECURITY;
CREATE POLICY households_read ON household.households FOR SELECT USING (app.can_read(id));

-- Clienții (date personale): vizibili doar prin comenzile din scope; crearea e permisă (precomandă) (R03).
ALTER TABLE commerce.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.customers FORCE ROW LEVEL SECURITY;
CREATE POLICY customers_read ON commerce.customers FOR SELECT
  USING (EXISTS (SELECT 1 FROM commerce.orders o WHERE o.customer_id = customers.id));  -- orders e deja filtrat de RLS
CREATE POLICY customers_insert ON commerce.customers FOR INSERT WITH CHECK (true);

-- Utilizatorii: propriul cont sau membrii gospodăriilor din scope (R03).
ALTER TABLE identity.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.users FORCE ROW LEVEL SECURITY;
CREATE POLICY users_read ON identity.users FOR SELECT
  USING (id = app.principal() OR EXISTS (SELECT 1 FROM identity.memberships m WHERE m.user_id = users.id));

-- Aprobările AI și părțile contractelor: prin părintele lor, deja filtrat de RLS (R03).
ALTER TABLE ai.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.approvals FORCE ROW LEVEL SECURITY;
CREATE POLICY approvals_read ON ai.approvals FOR SELECT USING (EXISTS (SELECT 1 FROM ai.proposals p WHERE p.id = approvals.proposal_id));
CREATE POLICY approvals_insert ON ai.approvals FOR INSERT
  WITH CHECK (reviewer_id = app.principal() AND EXISTS (SELECT 1 FROM ai.proposals p WHERE p.id = approvals.proposal_id));
ALTER TABLE contracts.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts.parties FORCE ROW LEVEL SECURITY;
CREATE POLICY parties_read ON contracts.parties FOR SELECT USING (EXISTS (SELECT 1 FROM contracts.agreements a WHERE a.id = parties.agreement_id));
CREATE POLICY parties_write ON contracts.parties FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM contracts.agreements a WHERE a.id = parties.agreement_id AND a.household_id = app.write_household()));

-- Cheile de idempotență: pe actor (scope = principalul curent).
ALTER TABLE platform.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.idempotency_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY idempotency_own ON platform.idempotency_keys USING (scope = app.principal()::text) WITH CHECK (scope = app.principal()::text);

-- --------------------------------------------------------------------------------------------------------- drepturi
-- Runtime: DML pe tabelele cu politici; cataloagele globale doar citire; audit / outbox doar adăugare.
DO $$
DECLARE s text;
BEGIN
  FOR s IN SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname NOT IN ('information_schema', 'public', 'app') LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO puii_runtime, puii_worker', s);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO puii_runtime', s);
  END LOOP;
END $$;
REVOKE INSERT, UPDATE, DELETE ON ai.agents, commerce.products, compliance.requirements, inventory.items, inventory.suppliers,
  logistics.processors, notifications.templates, programs.definitions, programs.versions FROM puii_runtime;
REVOKE SELECT, UPDATE, DELETE ON platform.audit_events, platform.outbox FROM puii_runtime;
GRANT SELECT, UPDATE ON platform.outbox TO puii_worker;
GRANT SELECT ON platform.audit_events TO puii_worker;
REVOKE UPDATE, DELETE ON ai.approvals, contracts.parties FROM puii_runtime;
