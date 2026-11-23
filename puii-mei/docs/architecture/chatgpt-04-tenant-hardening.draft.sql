-- CHATGPT-04 v0.3 — tenant integrity hardening (DRAFT; fresh empty DB only).
-- Execute AFTER core and extensions, in a disposable PostgreSQL 16 instance.
-- Not a migration for existing data; adding NOT NULL columns requires backfill in production.
BEGIN;
-- Invariant: an order line and its allocation belong to the same household.
ALTER TABLE commerce.order_lines ADD COLUMN household_id uuid NOT NULL;
ALTER TABLE commerce.order_lines ADD CONSTRAINT order_lines_order_tenant_fk
 FOREIGN KEY(order_id,household_id) REFERENCES commerce.orders(id,household_id);
ALTER TABLE commerce.order_lines ADD CONSTRAINT order_lines_id_tenant_unique UNIQUE(id,household_id);
ALTER TABLE commerce.allocations ADD CONSTRAINT allocations_line_tenant_fk
 FOREIGN KEY(order_line_id,household_id) REFERENCES commerce.order_lines(id,household_id);
-- Logistics: shipment, parcel, tour, reading always share household.
ALTER TABLE logistics.shipments ADD CONSTRAINT shipments_id_tenant_unique UNIQUE(id,household_id);
ALTER TABLE logistics.parcels ADD CONSTRAINT parcels_shipment_tenant_fk
 FOREIGN KEY(shipment_id,household_id) REFERENCES logistics.shipments(id,household_id);
ALTER TABLE logistics.parcels ADD CONSTRAINT parcels_id_tenant_unique UNIQUE(id,household_id);
ALTER TABLE logistics.temperature_readings ADD CONSTRAINT readings_parcel_tenant_fk
 FOREIGN KEY(parcel_id,household_id) REFERENCES logistics.parcels(id,household_id);
-- Quality: inspection and nonconformity must share household.
ALTER TABLE quality.inspections ADD CONSTRAINT inspections_id_tenant_unique UNIQUE(id,household_id);
ALTER TABLE quality.nonconformities ADD CONSTRAINT nonconformities_inspection_tenant_fk
 FOREIGN KEY(inspection_id,household_id) REFERENCES quality.inspections(id,household_id);
ALTER TABLE quality.nonconformities ADD CONSTRAINT nonconformities_id_tenant_unique UNIQUE(id,household_id);
ALTER TABLE quality.corrective_actions ADD COLUMN household_id uuid NOT NULL;
ALTER TABLE quality.corrective_actions ADD CONSTRAINT corrective_actions_tenant_fk
 FOREIGN KEY(nonconformity_id,household_id) REFERENCES quality.nonconformities(id,household_id);
-- Stock: locations used by household stock must be household-owned.
-- Central/pooled inventory is a separate future workflow, NOT a silent nullable exception.
ALTER TABLE inventory.stock_locations ADD CONSTRAINT stock_locations_id_tenant_unique UNIQUE(id,household_id);
ALTER TABLE inventory.stock_movements ADD CONSTRAINT stock_movements_location_tenant_fk
 FOREIGN KEY(location_id,household_id) REFERENCES inventory.stock_locations(id,household_id);
-- AI proposal and approval tenant must follow the run.
ALTER TABLE ai.runs ADD CONSTRAINT ai_runs_id_tenant_unique UNIQUE(id,household_id);
ALTER TABLE ai.proposals ADD COLUMN household_id uuid;
ALTER TABLE ai.proposals ADD CONSTRAINT ai_proposals_run_tenant_fk
 FOREIGN KEY(run_id,household_id) REFERENCES ai.runs(id,household_id);
-- Important: nullable household_id permits global runs; tenant proposals require a separate
-- policy and invariant. This is explicitly NOT closed by this composite FK.
-- Prevent two simultaneously active assignments to same unit via EXCLUDE constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE production.lot_units ADD CONSTRAINT lot_units_no_overlap
 EXCLUDE USING gist (unit_id WITH =,
 tstzrange(assigned_from,COALESCE(assigned_until,'infinity'::timestamptz),'[)') WITH &&);
-- Direct tenant isolation policies for newly created operational tables.
-- This draft assumes a dedicated, unprivileged SQL application role without BYPASSRLS.
ALTER TABLE production.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY units_tenant ON production.units
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE production.observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY observations_tenant ON production.observations
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE production.inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY inputs_tenant ON production.inputs
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE production.mortality ENABLE ROW LEVEL SECURITY;
CREATE POLICY mortality_tenant ON production.mortality
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE production.weight_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY weights_tenant ON production.weight_samples
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE production.interventions ENABLE ROW LEVEL SECURITY;
CREATE POLICY interventions_tenant ON production.interventions
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE production.lot_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY lot_units_tenant ON production.lot_units
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE commerce.order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_lines_tenant ON commerce.order_lines
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE commerce.allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY allocations_tenant ON commerce.allocations
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE inventory.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_movements_tenant ON inventory.stock_movements
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE quality.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY inspections_tenant ON quality.inspections
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE quality.nonconformities ENABLE ROW LEVEL SECURITY;
CREATE POLICY nonconformities_tenant ON quality.nonconformities
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE quality.corrective_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY corrective_actions_tenant ON quality.corrective_actions
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE logistics.parcels ENABLE ROW LEVEL SECURITY;
CREATE POLICY parcels_tenant ON logistics.parcels
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE logistics.temperature_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY readings_tenant ON logistics.temperature_readings
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE logistics.tours ENABLE ROW LEVEL SECURITY;
CREATE POLICY tours_tenant ON logistics.tours
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE logistics.processing_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY processing_tenant ON logistics.processing_batches
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE compliance.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY assessments_tenant ON compliance.assessments
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE compliance.holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY holds_tenant ON compliance.holds
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE contracts.agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY agreements_tenant ON contracts.agreements
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE finance.cycle_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY settlements_tenant ON finance.cycle_settlements
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
ALTER TABLE traceability.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY trace_tenant ON traceability.events
 USING (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid)
 WITH CHECK (household_id=NULLIF(current_setting('app.household_id',true),'')::uuid);
-- Intentionally not enabling RLS on globally shared registries until access policy is specified.
-- Tenant isolation is STILL INCOMPLETE for documents, AI, notifications, membership,
-- contracts.parties, stock_locations and indirect shared registries.
COMMIT;
