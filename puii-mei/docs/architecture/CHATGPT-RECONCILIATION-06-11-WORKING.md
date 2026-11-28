# Reconciliation working register 06–11 — 2026-11-28
DRAFT, based on Claude PR62 reports of 26–27 November; exact PR82 and patch review pending. This register is not closure of findings.
| Finding | Target contract | Evidence reported | Remaining gate |
|---|---|---|---|
| F1 | Commerce sole obligation writer; Finance evidence/matching only | #85 SQL tests | inspect schema and service ownership |
| F2/F4 | lot policy version, kg basis, no invented fee formula | #87 simulation and fail-closed | founder formula and accounting validation before closure |
| F3 | independent expense approval, no creator self-approval | #85 SQL tests | inspect runtime grants, approver policy remains open |
| C1 | targeted reads and atomic capacity reservation | #83/#86 benchmark and verification | inspect transaction snapshot and regression |
| C2 | record deficit truthfully, freeze new sales as needed, no automatic redistribution | policy open | founder allocation policy before automated resolution |
| G1 | genealogy conservation with explicit loss and units | #85 SQL tests | inspect transformation transaction, unit conversions |
| S1 | lockable inventory balance, atomic event and balance | #85 SQL tests | inspect concurrency and ownership |
| Q1 | synchronous compliance check and lock in same transaction as allocation/dispatch | #85 SQL tests | inspect lock ordering and hold race |
| K1 | no final legal contract role assumption | open | legal review before contract activation |
## Integration sequence
Review #84 before dependent #85; review #82 findings against actual patches, not just test counts. #86 benchmark evidence, #87 economic policy simulation, #88 synthetic recovery, #89 search benchmark, #90 diagnostic independently reviewable subject to actual PR dependencies. Do not merge or migrate on basis of this register. Existing production JSONB and target SQL remain distinct. Require runtime non-owner PG16 tests and service-level tests; schema tests alone cannot prove application invariants.
## Nonblocking execution
Policy adapters explicit unconfigured state; version immutable when approved, simulation inputs explicit, finalization fails closed. Biological deaths recorded at all ages; economic classification after day21 unresolved. Daily digest deterministic, no external send until channel and policy approved. Glass UI accessibility and role navigation; PWA no private cache. Object storage synthetic isolated zero-cost POC only. No new spend or production change.
## Infrastructure evidence reported
Vercel/Neon Frankfurt RTT p50 2.3ms vs 93.3ms, #91–95 merged as reported; #93 workflow requires repository configuration. 9/10 branches last reported, TTL 29 Nov. Object storage POC not yet reported. Global audit lock adequate for pilot based on synthetic benchmark, distributed anchoring remains proposal.
## Acceptance
For each finding attach exact source path/line, test command, commit, result, reviewer and residual risk. 27 reproduced defects reportedly fixed in target draft #84/#85, not production. Full PR82 reconciliation and canonical schema still pending. No tests independently run by ChatGPT.
