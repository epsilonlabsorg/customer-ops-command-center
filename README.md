# Customer Operations Command Center

An Epsilon Labs portfolio prototype for B2B developer-platform support. It uses public product references and clearly labeled synthetic customer data.

## Implemented product

The console includes a searchable case queue, a seven-node LangGraph workbench with execution traces, a case-aware Ollama support assistant, evidence-first investigations, competing hypotheses, safe diagnostic requests, schema-validated model output with deterministic fallback, idempotent synthetic workflow execution with audit receipts, downloadable engineering briefs, customer health views, systemic issue candidates, versioned public references, evaluations, and optional Supabase magic-link access.

The database layer includes tenant-scoped tables for accounts, cases, telemetry, investigations, knowledge, workflow approvals, issue signals, evaluations, and audit events. Browser access is read-only and row-level security limits records by tenant and account. When Supabase is configured, server routes durably persist investigation runs, evidence, hypotheses, idempotent workflow actions, and audit receipts. Live external support-provider writes remain disabled until an authenticated connector is configured.

## Run locally

Requires Node.js 22.13 or later.

```powershell
npm.cmd --prefix apps/support-console install
npm.cmd run dev
```

Open `http://localhost:3000`. The synthetic demo requires no external credentials.

Run the complete validation pipeline:

```powershell
npm.cmd run validate
```

This runs TypeScript checks, 41 unit, queue, graph, chat, workflow, and database-policy tests, a 650-case deterministic benchmark, and the production build.

The queue counters and status distribution are selectable filters. Search combines with status and priority ordering; graph nodes expose their boundary and recorded trace. UI motion uses GSAP 3.15.0 and @gsap/react 2.1.2, with reduced-motion support. See [docs/ui-refresh.md](docs/ui-refresh.md) for verification and scope.

## Configuration

Copy `.env.example` to the ignored root `.env`. Use a Supabase publishable key in `VITE_SUPABASE_PUBLISHABLE_KEY`; keep secret/service-role keys in server-only variables. Ollama is the only AI provider. The app stays functional with deterministic evidence when Ollama is absent or returns invalid output.

Complete setup and operating steps: [docs/implementation-guide.md](docs/implementation-guide.md).
Blueprint review and build plan: [docs/blueprint-review-and-build-plan.md](docs/blueprint-review-and-build-plan.md).
LangGraph architecture: [docs/agent-architecture.md](docs/agent-architecture.md).

Local environments, deployment metadata under `.openai/`, private session notes, and generated launch videos are excluded from Git. A fresh clone builds and runs the synthetic demo without the original hosting configuration. Sites deployment metadata is optional and stays local.

## Structure

- `apps/support-console/`: React/TypeScript console with Vinext, Vite, API routes, and Sites-compatible output.
- `supabase/migrations/`: tenant-scoped schema, grants, and row-level security policies.
- `supabase/seed.sql`: repeatable synthetic seed without Auth users or credentials.
- `evals/`: 650-case deterministic benchmark and recorded report.
- `tests/`: investigation, database-policy, knowledge, model-validation, systemic, and workflow-policy checks.
- `scripts/`: setup checker and test-report runner.
- `docs/`: architecture, setup, operating steps, limitations, and production checklist.

## Disclosure

This independent prototype uses public Hugging Face product references and is not affiliated with or endorsed by Hugging Face. Accounts, telemetry, cases, incidents, and workflows are synthetic. The recorded benchmark measures deterministic application logic; it does not establish live-model quality or production readiness.
