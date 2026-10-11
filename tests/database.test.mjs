import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '../apps/support-console/node_modules/@electric-sql/pglite/dist/index.js';

const foundationSql = await readFile(new URL('../supabase/migrations/202609120001_foundation.sql', import.meta.url), 'utf8');
const operationsSql = await readFile(new URL('../supabase/migrations/202609120002_operations.sql', import.meta.url), 'utf8');
const seed = await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
const db = new PGlite();

await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
`);
await db.exec(foundationSql);
await db.exec(operationsSql);
await db.exec(seed);

const staff = '40000000-0000-4000-8000-000000000001';
const customer = '40000000-0000-4000-8000-000000000002';
await db.exec(`
 insert into auth.users values ('${staff}'),('${customer}');
 insert into public.organization_memberships values ('10000000-0000-4000-8000-000000000001','${staff}','support');
 insert into public.account_memberships values ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','${customer}');
 insert into public.case_messages(tenant_id,account_id,case_id,author_kind,visibility,body) values
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','support','internal','Internal note'),
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','support','customer','Customer response');
`);

async function asUser(user, query) {
  await db.exec('set role authenticated');
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
    return await db.query(query);
  } finally {
    await db.exec('reset role');
  }
}

test('database staff access includes own organization and excludes a second tenant', async () => {
  const result = await asUser(staff, 'select case_number from public.support_cases order by case_number');
  assert.deepEqual(result.rows.map((row) => row.case_number), ['CS-1037', 'CS-1038', 'CS-1039', 'CS-1040', 'CS-1041', 'CS-1042']);
});

test('database portal user can read only the assigned customer account', async () => {
  const result = await asUser(customer, 'select case_number from public.support_cases order by case_number');
  assert.deepEqual(result.rows.map((row) => row.case_number), ['CS-1039', 'CS-1042']);
});

test('database customer cannot read internal notes', async () => {
  const result = await asUser(customer, 'select body from public.case_messages');
  assert.deepEqual(result.rows.map((row) => row.body), ['Customer response']);
});

test('unrecognized user has no account records', async () => {
  const result = await asUser('40000000-0000-4000-8000-000000000099', 'select * from public.accounts');
  assert.equal(result.rows.length, 0);
});

test('authenticated users cannot directly change account records', async () => {
  await assert.rejects(() => asUser(staff, "update public.accounts set name='Changed'"), /permission denied/);
});

test('unauthenticated role cannot read cases', async () => {
  await db.exec('set role anon');
  try {
    await assert.rejects(() => db.query('select * from public.support_cases'), /permission denied/);
  } finally {
    await db.exec('reset role');
  }
});

test('composite foreign key rejects a case attached to another tenant account', async () => {
  await assert.rejects(
    () => db.exec("insert into public.support_cases(tenant_id,account_id,case_number,title,product,severity,status) values ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','BAD','Bad','Hub',1,'open')"),
    /foreign key/,
  );
});

test('seed can run twice without duplicating cases', async () => {
  await db.exec(seed);
  assert.equal((await db.query('select count(*)::int as total from public.support_cases')).rows[0].total, 7);
});

test('operations tables are readable only within staff tenant scope', async () => {
  await db.exec("insert into public.issue_signals(tenant_id,signal_key,product,normalized_error,distinct_accounts,case_count,status) values ('10000000-0000-4000-8000-000000000001','auth-v1','Hub','401 header mismatch',3,4,'candidate'),('10000000-0000-4000-8000-000000000002','isolated','Hub','private pattern',2,3,'candidate')");
  const result = await asUser(staff, 'select signal_key from public.issue_signals');
  assert.deepEqual(result.rows.map((row) => row.signal_key), ['auth-v1']);
});

test('workflow actions remain read-only to authenticated staff', async () => {
  await assert.rejects(
    () => asUser(staff, "insert into public.workflow_actions(tenant_id,account_id,case_id,action_type,risk_tier,status,idempotency_key) values ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','case_note','low','proposed','direct-write')"),
    /permission denied/,
  );
});

test.after(async () => {
  await db.close();
});
