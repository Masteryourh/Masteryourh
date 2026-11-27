"""Extrage blocurile ```sql din CLAUDE-02, expandează /* audit */ și scrie un fișier DDL rulabil.
Utilizare: python3 extract-ddl.py ../CLAUDE-02-SYSTEM-AND-DATABASE-ARCHITECTURE.md > ddl.sql"""
import re, sys
s = open(sys.argv[1], encoding="utf-8").read()
sql = "create extension if not exists citext;\n" + "\n".join(re.findall(r"```sql\n(.*?)```", s, re.S))
audit = ("created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz, "
         "updated_by uuid, version integer not null default 1")
sql = sql.replace("/* audit */", audit)
sql = re.sub(r"(version integer not null default 1)\n(\s+(?:unique|check|primary))", r"\1,\n\2", sql)
sys.stdout.write(sql)
