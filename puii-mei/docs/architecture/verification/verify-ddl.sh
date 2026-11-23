#!/usr/bin/env bash
# Verificarea reproductibilă a DDL-ului din CLAUDE-02 pe PostgreSQL 16.
# Cerințe: psql, o instanță PostgreSQL 16; PGURL = URL către o bază de administrare (ex. postgresql://postgres@localhost:5432/postgres)
set -euo pipefail
cd "$(dirname "$0")"
PGURL="${PGURL:-postgresql://postgres@localhost:5432/postgres}"
DB=puii_ddl_verify
python3 extract-ddl.py ../CLAUDE-02-SYSTEM-AND-DATABASE-ARCHITECTURE.md > /tmp/puii-ddl.sql
psql "$PGURL" -qc "drop database if exists $DB" -c "create database $DB"
TARGET="${PGURL%/*}/$DB"
psql "$TARGET" -v ON_ERROR_STOP=1 -q -f /tmp/puii-ddl.sql
echo "DDL: exit 0"
psql "$TARGET" -At -f stats.sql
psql "$TARGET" -v ON_ERROR_STOP=1 -q -f invariants.sql
echo "Invariante SQL: exit 0"
