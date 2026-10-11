-- Initial read-only customer operations schema. All records in this prototype are synthetic.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
create table public.organization_memberships (
  tenant_id uuid not null references public.organizations(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('admin','support','analyst')),
  primary key (tenant_id,user_id)
);
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id),
  name text not null,
  plan text not null check (plan in ('starter','pro','enterprise')),
  region text not null,
  renewal_date date,
  synthetic boolean not null default true check (synthetic),
  unique (tenant_id,id)
);
create table public.account_memberships (
  tenant_id uuid not null,
  account_id uuid not null,
  user_id uuid not null references auth.users(id),
  primary key (tenant_id,account_id,user_id),
  foreign key (tenant_id,account_id) references public.accounts(tenant_id,id)
);
create table public.support_cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  account_id uuid not null,
  case_number text not null,
  title text not null,
  product text not null,
  severity smallint not null check (severity between 1 and 3),
  status text not null check (status in ('open','investigating','needs_diagnostics','escalated','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synthetic boolean not null default true check (synthetic),
  unique (tenant_id,case_number),
  unique (tenant_id,account_id,id),
  foreign key (tenant_id,account_id) references public.accounts(tenant_id,id)
);
create table public.case_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  account_id uuid not null,
  case_id uuid not null,
  author_kind text not null check (author_kind in ('customer','support','agent')),
  visibility text not null default 'internal' check (visibility in ('internal','customer')),
  body text not null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id,account_id,case_id) references public.support_cases(tenant_id,account_id,id)
);
create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  account_id uuid not null,
  deployed_at timestamptz not null,
  client_version text not null,
  region text not null,
  foreign key (tenant_id,account_id) references public.accounts(tenant_id,id)
);
create table public.telemetry_buckets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  account_id uuid not null,
  bucket_start timestamptz not null,
  endpoint text not null,
  region text not null,
  client_version text not null,
  requests bigint not null check (requests >= 0),
  errors bigint not null check (errors >= 0 and errors <= requests),
  unique (tenant_id,account_id,bucket_start,endpoint,region,client_version),
  foreign key (tenant_id,account_id) references public.accounts(tenant_id,id)
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id),
  actor_id uuid references auth.users(id),
  action text not null,
  resource_id uuid,
  outcome text not null check (outcome in ('allowed','denied','failed')),
  created_at timestamptz not null default now()
);

create function private.is_staff(target_tenant uuid) returns boolean
language sql stable security definer set search_path = ''
as $fn$
  select exists (select 1 from public.organization_memberships m
    where m.tenant_id = target_tenant and m.user_id = (select auth.uid()));
$fn$;
create function private.can_access_account(target_tenant uuid,target_account uuid) returns boolean
language sql stable security definer set search_path = ''
as $fn$
  select exists (select 1 from public.accounts a where a.tenant_id=target_tenant and a.id=target_account)
    and (private.is_staff(target_tenant) or exists (
      select 1 from public.account_memberships m
      where m.tenant_id=target_tenant and m.account_id=target_account and m.user_id=(select auth.uid())
    ));
$fn$;
revoke all on function private.is_staff(uuid) from public;
revoke all on function private.can_access_account(uuid,uuid) from public;
grant execute on function private.is_staff(uuid),private.can_access_account(uuid,uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.accounts enable row level security;
alter table public.account_memberships enable row level security;
alter table public.support_cases enable row level security;
alter table public.case_messages enable row level security;
alter table public.deployments enable row level security;
alter table public.telemetry_buckets enable row level security;
alter table public.audit_events enable row level security;

create policy organizations_read on public.organizations for select to authenticated using (private.is_staff(id));
create policy organization_memberships_read on public.organization_memberships for select to authenticated using (user_id=(select auth.uid()));
create policy accounts_read on public.accounts for select to authenticated using (private.can_access_account(tenant_id,id));
create policy account_memberships_read on public.account_memberships for select to authenticated using (user_id=(select auth.uid()) or private.is_staff(tenant_id));
create policy support_cases_read on public.support_cases for select to authenticated using (private.can_access_account(tenant_id,account_id));
create policy case_messages_read on public.case_messages for select to authenticated using (private.can_access_account(tenant_id,account_id) and (visibility='customer' or private.is_staff(tenant_id)));
create policy deployments_read on public.deployments for select to authenticated using (private.can_access_account(tenant_id,account_id));
create policy telemetry_read on public.telemetry_buckets for select to authenticated using (private.can_access_account(tenant_id,account_id));
create policy audit_read on public.audit_events for select to authenticated using (private.is_staff(tenant_id));

-- Explicit privileges: the browser can only read authorized rows in this first milestone.
revoke all on public.organizations,public.organization_memberships,public.accounts,public.account_memberships,public.support_cases,public.case_messages,public.deployments,public.telemetry_buckets,public.audit_events from anon,authenticated;
grant select on public.organizations,public.organization_memberships,public.accounts,public.account_memberships,public.support_cases,public.case_messages,public.deployments,public.telemetry_buckets,public.audit_events to authenticated;
grant all on public.organizations,public.organization_memberships,public.accounts,public.account_memberships,public.support_cases,public.case_messages,public.deployments,public.telemetry_buckets,public.audit_events to service_role;

create index accounts_tenant on public.accounts(tenant_id);
create index account_memberships_user on public.account_memberships(user_id,tenant_id);
create index support_cases_account on public.support_cases(tenant_id,account_id,status);
create index case_messages_case on public.case_messages(tenant_id,account_id,case_id,created_at);
create index deployments_account on public.deployments(tenant_id,account_id,deployed_at);
create index telemetry_account on public.telemetry_buckets(tenant_id,account_id,bucket_start);
create index audit_tenant on public.audit_events(tenant_id,created_at);
commit;
