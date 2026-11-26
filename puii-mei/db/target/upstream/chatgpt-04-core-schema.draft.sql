-- CHATGPT-04 · PostgreSQL 16 · design DRAFT, NOT production migration
-- Run only in disposable database. Never apply to production.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS household;
CREATE SCHEMA IF NOT EXISTS programs;
CREATE SCHEMA IF NOT EXISTS production;
CREATE SCHEMA IF NOT EXISTS commerce;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS compliance;
CREATE SCHEMA IF NOT EXISTS logistics;
CREATE SCHEMA IF NOT EXISTS traceability;
CREATE SCHEMA IF NOT EXISTS platform;
CREATE TABLE identity.users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE, phone_e164 text UNIQUE,
 display_name text NOT NULL, status text NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','active','suspended','closed')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(email IS NOT NULL OR phone_e164 IS NOT NULL)
);
CREATE TABLE household.households (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE,
 legal_name text NOT NULL, county text, locality text, status text NOT NULL DEFAULT 'onboarding'
 CHECK(status IN ('onboarding','review','active','suspended','closed')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE identity.memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES identity.users(id),
 household_id uuid REFERENCES household.households(id), role text NOT NULL,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked','suspended')),
 granted_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
 UNIQUE(user_id,household_id,role), CHECK((status='revoked')=(revoked_at IS NOT NULL))
);
CREATE UNIQUE INDEX memberships_global_unique ON identity.memberships(user_id,role) WHERE household_id IS NULL;
CREATE INDEX memberships_tenant ON identity.memberships(household_id,user_id) WHERE status='active';
CREATE TABLE household.mandates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL REFERENCES household.households(id),
 version integer NOT NULL CHECK(version>0), status text NOT NULL CHECK(status IN ('draft','signed','active','revoked','expired')),
 valid_from timestamptz, valid_until timestamptz, signed_at timestamptz, revoked_at timestamptz,
 document_id uuid, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(household_id,version),
 CHECK(valid_until IS NULL OR valid_from IS NULL OR valid_until>valid_from)
);
CREATE UNIQUE INDEX mandates_one_active ON household.mandates(household_id) WHERE status='active';
CREATE TABLE platform.documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid REFERENCES household.households(id),
 storage_key text NOT NULL UNIQUE, sha256 char(64) NOT NULL, mime_type text NOT NULL,
 size_bytes bigint NOT NULL CHECK(size_bytes>=0), classification text NOT NULL DEFAULT 'private'
 CHECK(classification IN ('private','restricted','public-approved')),
 created_by uuid REFERENCES identity.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 retention_until timestamptz, deleted_at timestamptz
);
ALTER TABLE household.mandates ADD CONSTRAINT mandates_document_fk FOREIGN KEY(document_id) REFERENCES platform.documents(id);
CREATE TABLE compliance.requirements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, title text NOT NULL,
 scope text NOT NULL CHECK(scope IN ('household','program','lot','processing','transport')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), active boolean NOT NULL DEFAULT true
);
CREATE TABLE compliance.assessments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL REFERENCES household.households(id),
 requirement_id uuid NOT NULL REFERENCES compliance.requirements(id), program_cycle_id uuid,
 status text NOT NULL CHECK(status IN ('pending','approved','rejected','expired')),
 reviewed_by uuid REFERENCES identity.users(id), reviewed_at timestamptz, expires_at timestamptz,
 evidence_document_id uuid REFERENCES platform.documents(id),
 CHECK(status <> 'approved' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX assessments_household_status ON compliance.assessments(household_id,status,expires_at);
CREATE TABLE compliance.holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL REFERENCES household.households(id),
 cause text NOT NULL, severity text NOT NULL CHECK(severity IN ('advisory','restricted','stop')),
 affected_actions text[] NOT NULL CHECK(cardinality(affected_actions)>0),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','released')),
 opened_by uuid NOT NULL REFERENCES identity.users(id), opened_at timestamptz NOT NULL DEFAULT now(),
 reassess_at timestamptz, released_by uuid REFERENCES identity.users(id), released_at timestamptz,
 release_evidence_id uuid REFERENCES platform.documents(id),
 CHECK(status <> 'released' OR (released_by IS NOT NULL AND released_at IS NOT NULL AND release_evidence_id IS NOT NULL))
);
CREATE INDEX holds_active_tenant ON compliance.holds(household_id) WHERE status='active';
CREATE TABLE programs.definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL,
 category text NOT NULL, active boolean NOT NULL DEFAULT true
);
CREATE TABLE programs.versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), program_id uuid NOT NULL REFERENCES programs.definitions(id),
 version integer NOT NULL CHECK(version>0), rules jsonb NOT NULL CHECK(jsonb_typeof(rules)='object'),
 status text NOT NULL CHECK(status IN ('draft','approved','retired')),
 approved_by uuid REFERENCES identity.users(id), approved_at timestamptz,
 UNIQUE(program_id,version), CHECK(status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE TABLE programs.cycles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL REFERENCES household.households(id),
 program_version_id uuid NOT NULL REFERENCES programs.versions(id), code text NOT NULL,
 status text NOT NULL CHECK(status IN ('planned','active','paused','closed','cancelled')),
 starts_on date, ends_on date, closed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(household_id,code), UNIQUE(id,household_id), CHECK(ends_on IS NULL OR starts_on IS NULL OR ends_on>=starts_on)
);
ALTER TABLE compliance.assessments ADD CONSTRAINT assessment_cycle_fk FOREIGN KEY(program_cycle_id,household_id) REFERENCES programs.cycles(id,household_id);
CREATE TABLE production.lots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL REFERENCES household.households(id),
 cycle_id uuid NOT NULL, code text NOT NULL, status text NOT NULL
 CHECK(status IN ('planned','preorder','growing','processing','delivering','closed','cancelled')),
 capacity_units integer NOT NULL CHECK(capacity_units>=0), reserved_units integer NOT NULL DEFAULT 0
 CHECK(reserved_units>=0 AND reserved_units<=capacity_units),
 started_at timestamptz, closed_at timestamptz, version bigint NOT NULL DEFAULT 0,
 UNIQUE(household_id,code), UNIQUE(id,household_id),
 FOREIGN KEY(cycle_id,household_id) REFERENCES programs.cycles(id,household_id)
);
CREATE INDEX lots_cycle_status ON production.lots(cycle_id,status);
CREATE TABLE production.observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL, lot_id uuid NOT NULL,
 observed_on date NOT NULL, metric text NOT NULL, quantity numeric(16,4) NOT NULL CHECK(quantity>=0),
 unit text NOT NULL, note text, recorded_by uuid NOT NULL REFERENCES identity.users(id),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(lot_id,household_id) REFERENCES production.lots(id,household_id)
);
CREATE INDEX observations_lot_date ON production.observations(lot_id,observed_on DESC);
CREATE TABLE production.inputs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL, lot_id uuid NOT NULL,
 input_type text NOT NULL, source_reference text, quantity numeric(16,4) NOT NULL CHECK(quantity>0),
 unit text NOT NULL, used_at timestamptz NOT NULL, document_id uuid REFERENCES platform.documents(id),
 FOREIGN KEY(lot_id,household_id) REFERENCES production.lots(id,household_id)
);
CREATE TABLE commerce.customers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, phone_e164 text, email text,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(phone_e164 IS NOT NULL OR email IS NOT NULL)
);
CREATE TABLE commerce.products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), program_id uuid NOT NULL REFERENCES programs.definitions(id),
 sku text NOT NULL UNIQUE, name text NOT NULL, unit text NOT NULL, active boolean NOT NULL DEFAULT true
);
CREATE TABLE commerce.orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number text NOT NULL UNIQUE,
 customer_id uuid NOT NULL REFERENCES commerce.customers(id), household_id uuid NOT NULL REFERENCES household.households(id),
 status text NOT NULL CHECK(status IN ('draft','pending','confirmed','allocated','fulfilled','cancelled')),
 currency char(3) NOT NULL DEFAULT 'RON', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,household_id)
);
CREATE INDEX orders_household_status ON commerce.orders(household_id,status,created_at);
CREATE TABLE commerce.order_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES commerce.orders(id),
 product_id uuid NOT NULL REFERENCES commerce.products(id), quantity numeric(16,3) NOT NULL CHECK(quantity>0),
 unit_price numeric(16,2) NOT NULL CHECK(unit_price>=0), currency char(3) NOT NULL DEFAULT 'RON'
);
CREATE TABLE commerce.allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL, lot_id uuid NOT NULL,
 order_line_id uuid NOT NULL REFERENCES commerce.order_lines(id),
 units integer NOT NULL CHECK(units>0), status text NOT NULL CHECK(status IN ('active','released','fulfilled')),
 created_at timestamptz NOT NULL DEFAULT now(), released_at timestamptz,
 FOREIGN KEY(lot_id,household_id) REFERENCES production.lots(id,household_id),
 UNIQUE(lot_id,order_line_id)
);
CREATE INDEX allocations_active_lot ON commerce.allocations(lot_id) WHERE status='active';
CREATE TABLE finance.bank_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL REFERENCES household.households(id),
 iban_ciphertext bytea NOT NULL, iban_fingerprint char(64) NOT NULL, holder text NOT NULL,
 status text NOT NULL CHECK(status IN ('pending','verified','active','rejected','retired')),
 requested_by uuid NOT NULL REFERENCES identity.users(id), verified_by uuid REFERENCES identity.users(id),
 verified_at timestamptz, activated_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status NOT IN ('verified','active') OR (verified_by IS NOT NULL AND verified_at IS NOT NULL)),
 CHECK(verified_by IS NULL OR verified_by <> requested_by)
);
CREATE UNIQUE INDEX bank_one_active ON finance.bank_accounts(household_id) WHERE status='active';
CREATE TABLE finance.payment_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL,
 order_id uuid NOT NULL, bank_account_id uuid REFERENCES finance.bank_accounts(id),
 amount numeric(16,2) NOT NULL CHECK(amount>0), currency char(3) NOT NULL DEFAULT 'RON',
 status text NOT NULL CHECK(status IN ('declared','under_review','verified','rejected','refunded')),
 verified_by uuid REFERENCES identity.users(id), verified_at timestamptz,
 external_reference text, evidence_document_id uuid REFERENCES platform.documents(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(order_id,household_id) REFERENCES commerce.orders(id,household_id),
 CHECK(status <> 'verified' OR (verified_by IS NOT NULL AND verified_at IS NOT NULL))
);
CREATE INDEX payment_household_status ON finance.payment_evidence(household_id,status);
CREATE TABLE finance.cost_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL,
 cycle_id uuid NOT NULL, category text NOT NULL, amount numeric(16,2) NOT NULL CHECK(amount>=0),
 currency char(3) NOT NULL DEFAULT 'RON', document_id uuid REFERENCES platform.documents(id),
 status text NOT NULL CHECK(status IN ('draft','documented','approved','reversed')),
 occurred_on date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(cycle_id,household_id) REFERENCES programs.cycles(id,household_id)
);
CREATE TABLE finance.cycle_settlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL, cycle_id uuid NOT NULL,
 status text NOT NULL CHECK(status IN ('draft','review','approved','invoiced','void')),
 revenue_amount numeric(16,2), expense_amount numeric(16,2), fee_amount numeric(16,2),
 rule_version text, approved_by uuid REFERENCES identity.users(id), approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(cycle_id,household_id) REFERENCES programs.cycles(id,household_id),
 UNIQUE(cycle_id),
 CHECK(fee_amount IS NULL OR fee_amount>=0),
 CHECK(status NOT IN ('approved','invoiced') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE TABLE logistics.shipments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL, order_id uuid NOT NULL,
 status text NOT NULL CHECK(status IN ('planned','ready','in_transit','delivered','failed','cancelled')),
 scheduled_at timestamptz, delivered_at timestamptz, tracking_reference text,
 FOREIGN KEY(order_id,household_id) REFERENCES commerce.orders(id,household_id)
);
CREATE TABLE traceability.events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL, lot_id uuid NOT NULL,
 event_type text NOT NULL, occurred_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 actor_id uuid REFERENCES identity.users(id), evidence_document_id uuid REFERENCES platform.documents(id),
 payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(payload)='object'),
 FOREIGN KEY(lot_id,household_id) REFERENCES production.lots(id,household_id)
);
CREATE INDEX trace_events_lot_time ON traceability.events(lot_id,occurred_at,id);
CREATE TABLE platform.audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), occurred_at timestamptz NOT NULL DEFAULT now(),
 actor_id uuid REFERENCES identity.users(id), household_id uuid REFERENCES household.households(id),
 action text NOT NULL, resource_type text NOT NULL, resource_id uuid,
 request_id text NOT NULL, before_hash char(64), after_hash char(64),
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(metadata)='object')
);
CREATE INDEX audit_tenant_time ON platform.audit_events(household_id,occurred_at DESC);
CREATE TABLE platform.outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), aggregate_type text NOT NULL, aggregate_id uuid NOT NULL,
 event_type text NOT NULL, event_version integer NOT NULL CHECK(event_version>0),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 created_at timestamptz NOT NULL DEFAULT now(), available_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz, attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 idempotency_key text NOT NULL UNIQUE
);
CREATE INDEX outbox_pending ON platform.outbox(available_at,id) WHERE processed_at IS NULL;
CREATE TABLE platform.idempotency_keys (
 scope text NOT NULL, key text NOT NULL, request_hash char(64) NOT NULL,
 response jsonb, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 PRIMARY KEY(scope,key)
);
-- RLS proof-of-design for direct tenant tables. NOT complete: indirect tables need policy design.
ALTER TABLE household.mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE production.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.payment_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY mandates_tenant ON household.mandates USING (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid) WITH CHECK (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid);
CREATE POLICY cycles_tenant ON programs.cycles USING (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid) WITH CHECK (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid);
CREATE POLICY lots_tenant ON production.lots USING (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid) WITH CHECK (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid);
CREATE POLICY orders_tenant ON commerce.orders USING (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid) WITH CHECK (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid);
CREATE POLICY costs_tenant ON finance.cost_entries USING (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid) WITH CHECK (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid);
CREATE POLICY payments_tenant ON finance.payment_evidence USING (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid) WITH CHECK (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid);
CREATE POLICY bank_tenant ON finance.bank_accounts USING (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid) WITH CHECK (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid);
CREATE POLICY shipments_tenant ON logistics.shipments USING (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid) WITH CHECK (household_id = NULLIF(current_setting('app.household_id',true),'')::uuid);
COMMIT;
