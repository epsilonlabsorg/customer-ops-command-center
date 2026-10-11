-- Investigation, evidence, workflow, knowledge, and evaluation plane.
begin;

create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id),
  source_key text not null,
  source_type text not null check (source_type in ('documentation','issue','runbook','incident')),
  title text not null,
  source_url text not null,
  snapshot_at timestamptz not null,
  content_hash text not null,
  is_public boolean not null default false,
  unique (tenant_id,source_key),
  unique (tenant_id,id)
);
create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  source_id uuid not null,
  ordinal integer not null check (ordinal >= 0),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  foreign key (tenant_id,source_id) references public.knowledge_sources(tenant_id,id),
  unique (source_id,ordinal)
);
create table public.investigation_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  account_id uuid not null,
  case_id uuid not null,
  status text not null check (status in ('queued','running','needs_diagnostics','probable_cause','verified','failed')),
  model_provider text,
  model_name text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (tenant_id,account_id,id),
  foreign key (tenant_id,account_id,case_id) references public.support_cases(tenant_id,account_id,id)
);
create table public.investigation_evidence (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  account_id uuid not null,
  run_id uuid not null,
  evidence_key text not null,
  evidence_type text not null check (evidence_type in ('telemetry','deployment','account','documentation','issue','incident','diagnostic')),
  observation text not null,
  source_url text,
  observed_at timestamptz,
  unique (run_id,evidence_key),
  foreign key (tenant_id,account_id,run_id) references public.investigation_runs(tenant_id,account_id,id)
);
create table public.investigation_hypotheses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  account_id uuid not null,
  run_id uuid not null,
  title text not null,
  rank smallint not null check (rank between 1 and 10),
  status text not null check (status in ('supported','weakened','unresolved','rejected')),
  evidence_for jsonb not null default '[]'::jsonb,
  evidence_against jsonb not null default '[]'::jsonb,
  unique (run_id,rank),
  foreign key (tenant_id,account_id,run_id) references public.investigation_runs(tenant_id,account_id,id)
);
create table public.workflow_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  account_id uuid not null,
  case_id uuid not null,
  action_type text not null check (action_type in ('case_note','diagnostic_request','engineering_handoff','csm_task','incident_candidate','entitlement_change','credit','credential_rotation')),
  risk_tier text not null check (risk_tier in ('low','medium','high','critical')),
  status text not null check (status in ('proposed','approved','executed','denied','cancelled','failed')),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  requested_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  executed_at timestamptz,
  unique (tenant_id,idempotency_key),
  foreign key (tenant_id,account_id,case_id) references public.support_cases(tenant_id,account_id,id)
);
create table public.workflow_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id),
  action_id uuid not null references public.workflow_actions(id),
  approver_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approved','denied')),
  action_digest text not null,
  expires_at timestamptz not null,
  decided_at timestamptz not null default now(),
  unique (action_id,approver_id)
);
create table public.issue_signals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id),
  signal_key text not null,
  product text not null,
  version text,
  normalized_error text not null,
  distinct_accounts integer not null check (distinct_accounts >= 0),
  case_count integer not null check (case_count >= distinct_accounts),
  status text not null check (status in ('insufficient','candidate','confirmed','dismissed')),
  detected_at timestamptz not null default now(),
  unique (tenant_id,signal_key)
);
create table public.evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id),
  suite text not null,
  model_name text,
  fixture_version text not null,
  prompt_version text,
  total integer not null check (total >= 0),
  passed integer not null check (passed >= 0 and passed <= total),
  failed integer generated always as (total-passed) stored,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.investigation_runs enable row level security;
alter table public.investigation_evidence enable row level security;
alter table public.investigation_hypotheses enable row level security;
alter table public.workflow_actions enable row level security;
alter table public.workflow_approvals enable row level security;
alter table public.issue_signals enable row level security;
alter table public.evaluation_runs enable row level security;

create policy knowledge_sources_read on public.knowledge_sources for select to authenticated using (private.is_staff(tenant_id));
create policy knowledge_chunks_read on public.knowledge_chunks for select to authenticated using (private.is_staff(tenant_id));
create policy investigation_runs_read on public.investigation_runs for select to authenticated using (private.can_access_account(tenant_id,account_id));
create policy investigation_evidence_read on public.investigation_evidence for select to authenticated using (private.can_access_account(tenant_id,account_id));
create policy investigation_hypotheses_read on public.investigation_hypotheses for select to authenticated using (private.can_access_account(tenant_id,account_id));
create policy workflow_actions_read on public.workflow_actions for select to authenticated using (private.can_access_account(tenant_id,account_id));
create policy workflow_approvals_read on public.workflow_approvals for select to authenticated using (private.is_staff(tenant_id));
create policy issue_signals_read on public.issue_signals for select to authenticated using (private.is_staff(tenant_id));
create policy evaluation_runs_read on public.evaluation_runs for select to authenticated using (private.is_staff(tenant_id));

revoke all on public.knowledge_sources,public.knowledge_chunks,public.investigation_runs,public.investigation_evidence,public.investigation_hypotheses,public.workflow_actions,public.workflow_approvals,public.issue_signals,public.evaluation_runs from anon,authenticated;
grant select on public.knowledge_sources,public.knowledge_chunks,public.investigation_runs,public.investigation_evidence,public.investigation_hypotheses,public.workflow_actions,public.workflow_approvals,public.issue_signals,public.evaluation_runs to authenticated;
grant all on public.knowledge_sources,public.knowledge_chunks,public.investigation_runs,public.investigation_evidence,public.investigation_hypotheses,public.workflow_actions,public.workflow_approvals,public.issue_signals,public.evaluation_runs to service_role;

create index knowledge_sources_tenant on public.knowledge_sources(tenant_id,source_type);
create index knowledge_chunks_source on public.knowledge_chunks(tenant_id,source_id,ordinal);
create index investigation_runs_case on public.investigation_runs(tenant_id,account_id,case_id,started_at);
create index investigation_evidence_run on public.investigation_evidence(tenant_id,account_id,run_id);
create index investigation_hypotheses_run on public.investigation_hypotheses(tenant_id,account_id,run_id,rank);
create index workflow_actions_case on public.workflow_actions(tenant_id,account_id,case_id,requested_at);
create index issue_signals_tenant on public.issue_signals(tenant_id,status,detected_at);
create index evaluation_runs_tenant on public.evaluation_runs(tenant_id,created_at);

commit;
