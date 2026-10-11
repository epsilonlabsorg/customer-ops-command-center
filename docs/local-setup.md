# Local setup

Use Node.js 22.13 or later. From the repository root:

```powershell
npm.cmd --prefix apps/support-console install
npm.cmd run dev
```

Open `http://localhost:3000`. The synthetic demo works without credentials. The app runs deterministic evidence checks for every investigation and can optionally add an Ollama-generated communication draft.

## Supabase

In Supabase, copy the project URL and publishable key from the Connect dialog or **Settings > API Keys**. New projects should use publishable and secret keys. See the [official API key guide](https://supabase.com/docs/guides/getting-started/api-keys).

Set values in the ignored repository-root `.env`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_VALUE
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_VALUE

OLLAMA_API_KEY=YOUR_REPLACEMENT_KEY
OLLAMA_BASE_URL=https://ollama.com/api
OLLAMA_MODEL=gpt-oss:20b-cloud
```

Never place a Supabase secret/service-role key or an Ollama key in a `VITE_` variable. Legacy Supabase projects may use `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` instead.

Apply these SQL files in order:

1. `supabase/migrations/202609120001_foundation.sql`
2. `supabase/migrations/202609120002_operations.sql`
3. `supabase/migrations/202609210001_workflow_policy_alignment.sql`
4. `supabase/seed.sql`

The seed creates no Auth users. Create a user in Supabase Auth and add that user UUID to `organization_memberships` through a trusted administration path. The exact SQL example is in [implementation-guide.md](implementation-guide.md).

## Validation

```powershell
npm.cmd run setup:check
npm.cmd run check
npm.cmd test
npm.cmd run eval
npm.cmd run build
```

`npm.cmd run validate` runs the last four validation stages together. The current recorded result is 41 of 41 tests passing and a 650-case deterministic benchmark passing its fixture labels with zero critical security-policy violations.

The benchmark does not measure live Ollama accuracy, embedding retrieval, production latency, provider cost, or hosted Supabase configuration. Complete operating steps and the production checklist are in [implementation-guide.md](implementation-guide.md).
