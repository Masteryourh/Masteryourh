-- Teste SQL (o singură sesiune) pentru invariantele garantate DIRECT de schema din CLAUDE-02.
-- Fiecare test se așteaptă la o eroare anume; dacă nu apare, scriptul eșuează.
\set ON_ERROR_STOP on
begin;
-- date minime
insert into identity.users (id, email, full_name, status) values ('00000000-0000-0000-0000-000000000001','admin@test.ro','Admin','activ');
insert into household.households (id, legal_form, legal_name, address, county, locality, lot_code_prefix)
  values ('00000000-0000-0000-0000-0000000000a1','PF','Hreniuc Ion','Moldova-Sulița 12','Suceava','Moldova-Sulița','MS'),
         ('00000000-0000-0000-0000-0000000000a2','PF','Ciornei Ana','Fundu Moldovei 3','Suceava','Fundu Moldovei','FM');
insert into program.programs (id, code, vertical, name, status) values ('00000000-0000-0000-0000-0000000000b1','PUI_PASUNE_60','pui','Pui pășunat 60 zile','activ');
insert into program.program_versions (id, program_id, version, params, params_schema_version, effective_from)
  values ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000b1',1,'{"birds_per_pen":40}',1,'2026-11-01');
insert into production.lots (id, code, household_id, program_version_id, planned_start, breed, feed_description, processing_description, pens_planned, status)
  values ('00000000-0000-0000-0000-0000000000c1','MS-2026-01','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b2','2026-12-01','hibrid','cereale','in gospodarie',1,'deschis_precomenzi');
insert into production.pens (id, lot_id, number, capacity, status) values ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000c1',1,40,'se_umple');
insert into commerce.customers (id, full_name, phone) values ('00000000-0000-0000-0000-0000000000d1','Client Test','0722000111');
insert into commerce.products (id, program_id, code, name, unit) values ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000b1','PUI_CURATAT','Pui curățat, gata de gătit','kg');
insert into commerce.price_lists (id, product_id, market_price_bani, markup_pct, effective_from) values ('00000000-0000-0000-0000-0000000000d3','00000000-0000-0000-0000-0000000000d2',3000,20,now());
insert into logistics.zones (id, code, name, localities, delivery_day, fee_bani, kind) values ('00000000-0000-0000-0000-0000000000e1','ridicare','Ridicare','-','sambata',0,'ridicare');
insert into commerce.orders (id, number, customer_id, zone_id, status, price_list_id, est_total_bani, idempotency_key, terms_version, terms_accepted_at)
  values ('00000000-0000-0000-0000-0000000000f1','PM2611-TEST1','00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000e1','noua','00000000-0000-0000-0000-0000000000d3',172800,'cheie-1','v1',now());

-- prețul la client calculat de baza de date: 30 lei + 20% = 36 lei = 3600 bani
do $$ begin
  if (select client_price_bani from commerce.price_lists where id='00000000-0000-0000-0000-0000000000d3') <> 3600 then
    raise exception 'FAIL pret client'; end if; raise notice 'OK  pret client = 36 lei/kg (coloana generata)'; end $$;

-- INV-02: aceeași cheie de idempotență nu creează a doua comandă
do $$ begin
  begin
    insert into commerce.orders (id, number, customer_id, zone_id, status, price_list_id, est_total_bani, idempotency_key, terms_version, terms_accepted_at)
      values ('00000000-0000-0000-0000-0000000000f2','PM2611-TEST2','00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000e1','noua','00000000-0000-0000-0000-0000000000d3',1,'cheie-1','v1',now());
    raise exception 'FAIL INV-02';
  exception when unique_violation then raise notice 'OK  INV-02 cheie de idempotenta duplicata respinsa'; end; end $$;

-- INV-03: un singur avans activ pe comandă
insert into finance.payments (id, order_id, household_id, kind, amount_bani, status, payment_reference)
  values ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000a1','avans',41300,'asteptata','REF-1');
