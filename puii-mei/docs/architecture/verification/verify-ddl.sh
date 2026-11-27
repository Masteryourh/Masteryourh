#!/usr/bin/env bash
# Verificarea reproductibilă a DDL-ului din CLAUDE-02 pe PostgreSQL 16.
# Cerințe: psql, o instanță PostgreSQL 16 LOCALĂ și de test (container efemer recomandat).
# PGURL = URL către baza de administrare (ex. postgresql://postgres@localhost:5432/postgres).
#
# Protecții (CG-07): scriptul șterge și recreează DOAR baza `puii_ddl_verify`, și numai dacă:
#   1. gazda din PGURL e locală (localhost / 127.0.0.1 / ::1 / socket), altfel refuză;
#   2. PGURL nu e același cu DATABASE_URL din mediu (baza aplicației);
#   3. baza `puii_ddl_verify`, dacă există, poartă marcajul creat de acest script (comentariul `puii-verify-ephemeral`).
# Ieșirea completă se salvează în verification/logs/verify-ddl-<data>.log.
set -euo pipefail
cd "$(dirname "$0")"
PGURL="${PGURL:-postgresql://postgres@localhost:5432/postgres}"
DB=puii_ddl_verify
MARK=puii-verify-ephemeral

host=$(printf '%s' "$PGURL" | sed -E 's#^[a-z]+://([^@/]*@)?(\[[^]]*\]|[^:/?]*).*#\2#')
case "$host" in
  ""|localhost|127.0.0.1|"[::1]"|::1) ;;
  *) echo "REFUZ: gazda '$host' nu e locală. Rulează doar pe o instanță de test locală / efemeră." >&2; exit 2 ;;
esac
if [ -n "${DATABASE_URL:-}" ] && [ "${DATABASE_URL%/*}" = "${PGURL%/*}" ] && [ "${DATABASE_URL##*/}" = "$DB" ]; then
  echo "REFUZ: DATABASE_URL indică aceeași bază." >&2; exit 2
fi
exists=$(psql "$PGURL" -Atc "select 1 from pg_database where datname = '$DB'")
if [ "$exists" = 1 ]; then
  mark=$(psql "$PGURL" -Atc "select coalesce(shobj_description(oid, 'pg_database'), '') from pg_database where datname = '$DB'")
  if [ "$mark" != "$MARK" ]; then
    echo "REFUZ: baza '$DB' există dar nu a fost creată de acest script (lipsește marcajul). Nu o șterg." >&2; exit 2
  fi
fi

mkdir -p logs
LOG="logs/verify-ddl-$(date -u +%Y%m%dT%H%M%SZ).log"
exec > >(tee "$LOG") 2>&1
TMP=$(mktemp -d)
python3 extract-ddl.py ../CLAUDE-02-SYSTEM-AND-DATABASE-ARCHITECTURE.md > "$TMP/ddl.sql"
psql "$PGURL" -qc "drop database if exists $DB" -c "create database $DB" -c "comment on database $DB is '$MARK'"
TARGET="${PGURL%/*}/$DB"
psql "$TARGET" -v ON_ERROR_STOP=1 -q -f "$TMP/ddl.sql"
echo "DDL: exit 0"
psql "$TARGET" -At -f stats.sql
psql "$TARGET" -v ON_ERROR_STOP=1 -q -f invariants.sql
echo "Invariante SQL: exit 0"
echo "Jurnal: $LOG"
