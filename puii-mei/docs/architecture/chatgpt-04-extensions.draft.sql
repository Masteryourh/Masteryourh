-- CHATGPT-04 v0.2 EXTENSION — DESIGN DRAFT ONLY, not production migration.
-- Depends on chatgpt-04-core-schema.draft.sql. Execute only in disposable PostgreSQL 16 DB.
BEGIN;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS quality;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS contracts;
CREATE TABLE contracts.agreements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL REFERENCES household.households(id),
 agreement_type text NOT NULL, status text NOT NULL CHECK(status IN ('draft','pending','signed','expired','revoked')),
 version integer NOT NULL CHECK(version>0), document_id uuid REFERENCES platform.documents(id),
 valid_from timestamptz, valid_until timestamptz, signed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(household_id,agreement_type,version),
 CHECK(valid_until IS NULL OR valid_from IS NULL OR valid_until>valid_from)
);
CREATE TABLE contracts.parties (
 agreement_id uuid NOT NULL REFERENCES contracts.agreements(id),
 party_kind text NOT NULL CHECK(party_kind IN ('household','customer','platform','external')),
 party_reference uuid NOT NULL, role text NOT NULL, signed_at timestamptz,
 PRIMARY KEY(agreement_id,party_kind,party_reference,role)
);
CREATE TABLE production.units (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL REFERENCES household.households(id),
 code text NOT NULL, unit_type text NOT NULL, max_capacity integer NOT NULL CHECK(max_capacity>0),
 status text NOT NULL CHECK(status IN ('available','occupied','maintenance','retired')),
 UNIQUE(household_id,code), UNIQUE(id,household_id)
);
CREATE TABLE production.lot_units (
 household_id uuid NOT NULL, lot_id uuid NOT NULL, unit_id uuid NOT NULL,
 assigned_from timestamptz NOT NULL, assigned_until timestamptz,
 PRIMARY KEY(lot_id,unit_id,assigned_from),
 FOREIGN KEY(lot_id,household_id) REFERENCES production.lots(id,household_id),
 FOREIGN KEY(unit_id,household_id) REFERENCES production.units(id,household_id),
 CHECK(assigned_until IS NULL OR assigned_until>assigned_from)
);
CREATE INDEX lot_units_active ON production.lot_units(unit_id) WHERE assigned_until IS NULL;
CREATE TABLE production.mortality (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL, lot_id uuid NOT NULL,
 occurred_on date NOT NULL, count_units integer NOT NULL CHECK(count_units>0), reason text,
 recorded_by uuid NOT NULL REFERENCES identity.users(id), recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(lot_id,household_id) REFERENCES production.lots(id,household_id)
);
CREATE TABLE production.weight_samples (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL, lot_id uuid NOT NULL,
 sampled_on date NOT NULL, sample_count integer NOT NULL CHECK(sample_count>0),
 total_weight_kg numeric(16,3) NOT NULL CHECK(total_weight_kg>0),
 measured_by uuid REFERENCES identity.users(id),
 FOREIGN KEY(lot_id,household_id) REFERENCES production.lots(id,household_id)
);
CREATE TABLE production.interventions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL, lot_id uuid NOT NULL,
 intervention_type text NOT NULL, description text NOT NULL, performed_at timestamptz NOT NULL,
 practitioner text, withdrawal_until timestamptz, document_id uuid REFERENCES platform.documents(id),
 FOREIGN KEY(lot_id,household_id) REFERENCES production.lots(id,household_id)
);
CREATE TABLE inventory.suppliers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legal_name text NOT NULL, registration_ref text,
 contact_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(contact_details)='object')
);
CREATE TABLE inventory.items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text NOT NULL UNIQUE, name text NOT NULL,
 item_type text NOT NULL, unit text NOT NULL, active boolean NOT NULL DEFAULT true
);
CREATE TABLE inventory.stock_locations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid REFERENCES household.households(id),
 name text NOT NULL, location_type text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE inventory.stock_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL REFERENCES household.households(id),
 location_id uuid NOT NULL REFERENCES inventory.stock_locations(id), item_id uuid NOT NULL REFERENCES inventory.items(id),
 lot_id uuid, supplier_id uuid REFERENCES inventory.suppliers(id),
 movement_type text NOT NULL CHECK(movement_type IN ('receipt','issue','adjustment','transfer_in','transfer_out')),
 quantity_delta numeric(16,4) NOT NULL CHECK(quantity_delta<>0),
 occurred_at timestamptz NOT NULL, reference text NOT NULL,
 recorded_by uuid REFERENCES identity.users(id), document_id uuid REFERENCES platform.documents(id),
 FOREIGN KEY(lot_id,household_id) REFERENCES production.lots(id,household_id)
);
CREATE INDEX stock_movements_tenant_time ON inventory.stock_movements(household_id,occurred_at DESC);
CREATE TABLE quality.inspections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL REFERENCES household.households(id),
 lot_id uuid, inspection_type text NOT NULL,
 result text NOT NULL CHECK(result IN ('pending','passed','failed','conditional')),
 inspected_at timestamptz, inspected_by uuid REFERENCES identity.users(id),
 evidence_id uuid REFERENCES platform.documents(id),
 FOREIGN KEY(lot_id,household_id) REFERENCES production.lots(id,household_id)
);
CREATE TABLE quality.nonconformities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL REFERENCES household.households(id),
 inspection_id uuid REFERENCES quality.inspections(id), severity text NOT NULL
 CHECK(severity IN ('minor','major','critical')),
 description text NOT NULL, status text NOT NULL CHECK(status IN ('open','investigating','resolved','closed')),
 opened_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE TABLE quality.corrective_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nonconformity_id uuid NOT NULL REFERENCES quality.nonconformities(id),
 description text NOT NULL, assigned_to uuid REFERENCES identity.users(id),
 due_at timestamptz, completed_at timestamptz, evidence_id uuid REFERENCES platform.documents(id)
);
CREATE TABLE logistics.processors (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, authorization_reference text,
 authorization_valid_until date, status text NOT NULL CHECK(status IN ('pending','verified','suspended'))
);
CREATE TABLE logistics.processing_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL, lot_id uuid NOT NULL,
 processor_id uuid NOT NULL REFERENCES logistics.processors(id),
 status text NOT NULL CHECK(status IN ('scheduled','received','processed','released','blocked')),
 processed_at timestamptz, output_quantity numeric(16,3), output_unit text,
 certificate_id uuid REFERENCES platform.documents(id),
 FOREIGN KEY(lot_id,household_id) REFERENCES production.lots(id,household_id)
);
CREATE TABLE logistics.tours (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL REFERENCES household.households(id),
 code text NOT NULL, status text NOT NULL CHECK(status IN ('planned','active','completed','cancelled')),
 courier_user_id uuid REFERENCES identity.users(id), vehicle_reference text,
 starts_at timestamptz, completed_at timestamptz, UNIQUE(household_id,code),
 UNIQUE(id,household_id)
);
CREATE TABLE logistics.parcels (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL,
 shipment_id uuid NOT NULL REFERENCES logistics.shipments(id),
 tour_id uuid, label_version integer NOT NULL DEFAULT 1 CHECK(label_version>0),
 status text NOT NULL CHECK(status IN ('created','loaded','delivered','rejected','returned')),
 expires_on date, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tour_id,household_id) REFERENCES logistics.tours(id,household_id)
);
CREATE TABLE logistics.temperature_readings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid NOT NULL REFERENCES household.households(id),
 parcel_id uuid REFERENCES logistics.parcels(id), tour_id uuid,
 measured_at timestamptz NOT NULL, celsius numeric(6,2) NOT NULL,
 evidence_id uuid REFERENCES platform.documents(id), recorded_by uuid REFERENCES identity.users(id),
 FOREIGN KEY(tour_id,household_id) REFERENCES logistics.tours(id,household_id),
 CHECK(parcel_id IS NOT NULL OR tour_id IS NOT NULL)
);
CREATE TABLE notifications.templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL, version integer NOT NULL CHECK(version>0),
 channel text NOT NULL CHECK(channel IN ('email','sms','push','in_app')),
 body_template text NOT NULL, active boolean NOT NULL DEFAULT true, UNIQUE(code,version,channel)
);
CREATE TABLE notifications.deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid REFERENCES notifications.templates(id),
 recipient_user_id uuid REFERENCES identity.users(id), recipient_contact text,
 household_id uuid REFERENCES household.households(id), event_key text NOT NULL UNIQUE,
 status text NOT NULL CHECK(status IN ('pending','sent','failed','cancelled')),
 attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count>=0),
 next_attempt_at timestamptz, sent_at timestamptz, last_error text,
 CHECK(recipient_user_id IS NOT NULL OR recipient_contact IS NOT NULL)
);
CREATE INDEX notification_pending ON notifications.deliveries(next_attempt_at) WHERE status='pending';
CREATE TABLE ai.agents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, description text NOT NULL,
 status text NOT NULL CHECK(status IN ('enabled','disabled')), tool_allowlist text[] NOT NULL DEFAULT '{}'
);
CREATE TABLE ai.runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent_id uuid NOT NULL REFERENCES ai.agents(id),
 household_id uuid REFERENCES household.households(id), requested_by uuid REFERENCES identity.users(id),
 status text NOT NULL CHECK(status IN ('queued','running','awaiting_approval','completed','failed','cancelled')),
 input_reference text NOT NULL, model_id text, started_at timestamptz, completed_at timestamptz,
 error_code text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ai.proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES ai.runs(id),
 action_type text NOT NULL, target_type text NOT NULL, target_id uuid,
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 risk_level text NOT NULL CHECK(risk_level IN ('low','medium','high','prohibited')),
 status text NOT NULL CHECK(status IN ('proposed','approved','rejected','executed','expired')),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz
);
CREATE TABLE ai.approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), proposal_id uuid NOT NULL REFERENCES ai.proposals(id),
 reviewer_id uuid NOT NULL REFERENCES identity.users(id),
 decision text NOT NULL CHECK(decision IN ('approved','rejected')),
 decided_at timestamptz NOT NULL DEFAULT now(), rationale text NOT NULL,
 UNIQUE(proposal_id,reviewer_id)
);
COMMIT;