do $$ begin
  begin
    insert into finance.payments (id, order_id, household_id, kind, amount_bani, status, payment_reference)
      values ('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000a1','avans',41300,'asteptata','REF-2');
    raise exception 'FAIL INV-03';
  exception when unique_violation then raise notice 'OK  INV-03 al doilea avans activ respins'; end; end $$;

-- INV-04: confirmare de plată fără referință bancară
do $$ begin
  begin
    insert into finance.payment_confirmations (id, payment_id, bank_reference, received_on, amount_bani, confirmed_by)
      values ('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000101',null,current_date,41300,'00000000-0000-0000-0000-000000000001');
    raise exception 'FAIL INV-04';
  exception when not_null_violation then raise notice 'OK  INV-04 confirmare fara referinta bancara respinsa'; end; end $$;

-- INV-05: registru confirmat fără număr / document
do $$ begin
  begin
    insert into finance.ledger_entries (id, household_id, direction, category, counterparty, description, amount_bani, occurred_on, state)
      values ('00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-0000000000a1','cheltuiala','furaj','Furnizor','furaj',100000,current_date,'confirmat');
    raise exception 'FAIL INV-05';
  exception when check_violation then raise notice 'OK  INV-05 inregistrare confirmata fara document respinsa'; end; end $$;

-- INV-07: un singur blocaj activ pe lot
insert into quality.lot_holds (id, lot_id, reason, placed_by) values ('00000000-0000-0000-0000-000000000105','00000000-0000-0000-0000-0000000000c1','test','00000000-0000-0000-0000-000000000001');
do $$ begin
  begin
    insert into quality.lot_holds (id, lot_id, reason, placed_by) values ('00000000-0000-0000-0000-000000000106','00000000-0000-0000-0000-0000000000c1','dublu','00000000-0000-0000-0000-000000000001');
    raise exception 'FAIL INV-07';
  exception when unique_violation then raise notice 'OK  INV-07 al doilea blocaj activ pe acelasi lot respins'; end; end $$;

-- INV-11: o singură închidere pe lot; diferența calculată de baza de date
insert into finance.lot_closings (id, lot_id, revenue_bani, expenses_bani, fee_bani, rules_version, status)
  values ('00000000-0000-0000-0000-000000000107','00000000-0000-0000-0000-0000000000c1',1000000,700000,30000,'v0','calcul');
do $$ begin
  if (select difference_bani from finance.lot_closings where id='00000000-0000-0000-0000-000000000107') <> 300000 then raise exception 'FAIL diferenta'; end if;
  begin
    insert into finance.lot_closings (id, lot_id, revenue_bani, expenses_bani, fee_bani, rules_version, status)
      values ('00000000-0000-0000-0000-000000000108','00000000-0000-0000-0000-0000000000c1',1,1,0,'v0','calcul');
    raise exception 'FAIL INV-11';
  exception when unique_violation then raise notice 'OK  INV-11 a doua inchidere a aceluiasi lot respinsa; diferenta = 3.000 lei'; end; end $$;

-- FK: alocare pe un țarc inexistent
do $$ begin
  begin
    insert into commerce.order_lines (id, order_id, product_id, quantity, unit_price_bani, est_weight_kg)
      values ('00000000-0000-0000-0000-000000000109','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000d2',10,3600,48);
    insert into commerce.allocations (id, order_line_id, pen_id, household_id, quantity, status)
      values ('00000000-0000-0000-0000-000000000110','00000000-0000-0000-0000-000000000109','00000000-0000-0000-0000-00000000ffff','00000000-0000-0000-0000-0000000000a1',10,'rezervat');
    raise exception 'FAIL FK';
  exception when foreign_key_violation then raise notice 'OK  FK alocare pe tarc inexistent respinsa'; end; end $$;

-- CHECK: IBAN invalid
do $$ begin
  begin
    insert into household.bank_accounts (id, household_id, holder, iban, purpose) values ('00000000-0000-0000-0000-000000000111','00000000-0000-0000-0000-0000000000a1','X','RO12XYZ','incasari_clienti');
    raise exception 'FAIL IBAN';
  exception when check_violation then raise notice 'OK  IBAN invalid respins'; end; end $$;
rollback;
