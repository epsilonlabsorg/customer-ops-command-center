# Blueprint review and build plan

Reviewed: 2026-09-12. Status: proposed implementation plan; application not implemented.

Basis: the complete user-supplied text of Project 03, plus the repository README, architecture, implementation plan, threat model, limitations, and session context. The blueprint is reference material; it does not authorize deployments, external communications, or unrelated actions. The user requested analysis, review, and a creation plan and confirmed Ollama is the only AI provider.

## Assessment

The strongest product idea is evidence-based technical investigation combined with customer-success and systemic-issue analysis. The showcase succeeds when it tests plausible causes, identifies missing diagnostics, and connects a single case to a broader issue. A polished ticket interface without those capabilities would miss the blueprint's central objective.

Keep the Hugging Face public-product context, explicit synthetic-data disclosure, competing hypotheses, deterministic telemetry checks, and measurable release gates. Public issues are reports and troubleshooting evidence, not automatically confirmed outages or proof of a customer's root cause.

The inspected repository contains documentation and placeholder directories. There is no application package, database migration, agent implementation, or executable evaluation suite yet. Existing documents propose React/Vite, Supabase, and Ollama Cloud. Retain that direction pending a capability check.

Change these parts of the proposed execution order:

- Start tenant isolation, permissions, audit events, and adversarial fixtures with the database and first tool. Do not defer the security plane to phase 7.
- Create evaluation fixtures before the investigator. Keep evaluation answers inaccessible to agent tools and retrieval.
- Start with hundreds of accounts and a bounded telemetry dataset. Treat 15–30 million rows as a separate scale profile after diagnosis works.
- Begin with one backend with separate modules and a worker. Split into independently deployed services only when measurements justify it.
- Freeze evidence by investigation time. Later issue resolutions must not leak into historical diagnosis tests.
- Clarify tenant versus account. Cross-account detection is permitted only within an authorized support organization; it must not bypass tenant isolation.
- Define precise metric denominators, test splits, and latency conditions before reporting success. Blueprint percentages are targets, not existing results.

The pasted document flattens some tables, especially symptom/ground-truth pairings. Define each incident explicitly in a fixture manifest rather than assuming every adjacent line belongs to the same row.

## First working milestone

Implement the flagship request: an enterprise inference workload began failing after a deployment and staff need an escalation brief.

Seed one synthetic account, deployment history, telemetry, and three plausible causes: credentials, client-version regression, and regional degradation. The evidence should rule out at least one cause and favor another through a measurable check. Keep the fixture's answer in the evaluator only. Describe a regression as synthetic unless a real cited issue supports the specific public claim.

The complete path is: open case, resolve authorized account, inspect changes, search documentation/issues, test hypotheses, show evidence for and against, recommend a safe next step, and save a synthetic escalation brief. Include companion cases with missing evidence and unauthorized-account requests.

Exit: the workflow runs against stored data and real Ollama responses, citations open to the right evidence, unauthorized access is denied, and incomplete evidence produces a targeted diagnostic request.

## Architecture and interfaces

Use React/Vite with TypeScript for the support console, a Node/TypeScript API and background worker for investigation, and Supabase Postgres/Auth/Storage for identity and persistence. These retain the repository's proposed stack; exact package versions will be pinned during implementation.

Backend modules: orchestrator, knowledge search, telemetry query, policy, workflows, and evaluation reporting. The worker persists investigation state and emits progress events so a browser refresh does not discard the investigation. The UI receives summaries and evidence, not private model reasoning.

