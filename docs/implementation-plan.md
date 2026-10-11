# Implementation Plan

## Phase 1 - Project Skeleton

- Create repo structure.
- Define data model.
- Write disclosure and limitations.
- Prepare initial synthetic dataset plan.

## Phase 2 - Database

- Add Supabase migrations for accounts, users, cases, messages, API events, deployments, incidents, and health snapshots.
- Add seed scripts for synthetic data.
- Add Row Level Security from the start.

## Phase 3 - Support Console

- Build case queue, case detail, account 360, evidence panel, and workflow actions.
- Keep the first UI demo read-only except safe synthetic actions.

## Phase 4 - Agent Backend

- Add server-side Ollama calls.
- Add retrieval over docs/issues and synthetic records.
- Add structured hypothesis generation and verifier checks.

## Phase 5 - Evaluation

- Add golden diagnosis fixtures.
- Add retrieval, telemetry, abstention, security, and workflow tests.
- Expose evaluation results in a demo dashboard.

## Phase 6 - Portfolio Demo

- Add public demo script.
- Add website case-study copy.
- Link the project from the Epsilon Labs portfolio site.
