# 13 — API COMMUNICATION
Version 0.1 DRAFT — 2026-11-26. Source: founder requirements PR58 §13, PR50, PR62 and PR82 review findings as reported. All target designs PROPUS unless explicitly confirmed. No production changes. Existing code not exhaustively audited for this chapter.

## Contract
All interfaces share domain services and IAM context; server actions are adapters, REST for integrations/offline (proposed). Version /api/v1; OpenAPI 3.1 generated from validated schemas, contract tests against implementation. UUID resource IDs, UTC ISO timestamps, integer minor currency units with ISO currency, decimal kg strings, integer birds. Never accept actor or tenant authority from body. Cursor opaque signed scope/filter/version, limit default 50 max 100 proposed. Responses {data,meta:{requestId,nextCursor,version}}. Mutations require Idempotency-Key scoped actor+operation, canonical body hash, replay original outcome; conflicting hash 409. If-Match version for edits; transactional lock for capacity and holds. 
## Endpoint inventory (target, not as-built)
| Method/path | Input → result | Authority |
|---|---|---|
| GET /households/{id} | id → profile projection | own/assigned |
| POST /households/applications | profile,evidenceRefs → application | applicant |
| POST /households/{id}/enrollments | programVersion → enrollment | authorized ops |
| GET /tasks | scope,status,cursor → page | assigned |
| POST /tasks/{id}/justifications | text,evidenceRefs,version → justification | assignee |
| POST /tasks/{id}/resolutions | decision,reason → resolution | reviewer |
| POST /production/lots | enrollment,planVersion,units → lot | planner |
| POST /production/lots/{id}/population-events | cohort,kind,count,observedAt,clientEventId → event | scoped operator |
| GET /production/lots/{id}/summary | asOf → balances,KPI | scoped |
| POST /commerce/preorders | offerVersion,quantity,customerRef → preorder | customer/operator |
| POST /commerce/allocations | orderLine,lot,quantity → allocation | commerce |
| POST /commerce/orders/{id}/cancellations | reason,version → request | authorized |
| POST /commerce/obligations | orderRef,termsVersion → obligation | commerce service |
| POST /finance/payment-evidence | obligationRef,amount,evidenceRef → evidence | scoped |
| POST /finance/reconciliations | evidenceRef,obligationRef → proposal | finance |
| POST /finance/expenses | lotRef,category,amount,evidence → expense | household |
| POST /finance/expenses/{id}/decision | decision,reason → review | independent reviewer |
| POST /finance/settlements/preview | lot,policyVersion → calculation | finance |
| POST /finance/settlements/{id}/close | version,approvalRef → settlement | finance approver |
| POST /logistics/stock-events | item,location,qty,kind → event | inventory |
| POST /logistics/shipments | source,destination,items → shipment | dispatcher |
| POST /trace/transformations | inputs,outputs,losses,units → genealogy | processor |
| GET /trace/public/{token} | opaque token → redacted projection | public |
| POST /quality/holds | scope,reason,evidence → hold | specialist |
| POST /quality/holds/{id}/release | approval,reason → release | specialist |
| POST /files/uploads | mime,size,checksum,purpose → restricted upload intent | scoped |
| POST /files/{id}/complete | checksum → quarantine/verified | uploader |
| POST /ai/runs | agentKey,taskType,refs,input → run | scoped |
| POST /ai/proposals/{id}/decision | hash,decision,reason → approval | authorized human |
All paths prefixed /api/v1. GET detail/list counterparts use same authorization; public projections never expose internal IDs or personal data. No final settlement without approved policy; no refund/transfer initiated by evidence API. Full field schemas and existing route inventory remain implementation deliverables.
## Errors and security
RFC9457 proposed: type,title,status,detail safe,instance,code,requestId,fieldErrors. 400 schema,401 auth,403 capability,404 concealed resource,409 version/capacity/idempotency conflict,422 invariant,429 quota Retry-After,503 dependency. Cookie sessions CSRF/origin validation; integration scoped expiring credentials, rotate/revoke; rate limits per principal/IP/operation, no global bypass. Never log credentials.
## Events
Envelope eventId,type,schemaVersion,aggregateId,aggregateVersion,scope,occurredAt,correlationId,causationId,payloadRef. Transactional outbox with at-least-once delivery, consumer inbox unique eventId, ordering per aggregate, dead letter and replay authorization. Webhook signature over raw bytes+timestamp, replay window, secret rotation, allowlisted destinations, no arbitrary callback SSRF. Events include PopulationChanged, AllocationChanged, ObligationCreated, PaymentMatched, StockMoved, HoldPlaced, ShipmentDelivered, ProposalDecided. No event substitutes for synchronous compliance gate.
## Acceptance
API-T01 schema rejects extra fields; T02 tenant spoof denied; T03 cursor tamper; T04 replay same key; T05 conflicting key; T06 concurrent version; T07 hold/allocation race; T08 webhook replay; T09 duplicate event; T10 crash after commit; T11 redaction; T12 contract drift; T13 offline late observation; T14 unapproved fee closure denied. Tests not run.
