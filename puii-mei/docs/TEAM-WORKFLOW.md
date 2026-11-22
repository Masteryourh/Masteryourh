# PUII MEI — TEAM WORKFLOW

**Version:** 1.0 proposal | **Status:** Draft pending Product Owner approval  
**Participants:** Product Owner (human), ChatGPT (business/system architecture and independent review), Claude Code (implementation and technical testing).  
**Source of truth:** GitHub repository `Masteryourh/Masteryourh`. This document governs collaboration; it does not authorize deployments or change legal responsibilities.

## 1. Responsibilities and decision rights

| Role | Owns | Cannot do without approval |
|---|---|---|
| Product Owner | Vision, business rules, scope, priorities, acceptance, release decisions | Delegate accountability for legal/regulatory compliance to AI |
| ChatGPT | Business analysis, requirements, system design, ADR proposals, acceptance criteria, review of code and test evidence | Unilaterally approve commercial/legal assumptions or declare unexecuted tests passed |
| Claude Code | Code, migrations, automated tests, CI, technical implementation notes, PRs | Change approved business rules, merge high-risk changes, deploy to production or bypass review |

The Product Owner has final product authority. Qualified legal, accounting and veterinary professionals retain authority in their regulated domains.

## 2. Communication contract

GitHub Issues, Markdown specifications, ADRs, commits, CI runs and PRs are the coordination mechanism. **The assistants do not communicate directly or continuously merely because both have GitHub access.** Each reads the latest GitHub state when asked or when executing an assigned task.

- One GitHub Issue per deliverable, with an owner and acceptance criteria.
- One implementation PR per coherent change; link the Issue and specification version.
- Avoid parallel edits to the same files; resolve collisions via PR review, not silent overwrite.
- Product Owner approval is required for scope changes, contracts, money flows, authorization, production migrations and releases.

## 3. Standard task lifecycle

1. **Product decision:** Product Owner states objective and constraints.
2. **Specification:** ChatGPT documents requirements, business invariants, data contracts, permissions, edge cases, nonfunctional requirements, test plan and open questions.
3. **Approval:** Product Owner accepts the specification or requests revisions. Unresolved blocking decisions stop implementation.
4. **Implementation:** Claude Code creates a feature branch, implements minimal scoped changes, writes tests, runs checks and opens PR.
5. **Technical evidence:** Claude Code attaches executed commands, exit codes, CI links, test results, migration/rollback notes, risks and deviations from spec.
6. **Independent review:** ChatGPT examines the actual diff and evidence, verifies against acceptance criteria and records blocking/nonblocking findings.
7. **Decision:** Product Owner approves merge and deployment. A merge is not a production deployment.
8. **Post-merge:** Monitor, document operational behavior, record incidents and update relevant docs.

## 4. Required Issue template

```md
# [AREA] Deliverable title
Business objective:
Source / approved specification:
In scope:
Out of scope:
Actors and permissions:
Domain invariants:
Data model / migrations:
API / UI contract:
Edge cases and failure modes:
Security / privacy implications:
Acceptance criteria (testable):
Required automated tests:
Dependencies and open decisions:
Assigned implementation owner:
```

## 5. Required implementation PR report

```md
## Scope and linked Issue
## Changes made
## Deviations from approved specification
## Files and migrations changed
## Tests executed (command, environment, exit code, result)
## Tests NOT executed and why
## Security, privacy and data-integrity impact
## Migration / rollback / backup plan
## Screenshots or API evidence (if applicable)
## Known limitations
## Reviewer checklist
```

Never report “all tests pass” unless the commands ran successfully. Missing dependencies, missing environment, skipped tests and failed tests are separate outcomes.

## 6. Merge and deployment gates

- **Docs-only:** scope check, internal consistency, no unapproved legal assertions; Product Owner can approve.
- **Ordinary code:** linked approved spec, PR review, typecheck, lint, build, relevant unit/integration tests, no unresolved blocking issues.
- **Sensitive code (auth, finance, orders, inventory, contracts, traceability):** above plus authorization tests, concurrent-operation/idempotency tests where relevant, DB migration/rollback review and explicit Product Owner approval.
- **Production deployment:** separate approval, current backup, health checks, monitoring, rollback path and release note.
- Never put credentials, client personal data or production secrets in Issues, logs or PRs.

## 7. Source-of-truth hierarchy and conflict resolution

1. Applicable law and validated regulatory requirements.
2. Explicit Product Owner decisions captured in ADRs.
3. Approved System Constitution and business architecture.
4. Approved feature specifications and API/data contracts.
5. Implemented code and verified test results (descriptive evidence, not authority to override requirements).
6. Exploratory notes, drafts and chat discussions.

If two sources conflict, open an ADR or Issue and stop the affected implementation. Do not silently reconcile.

## 8. Architecture and safety principles

- Modular monolith first; boundaries between domains are explicit.
- PostgreSQL relational source of truth, atomic transactions, idempotency, immutable audit evidence and least-privilege access.
- Farm-level and object-level authorization on the server.
- Private file storage, secure secrets, verified TLS, tested backup/restore.
- AI agents operate with scoped permissions and auditable human approval for money, contracts and food-safety decisions.
- Do not assume that a static audit certifies production readiness.

## 9. First backlog, proposed order

**DOC-001:** Review and approve `docs/architecture/00-SYSTEM-CONSTITUTION.md` (PR #44), especially open legal and financial decisions.

**BUS-001:** Produce `01-BUSINESS-ARCHITECTURE.md`: contractual actors, ownership, money flow, mandates, producer responsibilities, compliance dependencies.

**SEC-001 (P0):** Remove insecure database TLS verification bypass and session-secret fallback; add tests.

**DATA-001 (P0):** Design relational PostgreSQL migration, integrity constraints, transactional allocation, idempotency and data reconciliation.

**QA-001 (P0):** Establish reproducible `npm ci`, lint, typecheck, build, unit/integration/E2E CI. Report actual execution.

These are proposed tasks, not claims of implementation.

## 10. Definition of Done

A task is done only when the agreed acceptance criteria are satisfied, required tests were executed and documented, security/data effects reviewed, docs updated, PR approved and merged. “Deployed” is a separate status requiring deployment verification.

## 11. Versioning

Changes to this workflow require a PR and Product Owner approval. Preserve decisions as ADRs; reference the relevant version in implementation Issues.
