# Implementation and operating guide

This repository implements a portfolio-grade synthetic customer-operations command center. Public Hugging Face pages are references. Accounts, cases, telemetry, incidents, and workflows are synthetic.

## Implemented product

- Searchable six-case support queue and case drawer.
- Weighted request/error calculations with overflow and empty-window checks.
- Competing hypotheses for client regression, invalid credentials, and regional degradation.
- Targeted diagnostic requests when the evidence cannot isolate one cause.
- Optional Ollama communication drafts after deterministic checks.
- A case-aware support chatbot that runs the same graph, validates model output, filters invented reference IDs, and falls back to deterministic evidence.
- Strict validation, timeout, and deterministic fallback for model output.
- Versioned public reference catalog and keyword-search API.
- Explainable customer-health signals and multi-account issue candidates.
- Risk-tier workflow policy plus a confirmed, idempotent synthetic executor with audit receipts.
- Tenant-scoped Supabase schema, read-only browser grants, row policies, audit records, approvals, and idempotency keys.
- A seven-node LangGraph workflow with visible traces and optional Ollama drafting.
- A 650-case deterministic benchmark plus unit and database-policy tests.
- Responsive Epsilon Labs dashboard theme and private Sites configuration.

## 1. Prerequisites

Install Node.js 22.13 or newer. Create a Supabase project only when you want live authentication and database reads. Create a replacement Ollama API key because any key pasted into chat should be revoked.

Install dependencies:

```powershell
npm.cmd --prefix apps/support-console install
```

## 2. Environment variables

Copy `.env.example` to the ignored root `.env`. The console loads this file through the Vite `envDir` setting.

```dotenv
VITE_APP_NAME="Customer Operations Command Center"
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_VALUE
VITE_SUPABASE_ANON_KEY=

SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_VALUE
SUPABASE_SERVICE_ROLE_KEY=

OLLAMA_API_KEY=YOUR_REPLACEMENT_KEY
OLLAMA_BASE_URL=https://ollama.com/api
OLLAMA_MODEL=gpt-oss:20b-cloud
```

Use the same Supabase URL in the browser and server URL fields. New projects should use the publishable and secret keys. Legacy projects may use the anon and service-role fields. Never place a secret or service-role key in a `VITE_` variable.

Check presence without printing values or making network requests:

```powershell
npm.cmd run setup:check
```

## 3. Supabase database

Apply migrations in order:

1. `supabase/migrations/202609120001_foundation.sql`
2. `supabase/migrations/202609120002_operations.sql`
3. `supabase/migrations/202609210001_workflow_policy_alignment.sql`
4. `supabase/seed.sql`

For a hosted project, use the Supabase SQL editor or a reviewed CLI migration workflow. The seed creates synthetic records but intentionally creates no Auth users or memberships.

Create a user through Supabase Auth. Then associate the Auth user UUID with the demo organization from a trusted administration path:

```sql
insert into public.organization_memberships (tenant_id, user_id, role)
values (
  '10000000-0000-4000-8000-000000000001',
  'REPLACE_WITH_AUTH_USER_UUID',
  'support'
);
```

Do not expose a public endpoint that lets a user assign their own role. The browser receives read-only table grants. Server secrets bypass row-level security and must stay inside trusted server jobs.

## 4. Ollama

The server route `POST /api/investigate` accepts only a seeded case ID and a Boolean model flag. It runs deterministic checks first. When Ollama is configured, it sends only the verified synthetic result to `OLLAMA_BASE_URL/chat`.

The direct Ollama Cloud model is `gpt-oss:20b`; the adapter also normalizes the local CLI alias `gpt-oss:20b-cloud`. Change `OLLAMA_MODEL` if your account uses another compatible model. Model responses must match the application schema. Invalid JSON, missing fields, timeouts, and provider errors produce a safe deterministic result without model text.

Test the route without consuming model usage:

```powershell
$body = '{"caseId":"CS-1042","useModel":false}'
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/investigate -ContentType application/json -Body $body
```

After replacing the exposed key, set `useModel` to `true` or click **Run investigation** in the console.

## 5. Run and validate

```powershell
npm.cmd run dev
npm.cmd run check
npm.cmd test
npm.cmd run eval
npm.cmd run build
```


`npm test` executes 41 calculation, authorization, database-policy, queue, knowledge, model-validation, grounded-chat, action-idempotency, and workflow-policy tests.
`npm run eval` runs the 650-case deterministic benchmark.
`npm run build` creates the Cloudflare-compatible worker output, with optional local Sites metadata.

The benchmark is deliberately labeled deterministic. It does not claim Ollama diagnosis accuracy, retrieval recall, citation precision, production latency, or production security assurance.

## 6. Demo walkthrough

1. Open **Overview** and select case `CS-1042`.
2. Run the investigation.
3. Review the evidence overview, request counts, client comparison, credential probe, and regional control.
4. Inspect evidence for and against each hypothesis.
5. Review the safe next step and public references.
6. Open **Support assistant**, ask what changed, and review the grounded Ollama answer, graph steps, confidence, and references.
7. Run the recommended synthetic workflow and inspect its audit receipt.
8. Stage and download the synthetic engineering handoff.
9. Open `CS-1038` to see correct abstention.
10. Open **Customer 360** for explainable health signals.
11. Open **Emerging issues** to see candidates that still require version and error checks.
12. Open **Evaluations** for test and benchmark scope.
13. Open **Connections** to test Supabase magic-link access after migrations and memberships exist.

## 7. LangGraph agents

The investigation API and Agent graph workspace use the same request-scoped LangGraph. It verifies scope, calculates telemetry, tests competing causes, retrieves public references, evaluates the action boundary, optionally drafts through Ollama, and returns a node trace. See [agent-architecture.md](agent-architecture.md) for node contracts and the production checkpoint design.

## 8. API surface

- `GET /api/health`: configuration booleans and data-boundary status; never returns secrets.
- `GET /api/knowledge?q=...&product=...`: bounded keyword search across curated references.
- POST /api/investigate: LangGraph investigation plus optional validated Ollama draft.
- `POST /api/chat`: case-aware conversation grounded in the deterministic graph and bounded references.
- `POST /api/workflows/execute`: confirmed, policy-checked, idempotent synthetic action with an audit receipt.
- GET /api/agents/run: graph topology and runtime metadata.
- POST /api/agents/run: full graph execution with trace, policy, evidence, and references.
- `POST /api/workflows/propose`: evaluates a synthetic action but never executes or persists it.

The synthetic executor completes the portfolio workflow without touching an external customer system. Supabase-backed durability, real authenticated connector writes, approval expiry, and resource-version revalidation remain pending project credentials.

## 9. Production completion checklist

Before presenting this as production software:

- Replace the leaked Ollama key.
- Apply migrations to a dedicated Supabase project and verify policies with real Auth users.
- Configure hosted runtime secrets; do not bundle them.
- Add versioned document ingestion, embeddings, and measured hybrid retrieval.
- Run a separate live-model evaluation and report its failures.
- Add queue-backed long investigations, retry budgets, and persistent progress.
- Add approved server-side workflow writes with audit events.
- Add backup/restore, retention/deletion, rate limits, alerting, and incident response.
- Measure p50/p95 latency and provider cost under declared concurrency.
- Complete browser accessibility and responsive-device QA.

The current repository is a complete working portfolio prototype with optional external integrations. It is not a production customer-data system.
