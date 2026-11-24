-- Validare PR60 (chatgpt-04-*.draft.sql) în PostgreSQL 16 izolat. Rulare:
--   createdb ddl60; psql -d ddl60 -f chatgpt-04-core-schema.draft.sql -f chatgpt-04-extensions.draft.sql -f chatgpt-04-tenant-hardening.draft.sql
--   psql -d ddl60 -f pr60-ddl-validate.sql ; node scripts/verify/pr60-allocate-concurrency.mjs postgres://…/ddl60
-- Doar pe o bază de test de unică folosință (creează roluri app_rt / app_owner).
\set ON_ERROR_STOP 0
\pset tuples_only on
-- Seed (ca owner/superuser)
INSERT INTO household.households(id,slug,legal_name,status,created_at,updated_at) VALUES
 ('aaaaaaaa-0000-0000-0000-000000000001','gosp-a','Gospodaria A','active',now(),now()),
 ('bbbbbbbb-0000-0000-0000-000000000002','gosp-b','Gospodaria B','active',now(),now());
INSERT INTO identity.users(id,email,display_name) VALUES ('11111111-0000-0000-0000-000000000001','a@t.ro','A'),('22222222-0000-0000-0000-000000000002','b@t.ro','B'),('33333333-0000-0000-0000-000000000003','op@t.ro','Op');
INSERT INTO programs.definitions(id,code,name,category) VALUES ('d0000000-0000-0000-0000-000000000001','pui','Pui','pasari');
INSERT INTO programs.versions(id,program_id,version,rules,status) VALUES ('e0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',1,'{}','draft');
INSERT INTO programs.cycles(id,household_id,program_version_id,code,status) VALUES
 ('c0000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','C-A','active'),
 ('c0000000-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000001','C-B','active');
INSERT INTO production.lots(id,household_id,cycle_id,code,status,capacity_units,reserved_units,version) VALUES
 ('10000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000001','c0000000-0000-0000-0000-00000000000a','L-A','preorder',40,0,1),
 ('10000000-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000002','c0000000-0000-0000-0000-00000000000b','L-B','preorder',40,0,1);
INSERT INTO platform.documents(id,household_id,storage_key,sha256,mime_type,size_bytes,classification) VALUES
 ('d0c00000-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000002','files/b',repeat('0',64),'application/pdf',10,'private');
INSERT INTO finance.bank_accounts(id,household_id,iban_ciphertext,iban_fingerprint,holder,status,requested_by) VALUES
 ('ba000000-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000002','\x00',repeat('0',64),'Titular B','pending','22222222-0000-0000-0000-000000000002');
INSERT INTO commerce.customers(id,name,email) VALUES ('cc000000-0000-0000-0000-000000000001','Client A','ca@t.ro'),('cc000000-0000-0000-0000-000000000002','Client B','cb@t.ro');
INSERT INTO commerce.orders(id,number,customer_id,household_id,status,currency,created_at,updated_at) VALUES
 ('0d000000-0000-0000-0000-00000000000a','PM-A','cc000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','confirmed','RON',now(),now());
INSERT INTO ai.agents(id,code,description,status) VALUES ('a9000000-0000-0000-0000-000000000001','plan','planificare','enabled');
INSERT INTO ai.runs(id,agent_id,household_id,status,input_reference) VALUES ('a8000000-0000-0000-0000-00000000000b','a9000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','completed','x');

-- Rol runtime: NU owner, NOBYPASSRLS, drepturi DML
DROP ROLE IF EXISTS app_rt; CREATE ROLE app_rt NOLOGIN NOBYPASSRLS;
DO $$ DECLARE s text; BEGIN FOR s IN SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema' AND nspname<>'public' LOOP
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO app_rt', s); EXECUTE format('GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA %I TO app_rt', s); END LOOP; END $$;

