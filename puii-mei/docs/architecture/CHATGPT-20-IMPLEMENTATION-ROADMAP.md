# 20 — IMPLEMENTATION ROADMAP
Version 0.1 DRAFT — 2026-11-26. Source: founder requirements PR58 §20, PR50, PR62 and PR82 review findings as reported. All target designs PROPUS unless explicitly confirmed. No production changes. Existing code not exhaustively audited for this chapter.

## Status and sequencing
Draft architecture 01–20 target; independent reviews 01–11 reported, 12–20 pending. PR75 R01–R07 and PR82 P0 not closed by documentation; #83 C1 reported fixed. No dates or budget commitments. Founder instruction: proceed reversible independent work; defer nonblocking policy decisions, fail closed on dependent operational actions.
| Gate | Work | Exit evidence |
|---|---|---|
| G0 baseline | inventory current routes/schema, reconcile 53 vs 77 table proposals, PR82 and chapters | reviewed canonical spec, decision register |
| G1 safety | RLS/FK runtime tests, IAM, audit/outbox, concurrency, recovery rehearsal | negative tests and independent review |
| G2 household/production | onboarding, daily journal, population ledger, capacity, tasks | synthetic end-to-end, no negative balance |
| G3 commerce/finance | single obligation writer, versioned policy, evidence reconciliation, expense review | idempotency, segregation, preview only until policy approved |
| G4 trace/logistics/quality | genealogy conservation, stock locks, atomic holds, dispatch | race and trace tests |
| G5 UX/API/AI | role interfaces, typed adapters, read/draft agents, accessibility | contract and scope tests, manual fallback |
| G6 pilot readiness | approved legal/vet/accounting, recovery, operational training | founder signoff and specialist evidence |
| G7 pilot | proposed 1–3 households, monitored limited scope | measured outcomes, incident review |
| G8 scale | benchmarks, read models, audit partition if approved, additional verticals | measured capacity and approved rollout |
Dependencies G1 before sensitive writes; G2 before real allocations; G3/G4 before fulfillment; G6 before live pilot. Parallelize schemas, test harness, UI drafts, adapters and simulations. No live migration/deploy authorized by roadmap.
## Decision backlog
Fee basis kg/price and eligible costs, investment treatment, reserve and post-day21 economic loss, deficit allocation, legal contract role, independent expense approver, QR public policy, AI authority/SLA, RPO/RTO, provider costs. Versioned policies with explicit unconfigured state; simulation labels assumptions, finalization blocked only where required. Biological facts always recorded. Technical reversible choices documented as proposed ADR, irreversible decisions escalated.
## Ownership and completion
ChatGPT architecture/reconciliation; Claude implementation and independent review in separate PRs; founder business authority; specialists legal/vet/accounting validation. Notion management register, GitHub technical evidence. Each task owner, priority, dependency, acceptance criteria, PR/commit and status. Definition of done: reviewed code/spec, executed tests, security evidence, migration/rollback plan, documentation, no unresolved critical defect in scope. Draft count not implementation percentage. Weekly or on-demand checkpoint, no assumed background sync. Risks: data isolation, financial double count, capacity races, compliance, recovery, adoption, provider latency/cost. Mitigate by gates and evidence, not optimistic dates.
