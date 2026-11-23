select 'scheme', count(distinct table_schema) from information_schema.tables where table_schema not in ('pg_catalog','information_schema','public')
union all select 'tabele', count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema','public')
union all select 'chei_straine', count(*) from information_schema.table_constraints where constraint_type='FOREIGN KEY'
union all select 'unique', count(*) from information_schema.table_constraints where constraint_type='UNIQUE' and table_schema not in ('pg_catalog','information_schema')
union all select 'check_explicite', count(*) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where c.contype='c' and n.nspname not in ('pg_catalog','information_schema','public')
union all select 'indexuri', count(*) from pg_indexes where schemaname not in ('pg_catalog','information_schema','public')
union all select 'tabele_cu_household_id', count(*) from information_schema.columns where column_name='household_id' and table_schema not in ('pg_catalog','information_schema','public');