\echo '--- V01 RLS: tenant A nu vede lotul lui B (asteptat 1 = doar L-A)'
BEGIN; SET LOCAL ROLE app_rt; SET LOCAL app.household_id='aaaaaaaa-0000-0000-0000-000000000001'; SELECT count(*) FROM production.lots; COMMIT;
\echo '--- V02 RLS: fara context -> 0 randuri (fail closed)'
BEGIN; SET LOCAL ROLE app_rt; SELECT count(*) FROM production.lots; COMMIT;
\echo '--- V03 RLS WITH CHECK: tenant A insereaza lot pentru B (asteptat ERROR)'
BEGIN; SET LOCAL ROLE app_rt; SET LOCAL app.household_id='aaaaaaaa-0000-0000-0000-000000000001';
INSERT INTO production.lots(id,household_id,cycle_id,code,status,capacity_units,reserved_units,version) VALUES (gen_random_uuid(),'bbbbbbbb-0000-0000-0000-000000000002','c0000000-0000-0000-0000-00000000000b','X','planned',1,0,1); ROLLBACK;
\echo '--- V04 Tabele fara RLS: tenant A citeste documentele, clientii si conturile altora (documents B, customers)'
BEGIN; SET LOCAL ROLE app_rt; SET LOCAL app.household_id='aaaaaaaa-0000-0000-0000-000000000001';
SELECT 'documents vizibile', count(*) FROM platform.documents; SELECT 'customers vizibili', count(*) FROM commerce.customers; SELECT 'ai.runs vizibile', count(*) FROM ai.runs; COMMIT;
\echo '--- V05 FK cross-tenant: mandat A cu documentul lui B (DB-G01; asteptat ar trebui ERROR)'
BEGIN; SET LOCAL ROLE app_rt; SET LOCAL app.household_id='aaaaaaaa-0000-0000-0000-000000000001';
INSERT INTO household.mandates(id,household_id,version,status,document_id) VALUES (gen_random_uuid(),'aaaaaaaa-0000-0000-0000-000000000001',1,'draft','d0c00000-0000-0000-0000-00000000000b'); SELECT 'mandat A -> document B: ACCEPTAT'; ROLLBACK;
\echo '--- V06 FK cross-tenant: dovada de plata A cu contul bancar al lui B (DB-G02)'
BEGIN; SET LOCAL ROLE app_rt; SET LOCAL app.household_id='aaaaaaaa-0000-0000-0000-000000000001';
INSERT INTO finance.payment_evidence(id,household_id,order_id,bank_account_id,amount,currency,status) VALUES (gen_random_uuid(),'aaaaaaaa-0000-0000-0000-000000000001','0d000000-0000-0000-0000-00000000000a','ba000000-0000-0000-0000-00000000000b',100,'RON','declared'); SELECT 'plata A -> cont B: ACCEPTAT'; ROLLBACK;
\echo '--- V07 Oracol de existenta prin FK: cont bancar inexistent (asteptat ERROR -> diferenta fata de V06 dezvaluie existenta)'
BEGIN; SET LOCAL ROLE app_rt; SET LOCAL app.household_id='aaaaaaaa-0000-0000-0000-000000000001';
INSERT INTO finance.payment_evidence(id,household_id,order_id,bank_account_id,amount,currency,status) VALUES (gen_random_uuid(),'aaaaaaaa-0000-0000-0000-000000000001','0d000000-0000-0000-0000-00000000000a',gen_random_uuid(),100,'RON','declared'); ROLLBACK;
\echo '--- V08 AI: propunere fara household_id pe rularea lui B (DB-G03, MATCH SIMPLE)'
BEGIN; SET LOCAL ROLE app_rt; SET LOCAL app.household_id='aaaaaaaa-0000-0000-0000-000000000001';
INSERT INTO ai.proposals(id,run_id,action_type,target_type,payload,risk_level,status) VALUES (gen_random_uuid(),'a8000000-0000-0000-0000-00000000000b','x','lot','{}','low','proposed'); SELECT 'propunere null-scope pe run B: ACCEPTAT'; ROLLBACK;
\echo '--- V09 Capacitate: doua alocari de 30 pe lotul de 40 (DB-G04)'
INSERT INTO commerce.products(id,program_id,sku,name,unit) VALUES ('9d000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','PUI','Pui','buc');
INSERT INTO commerce.order_lines(id,order_id,product_id,quantity,unit_price,currency,household_id) VALUES
 ('01000000-0000-0000-0000-000000000001','0d000000-0000-0000-0000-00000000000a','9d000000-0000-0000-0000-000000000001',30,0,'RON','aaaaaaaa-0000-0000-0000-000000000001'),
 ('01000000-0000-0000-0000-000000000002','0d000000-0000-0000-0000-00000000000a','9d000000-0000-0000-0000-000000000001',30,0,'RON','aaaaaaaa-0000-0000-0000-000000000001');
BEGIN; SET LOCAL ROLE app_rt; SET LOCAL app.household_id='aaaaaaaa-0000-0000-0000-000000000001';
INSERT INTO commerce.allocations(id,household_id,lot_id,order_line_id,units,status,created_at) VALUES
 (gen_random_uuid(),'aaaaaaaa-0000-0000-0000-000000000001','10000000-0000-0000-0000-00000000000a','01000000-0000-0000-0000-000000000001',30,'active',now()),
 (gen_random_uuid(),'aaaaaaaa-0000-0000-0000-000000000001','10000000-0000-0000-0000-00000000000a','01000000-0000-0000-0000-000000000002',30,'active',now());
SELECT 'alocat activ pe lot de 40:', sum(units), '; reserved_units:', (SELECT reserved_units FROM production.lots WHERE code='L-A') FROM commerce.allocations WHERE status='active'; ROLLBACK;
\echo '--- V10 Pool: SET (nu LOCAL) ramane pe conexiune dupa COMMIT -> urmatoarea cerere mosteneste tenantul'
BEGIN; SET ROLE app_rt; SET app.household_id='bbbbbbbb-0000-0000-0000-000000000002'; COMMIT;
BEGIN; SELECT 'tranzactia urmatoare vede tenant:', current_setting('app.household_id',true), (SELECT count(*) FROM production.lots WHERE code='L-B'); COMMIT;
RESET ROLE; RESET app.household_id;
\echo '--- V11 Owner fara FORCE RLS: daca aplicatia se conecteaza ca owner (implicit pe Neon), RLS nu se aplica'
DROP ROLE IF EXISTS app_owner; CREATE ROLE app_owner NOLOGIN NOBYPASSRLS; GRANT USAGE ON SCHEMA production TO app_owner; ALTER TABLE production.lots OWNER TO app_owner;
BEGIN; SET LOCAL ROLE app_owner; SET LOCAL app.household_id='aaaaaaaa-0000-0000-0000-000000000001'; SELECT 'owner, context A, loturi vizibile:', count(*) FROM production.lots; ROLLBACK;
ALTER TABLE production.lots FORCE ROW LEVEL SECURITY;
BEGIN; SET LOCAL ROLE app_owner; SET LOCAL app.household_id='aaaaaaaa-0000-0000-0000-000000000001'; SELECT 'owner cu FORCE, context A:', count(*) FROM production.lots; ROLLBACK;
ALTER TABLE production.lots NO FORCE ROW LEVEL SECURITY; ALTER TABLE production.lots OWNER TO postgres;
