-- =====================================================================================================================
-- PATCH PROPUS (DRAFT) — invariantele confirmate din review-ul 06–11 (#82), pe schema-țintă PR60 + patch 01.
-- Fără reguli economice neaprobate: nicio valoare de onorariu, buffer sau prag. Doar invariante de integritate.
--
--  F1  payment_obligations are UN SINGUR scriitor (rolul de domeniu Commerce); Finance scrie doar potrivirile
--      (payment_matches); starea „plătit” e o proiecție (vedere), nu o coloană editată de două domenii.
--  F3  o cheltuială nu poate fi aprobată de cel care a creat-o (creatorul și aprobatorul vin din context, nu din input).
--  G1  genealogie: ieșirile unui nod nu pot depăși cantitatea lui (conservare), fără cicluri; lock pe nodul sursă.
--  S1  sold de stoc pe (locație, articol), ținut de un trigger la fiecare mișcare; nu poate deveni negativ; runtime
--      nu poate modifica soldul direct.
--  Q1  gate de conformitate atomic: alocarea citește starea gospodăriei cu FOR SHARE, deschiderea unui hold o
--      blochează cu FOR UPDATE ⇒ fără TOCTOU între hold și alocare.
-- Funcțiile care întrețin proiecțiile (sold, stare) sunt SECURITY DEFINER, cu search_path fix; runtime nu are drept
-- de scriere directă pe proiecții.
-- =====================================================================================================================

-- ------------------------------------------------------------------------------------------- roluri de domeniu (F1)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'puii_commerce') THEN CREATE ROLE puii_commerce NOLOGIN NOBYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'puii_finance') THEN CREATE ROLE puii_finance NOLOGIN NOBYPASSRLS; END IF;
END $$;
-- Runtime poate DEVENI rolul de domeniu (SET LOCAL ROLE în handlerul comenzii), dar NU îi moștenește drepturile.
GRANT puii_commerce TO puii_runtime WITH INHERIT FALSE, SET TRUE;
GRANT puii_finance TO puii_runtime WITH INHERIT FALSE, SET TRUE;
GRANT USAGE ON SCHEMA app, commerce, finance, platform TO puii_commerce, puii_finance;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO puii_commerce, puii_finance;

CREATE TABLE commerce.payment_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES household.households(id),
  order_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('advance', 'balance', 'refund')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, household_id),
  FOREIGN KEY (order_id, household_id) REFERENCES commerce.orders (id, household_id)
);
CREATE TABLE finance.payment_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  obligation_id uuid NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  matched_by uuid NOT NULL DEFAULT app.principal(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (obligation_id, household_id) REFERENCES commerce.payment_obligations (id, household_id)
);
-- Proiecția: cât s-a potrivit pe fiecare obligație (Finance nu scrie în tabelul Commerce).
CREATE VIEW finance.obligation_status WITH (security_invoker = true) AS
  SELECT o.id, o.household_id, o.amount_minor, coalesce(sum(m.amount_minor), 0) AS matched_minor,
         coalesce(sum(m.amount_minor), 0) >= o.amount_minor AS settled
  FROM commerce.payment_obligations o LEFT JOIN finance.payment_matches m ON m.obligation_id = o.id
  GROUP BY o.id;

REVOKE ALL ON commerce.payment_obligations, finance.payment_matches FROM puii_runtime;
GRANT SELECT ON commerce.payment_obligations, finance.payment_matches, finance.obligation_status TO puii_runtime, puii_commerce, puii_finance;
GRANT INSERT, UPDATE ON commerce.payment_obligations TO puii_commerce;   -- singurul scriitor
GRANT INSERT ON finance.payment_matches TO puii_finance;                 -- Finance: doar potriviri
GRANT SELECT ON commerce.orders, household.households TO puii_commerce, puii_finance;

-- ------------------------------------------------------------------------------- F3: creator ≠ aprobator (cheltuieli)
ALTER TABLE finance.cost_entries
  ADD COLUMN created_by uuid,
  ADD COLUMN approved_by uuid,
  ADD COLUMN approved_at timestamptz,
  ADD CONSTRAINT cost_entries_independent_approval
    CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND created_by IS NOT NULL AND approved_by <> created_by));