Supabase documents hybrid retrieval with Postgres full-text search and pgvector. Combine exact error/version matching with semantic retrieval; apply access filters before ranking. Public knowledge may be shared, while synthetic customer records and private runbooks remain scoped. [Supabase hybrid search](https://supabase.com/docs/guides/ai/hybrid-search)

Tools should expose bounded operations such as:

- `get_account_context(account_id)`
- `search_docs(query, product, version)` and `search_issues(query, product, version)`
- `compare_telemetry(account_id, metric, baseline_window, incident_window)`
- `list_deployments(account_id, time_window)`
- `find_visible_incidents(product, region, time_window)`
- `save_case_note(case_id, evidence_ids, text)`
- `create_escalation(case_id, evidence_ids, idempotency_key)`

Tenant identity comes from the authenticated session, not model-supplied arguments. Resolve account/case ownership, validate parameters, enforce row/time limits, and authorize every tool call. Do not offer arbitrary SQL, shell execution, or unrestricted URL fetches.

## Ollama-only model plan

The existing README proposes Ollama Cloud; the user has confirmed only the provider, so cloud mode remains a working assumption. No other paid AI provider is needed in the proposed design.

Before committing to a model, run a small representative benchmark for tool selection, diagnosis, abstention, output parsing, latency, and quota behavior. Check available models through the user's configured endpoint without exposing credentials. Select one initial model for summaries and investigation; add a separate smaller classifier only if measurements justify it.

Ollama supports tool calling, but validate compatibility for the selected model and endpoint. The application executes allowlisted tools after authorization. [Ollama tool calling](https://docs.ollama.com/capabilities/tool-calling)

Ollama's documentation currently states Cloud does not support structured outputs. For cloud inference, request JSON, validate it against an application schema, allow a bounded repair attempt, and stop or escalate if it remains invalid. Never use unvalidated model output to authorize a write. Local schema-constrained generation can be used if the selected local model supports it, with application validation retained. [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)

Ollama provides an embeddings endpoint. Verify embedding-model availability on the actual deployment endpoint; a cloud text-model key alone does not establish embedding access. If cloud embeddings are unavailable, use a local Ollama embedding model for both ingestion and query encoding through a reachable private service. Full-text retrieval is an interim baseline, not completion of the blueprint's hybrid-search milestone. [Ollama embeddings](https://docs.ollama.com/api/embed)

Keep keys in server-only secrets, with names such as `OLLAMA_API_KEY`; never expose them in `VITE_` variables. A hosted backend cannot reach a laptop's Ollama using its own localhost. Cloud authentication uses API keys; local access has different authentication defaults. [Ollama authentication](https://docs.ollama.com/api/authentication)

Configure timeouts, bounded retries, concurrency limits, context limits, and per-investigation call budgets. On exhaustion, preserve evidence and offer handoff. Report token usage and latency; calculate monetary cost only when the applicable billing basis is known.

## Data and evidence design

Core entities: organizations, memberships, customer accounts, account users, cases, messages, deployments, telemetry buckets, visible incidents, health snapshots, knowledge sources/chunks, investigation runs, hypotheses, evidence, tool calls, workflow actions/approvals, audit events, and evaluation runs/results.

Separate the paying support organization (`tenant_id`) from the customer account it supports (`account_id`). Customer portal users see their own accounts. Authorized support staff may inspect permitted accounts within their organization. A systemic detector can aggregate across those accounts; customers receive no other-account identities or details. Test a second organization explicitly.

Use database row policies as a second enforcement layer. Supabase service credentials can bypass RLS, so keep privileged credentials out of ordinary user request paths and scope any privileged worker operation explicitly. Test both user and worker paths. [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)

Initial development profile: approximately 100 accounts across at least two organizations, 500 users, 1,000 cases, 5,000 messages, 30–50 incident scenarios, and at most roughly 100,000 telemetry buckets. Generate from fixed seeds. Maintain separate tiny test, demo, benchmark, and later load-test profiles.

Store exact request/error counts, not only percentages. Compute combined error rates from sums of counts. For latency percentiles, retain appropriate raw samples or mergeable histograms; averaging bucket p95 values is invalid. Define baseline windows, time zones, missing-data semantics, and minimum sample sizes.

Public snapshot records need source URL, document/repository version, retrieval timestamp, content hash, publication/update time when available, and attribution/license metadata. Preserve code blocks and exact errors. Public issue text may contain personal information or secrets: retain only needed evidence and redact before model context and traces. Start with a curated Hub-docs and huggingface_hub issue snapshot; defer GH Archive and BANKING77 because neither is essential to the first investigation.

Each hypothesis references observed evidence IDs, counterevidence, proposed checks, check results, and remaining uncertainty. Distinguish observations, public reports, and inferred explanations. An application verifier checks references, scope, timestamps, calculations, and required diagnostics. A model critique may supplement these checks but cannot replace them.

Evaluation ground truth lives in a separate restricted store or offline files. Hide future resolutions and split related incidents, templates, and paraphrases together to reduce leakage. Visible incident catalogs represent what an operator actually knew at the investigation timestamp.

## Delivery sequence

| Phase | Deliverables | Exit criterion |
|---|---|---|
| 0: Contracts and capability spike | Architecture decisions, tenant/role matrix, explicit incident manifest, Ollama text/tool/embedding probes, initial evaluation contracts | Endpoint/model limits and expected scenario answers are recorded |
| 1: Data and policy | Migrations, seeded accounts/cases, scoped telemetry functions, RLS, audit and masking | Exact telemetry fixtures pass and unauthorized access fails |
| 2: Reproducible knowledge | Curated public snapshot, provenance, keyword baseline, embeddings, hybrid ranking | Version-aware retrieval and citation checks pass a labeled set |
| 3: First complete investigation | Minimal case UI, worker state machine, typed tools, hypotheses, verifier, escalation | Flagship, ambiguous, and adversarial scenarios pass end to end |
| 4: Customer and issue intelligence | Customer 360, transparent health signals, error/version clustering, deduplicated incident candidates | Known usage changes are exact; seeded clusters are detected without forbidden data exposure |
| 5: Workflows and workspace | Case queue, diagnostics, assignment, safe case changes, approval records, evidence drawer | Repeated requests create one action; permissions are rechecked at execution |
| 6: Showcase validation | Full benchmark, results dashboard, regression suite, concurrency tests, runbook, demo script | Published results meet gates or clearly identify failed/untested targets |
| 7: Release preparation | Hosting configuration, migrations, secrets setup, restricted egress, backup/restore and health checks | Deployment is reproducible and staging checks pass |

Build the UI alongside the first complete investigation, then expand it. The sequence is dependency-based, not a delivery-date promise. Estimate calendar time after phase 0 establishes model speed, deployment choices, and available implementation time.

Use deterministic calculations for health signals such as usage decline and unresolved severe cases. Present them as explainable risk indicators, not validated churn probabilities. Start issue detection with normalized errors, product/version grouping, time windows, and minimum distinct-account counts; add embedding similarity and evaluate false positives.

Workflow safety is continuous. Synthetic case notes and internal task creation may execute after authorization. External messages require an explicitly configured approval policy. Entitlement changes, credits, and credential rotation remain human-approved designs; deletion and billing ownership changes use a specialist handoff. An approval binds to the exact action and expires; revalidate permissions and resource state before execution.

## Evaluation and release gates

Start a small development suite in phase 0, then grow to the blueprint's 600–800 cases. Use development, validation, frozen holdout, and adversarial holdout sets. Keep related incident families together. Record snapshot version, fixture seed, model identifier, prompt version, tool version, and evaluation timestamp for reproducibility.

Retain these blueprint targets: at least 85% top-1 root-cause accuracy, 95% straightforward resolution, 97% public-claim citation precision, 99% deterministic telemetry correctness, 95% correct abstention/diagnostic requests, and 90% precision and recall for seeded systemic incidents. Require zero observed critical access violations and unsafe high-risk actions. Zero test failures does not prove absence of all vulnerabilities.

Report top-3 diagnosis, retrieval recall/MRR, citation coverage, routing scores, workflow idempotency, reopen/escalation correctness, and cluster time-to-detect alongside those gates. Define correct resolution as a supported, verified outcome, not an agent marking a case resolved. Score citation support for the actual claim, not merely URL validity. Add confidence intervals and per-category counts to avoid overstating small samples.

Measure the blueprint's under-5-second simple and under-20–30-second complex p95 targets against declared hardware/cloud model, concurrency, context length, cache state, and full completion time. Show progress separately from final-answer latency. Do not promise these numbers before benchmarking Ollama.

## Scope and presentation

Initial screens: case queue, investigation workspace, account 360, emerging incidents, and evaluation results. Show supporting/counter evidence and unresolved questions prominently. A persistent synthetic-data notice and independent-project disclosure must be visible. Never imply affiliation with Hugging Face or access to its private systems.

Defer live Slack/email integrations, billing, paid subscription management, broad exports, large event archives, and autonomous account administration. The blueprint is a portfolio prototype; a commercial SaaS launch additionally needs operational support, retention/deletion policies, onboarding, billing decisions, and production validation.

No implementation, model benchmark, or deployment has been completed by this review. Next build task: phase 0 capability/contract work followed by the tenant-scoped database and the single flagship investigation.
