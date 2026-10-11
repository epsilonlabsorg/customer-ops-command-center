# Customer Operations Command Center - operations guide

This Site is an independent portfolio prototype. Hugging Face documentation and public issue history are public references. Customer accounts, cases, telemetry, incidents, and workflow effects are synthetic.

## End-to-end flow

1. A support engineer selects a seeded case in **Support assistant**.
2. The chat API validates the case ID, message, and bounded six-message history.
3. The LangGraph workflow authorizes the synthetic tenant scope, calculates telemetry, tests competing hypotheses, retrieves bounded public references, and evaluates the proposed action.
4. Ollama receives only the verified investigation result and reference metadata. Ticket and chat text remain untrusted data.
5. The response must pass a strict schema. Unknown reference IDs are removed. Provider errors, invalid JSON, timeouts, and exhausted transient retries use a deterministic evidence response.
6. The engineer can run the recommended synthetic workflow.
7. Policy code evaluates the risk tier outside the model. The executor creates an idempotent action record and audit receipt. No external customer system is modified.
8. Supabase stores the investigation run, evidence, hypotheses, workflow action, and audit receipt. Without credentials, the same demo falls back to runtime memory.

## Required local variables

The root .env is ignored. For direct Ollama Cloud access use:

~~~dotenv
OLLAMA_API_KEY=replace_with_a_current_key
OLLAMA_BASE_URL=https://ollama.com/api
OLLAMA_MODEL=gpt-oss:20b
~~~

The Cloudflare Vite worker loads local server secrets from the ignored app-level .dev.vars. Keep these files out of Git. The hosted Site receives the same values through the Sites runtime environment store.

Supabase remains optional until a project exists:

~~~dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_BROWSER_KEY
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_KEY
~~~

Never put the server key or Ollama key in a VITE_ variable.

## Run in WSL

~~~bash
cd customer-ops-command-center
npm install
npm --prefix apps/support-console install
npm run dev
~~~

Open the URL printed by Vinext, normally http://localhost:3000. Use npm in WSL, not npm.cmd.

## Run in Windows PowerShell

~~~powershell
cd customer-ops-command-center
npm.cmd --prefix apps/support-console install
npm.cmd run dev
~~~

## Validate

~~~bash
npm run setup:check
npm run check
npm test
npm run eval
npm run build
~~~

The regression suite covers graph scope, diagnosis, abstention, database policies, prompt injection boundaries, structured Ollama output, reference filtering, workflow policy, and action idempotency. The deterministic benchmark covers 650 cases.

## API examples

Run a grounded chat turn:

~~~bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"caseId":"CS-1042","message":"What changed after deployment?","history":[]}'
~~~

Run the recommended synthetic workflow using the returned run ID:

~~~bash
curl -X POST http://localhost:3000/api/workflows/execute \
  -H 'Content-Type: application/json' \
  -d '{"caseId":"CS-1042","actionType":"engineering_handoff","confirmed":true,"idempotencyKey":"RUN_ID:engineering_handoff"}'
~~~

Other routes:

- GET /api/health
- GET /api/knowledge?q=authentication&product=Hub
- GET /api/agents/run
- POST /api/agents/run
- POST /api/investigate
- POST /api/workflows/propose

## Supabase verification

The hosted project has three migrations and the repeatable synthetic seed applied. Server-side persistence uses the secret key; the browser never receives it.

~~~bash
npx supabase@latest migration list
npm run smoke:supabase
~~~

The smoke test must report `chatPersistence: supabase`, `workflowPersistence: supabase`, and `auditCreated: true`.

Remaining production integrations:

1. Create Supabase Auth users and trusted organization memberships before enabling browser reads.
2. Verify tenant and account RLS with at least two authenticated users.
3. Add a Postgres LangGraph checkpointer when conversations must resume across deployments.
4. Revalidate role, action digest, approval expiry, and resource version before any real external write.
5. Add an authenticated support-provider connector for ticket notes, tags, or escalations.

The current environment uses only synthetic customer data. Investigations and workflow receipts are durable; no external customer system is modified.