CREATE OR REPLACE FUNCTION app.cost_entry_actors() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := app.principal();                       -- din context, nu din input
    IF NEW.created_by IS NULL THEN RAISE EXCEPTION 'cheltuială fără autor' USING ERRCODE = '42501'; END IF;
    IF NEW.status = 'approved' THEN RAISE EXCEPTION 'o cheltuială nu se creează direct aprobată' USING ERRCODE = '23514'; END IF;
  ELSE
    NEW.created_by := OLD.created_by;                        -- autorul nu se schimbă
    IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
      NEW.approved_by := app.principal();
      NEW.approved_at := now();
    ELSIF NEW.status = 'approved' THEN
      NEW.approved_by := OLD.approved_by;
      NEW.approved_at := OLD.approved_at;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cost_entries_actors BEFORE INSERT OR UPDATE ON finance.cost_entries FOR EACH ROW EXECUTE FUNCTION app.cost_entry_actors();

-- ------------------------------------------------------------------------------------------- G1: conservare genealogie
CREATE TABLE traceability.nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES household.households(id),
  kind text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity >= 0),
  unit text NOT NULL,
  UNIQUE (id, household_id)
);
CREATE TABLE traceability.edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  from_node uuid NOT NULL,
  to_node uuid NOT NULL,
  source_quantity numeric NOT NULL CHECK (source_quantity > 0),  -- în unitatea nodului sursă
  relation_type text NOT NULL,
  CHECK (from_node <> to_node),
  FOREIGN KEY (from_node, household_id) REFERENCES traceability.nodes (id, household_id),
  FOREIGN KEY (to_node, household_id) REFERENCES traceability.nodes (id, household_id)
);
CREATE OR REPLACE FUNCTION app.trace_edge_conservation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, traceability AS $$
DECLARE available numeric; used numeric;
BEGIN
  -- Lock pe nodul sursă: muchiile simultane din același nod se serializează.
  SELECT quantity INTO available FROM traceability.nodes WHERE id = NEW.from_node FOR UPDATE;
  SELECT coalesce(sum(source_quantity), 0) INTO used FROM traceability.edges WHERE from_node = NEW.from_node;
  IF used + NEW.source_quantity > available THEN
    RAISE EXCEPTION 'conservare: ieșirile nodului (% + %) depășesc cantitatea lui (%)', used, NEW.source_quantity, available USING ERRCODE = '23514';
  END IF;
  -- Fără cicluri: destinația nu are voie să ajungă (în aval) la sursă.
  IF EXISTS (
    WITH RECURSIVE down(n) AS (SELECT NEW.to_node UNION SELECT e.to_node FROM traceability.edges e JOIN down d ON e.from_node = d.n)
    SELECT 1 FROM down WHERE n = NEW.from_node
  ) THEN
    RAISE EXCEPTION 'ciclu în genealogie' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trace_edges_conservation BEFORE INSERT ON traceability.edges FOR EACH ROW EXECUTE FUNCTION app.trace_edge_conservation();
REVOKE UPDATE, DELETE ON traceability.edges FROM puii_runtime;   -- corecții prin evenimente noi, nu editare

-- ---------------------------------------------------------------------------------------------- S1: sold de stoc
CREATE TABLE inventory.stock_balances (
  location_id uuid NOT NULL REFERENCES inventory.stock_locations(id),
  item_id uuid NOT NULL REFERENCES inventory.items(id),
  household_id uuid NOT NULL REFERENCES household.households(id),
  on_hand numeric NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  version bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (location_id, item_id)
);
CREATE OR REPLACE FUNCTION app.stock_balance_apply() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, inventory AS $$
BEGIN
  -- Întâi rândul de sold există (0), apoi UPDATE: lock pe rând ⇒ mișcările simultane pe același articol se serializează,
  -- iar CHECK (on_hand >= 0) se evaluează pe soldul nou. (Cu ON CONFLICT DO UPDATE, CHECK-ul s-ar evalua pe rândul
  -- propus, înainte de conflict.) Ieșirea fără stoc e refuzată; lipsa fizică = incident + ajustare documentată.
  INSERT INTO inventory.stock_balances (location_id, item_id, household_id) VALUES (NEW.location_id, NEW.item_id, NEW.household_id)
  ON CONFLICT (location_id, item_id) DO NOTHING;
  UPDATE inventory.stock_balances SET on_hand = on_hand + NEW.quantity_delta, version = version + 1
  WHERE location_id = NEW.location_id AND item_id = NEW.item_id;
  RETURN NEW;
