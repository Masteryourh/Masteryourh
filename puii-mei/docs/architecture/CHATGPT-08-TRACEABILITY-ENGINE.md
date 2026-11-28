# 08 — Traceability Engine (TRC-001)
v0.1 DRAFT. Mandat §8, cap06–07. PROPUS genealogie pe lot/cohortă, nu identificare individuală fictivă.
## Flux și proprietate
Origine pui/batch → recepție cohortă → furaje batch, intervenții, transferuri → procesare intrări/ieșiri → batch rezultat → colet → tură → client. Split/merge păstrează părinții și cantități/unități; kg viu diferă de carcasă. Domeniile sursă dețin evenimentele; trace indexează, nu rescrie. Lipsa legăturii = incomplete. Corecție append-only prin domeniul sursă. Hash dovedește integritate bytes, nu adevărul declarației.
## Date
nodes(id UUID PK,kind,source_id,household_id,scope_kind); edges(id,from_node,to_node,event_id,quantity,unit,relation_type); events extind source_event_id UNIQUE,schema_version,occurred_at,recorded_at,actor,evidence_ref,correction_of; evidence_links(event_id,document_id,household_id); publication_versions(id,subject_id,version,approved_by,projection_hash); recall_cases(id,scope,status,reason,opened_at). FK compuse tenant, global explicit, fără NULL bypass, transfer cross-tenant autorizat; index from/to/source/lot/time. Detectare ciclu, replay idempotent, checkpoint/rebuild. DDL candidat.
## Acces și incidente
Quality/admin autorizat upstream/downstream complet; manager scope; gospodar propriu; client comanda proprie; public numai proiecție aprobată. QR public opac, separat de token curier/client, revocare la regenerare. Fără PII, IBAN, documente brute, locație exactă. Recall identifică toate ramurile afectate, compliance decide hold și comunicare; nu depinde de proiecție stale.
## API
GET /api/v1/trace/lots/{id}, /batches/{id}/upstream|downstream, /public/{code}, /orders/{id}/trace; POST /trace/corrections {sourceEventId,reason,evidence}; /trace/publications {subjectId,version}; /compliance/recalls {sourceRef,reason}. 404 generic,409 conflict,422 incomplete/cycle,503 unavailable. Outbox atomic la sursă, consumer dedup.
## Teste
TRC-T01 origine→colet; T02 split/merge; T03 transfer atomic; T04 batch furaj; T05 unități; T06 incomplete; T07 corecție; T08 replay; T09 ciclu; T10 recall; T11 tenant; T12 QR revocat; T13 public fără PII; T14 client alt colet; T15 rebuild; T16 hold fără lag; T17 hash. Neexecutate. DESCHIS granularitate legală, retenție, publicare, responsabilitate recall.
