# Architecture

## Product Type

AI Customer Operations Command Center for B2B SaaS and developer-platform support.

The system should act like a senior technical support engineer plus customer-success analyst, not a basic FAQ chatbot.

## Core Loop

```text
customer problem
-> classify product, severity, environment
-> resolve account and entitlement
-> retrieve docs and known issues
-> query synthetic telemetry and incidents
-> generate competing hypotheses
-> test hypotheses with deterministic checks
-> rank by evidence
-> propose safe remediation or escalate
```

## Major Components

- Support console: human-facing workspace for cases, account context, evidence, and workflow actions.
- Case intelligence: intent, severity, product, entities, duplicate detection, summarization.
- Knowledge search: public docs, public issues, synthetic runbooks, and incident records with provenance.
- Telemetry query: scoped synthetic account usage, errors, latency, deployments, and health signals.
- Policy engine: tenant isolation, RBAC, field masking, action approval, audit logging.
- Workflow tools: case updates, diagnostics requests, escalation briefs, CSM tasks.
- Evaluation: diagnosis accuracy, retrieval quality, telemetry correctness, security bypasses, latency.

## Data Boundary

Public docs and public issue history may be real. Customer accounts, telemetry, tickets, contracts, incidents, and support workflows must be synthetic unless we have explicit permission and a production data agreement.