END $$;
CREATE TRIGGER stock_movements_balance AFTER INSERT ON inventory.stock_movements FOR EACH ROW EXECUTE FUNCTION app.stock_balance_apply();
REVOKE UPDATE, DELETE ON inventory.stock_movements FROM puii_runtime;   -- mișcările sunt doar adăugare
GRANT SELECT ON inventory.stock_balances TO puii_runtime;              -- soldul: doar citire pentru runtime

-- ------------------------------------------------------------------------------------- Q1: gate de conformitate atomic
CREATE TABLE compliance.compliance_state (
  household_id uuid PRIMARY KEY REFERENCES household.households(id),
  blocking_allocation integer NOT NULL DEFAULT 0 CHECK (blocking_allocation >= 0),
  version bigint NOT NULL DEFAULT 0
);
-- Un hold blochează alocarea dacă e „stop” sau dacă lista lui de acțiuni conține „allocate”.
CREATE OR REPLACE FUNCTION app.hold_blocks_allocation(h compliance.holds) RETURNS boolean LANGUAGE sql IMMUTABLE AS
  $$ SELECT h.status = 'active' AND (h.severity = 'stop' OR 'allocate' = ANY (h.affected_actions)) $$;

CREATE OR REPLACE FUNCTION app.holds_state() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, compliance, app AS $$
DECLARE delta integer := 0;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND app.hold_blocks_allocation(OLD) THEN delta := delta - 1; END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND app.hold_blocks_allocation(NEW) THEN delta := delta + 1; END IF;
  -- FOR UPDATE implicit prin UPDATE: așteaptă alocările în curs (care țin FOR SHARE) ⇒ ordinea e serializată.
  INSERT INTO compliance.compliance_state (household_id) VALUES (coalesce(NEW.household_id, OLD.household_id)) ON CONFLICT DO NOTHING;
  UPDATE compliance.compliance_state SET blocking_allocation = blocking_allocation + delta, version = version + 1
  WHERE household_id = coalesce(NEW.household_id, OLD.household_id);
  RETURN coalesce(NEW, OLD);
END $$;
CREATE TRIGGER holds_state AFTER INSERT OR UPDATE OR DELETE ON compliance.holds FOR EACH ROW EXECUTE FUNCTION app.holds_state();

CREATE OR REPLACE FUNCTION app.allocation_gate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, compliance AS $$
DECLARE blocking integer;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  -- Ordinea lock-urilor (review #82 §2): compliance_state înaintea lotului (triggerul de capacitate e AFTER).
  INSERT INTO compliance.compliance_state (household_id) VALUES (NEW.household_id) ON CONFLICT DO NOTHING;
  SELECT blocking_allocation INTO blocking FROM compliance.compliance_state WHERE household_id = NEW.household_id FOR SHARE;
  IF blocking > 0 THEN RAISE EXCEPTION 'alocare blocată de un hold de conformitate activ' USING ERRCODE = '42501'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER allocations_gate BEFORE INSERT OR UPDATE ON commerce.allocations FOR EACH ROW EXECUTE FUNCTION app.allocation_gate();
GRANT SELECT ON compliance.compliance_state TO puii_runtime;

-- ------------------------------------------------------------------------------------- RLS pe tabelele noi (ca patch 01)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['commerce.payment_obligations', 'finance.payment_matches', 'traceability.nodes', 'traceability.edges',
                           'inventory.stock_balances', 'compliance.compliance_state'] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_read ON %s FOR SELECT USING (app.can_read(household_id))', t);
    EXECUTE format('CREATE POLICY tenant_insert ON %s FOR INSERT WITH CHECK (household_id = app.write_household())', t);
    EXECUTE format('CREATE POLICY tenant_update ON %s FOR UPDATE USING (household_id = app.write_household()) WITH CHECK (household_id = app.write_household())', t);
  END LOOP;
END $$;
GRANT SELECT, INSERT ON traceability.nodes, traceability.edges TO puii_runtime;
