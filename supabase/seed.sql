-- Synthetic showcase seed. Memberships require real Supabase Auth user IDs.
-- No auth users, credentials, or production records are created here.
begin;
insert into public.organizations (id,name) values
 ('10000000-0000-4000-8000-000000000001','Epsilon Demo'),
 ('10000000-0000-4000-8000-000000000002','Isolation Test Organization')
on conflict (id) do nothing;
insert into public.accounts (id,tenant_id,name,plan,region) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Meridian AI','enterprise','eu-west'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Northstar Labs','pro','us-east'),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','Aster Systems','enterprise','eu-west'),
 ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','Cedar Research','starter','us-east'),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','Separate Tenant Account','enterprise','us-east')
on conflict (id) do nothing;
insert into public.support_cases (id,tenant_id,account_id,case_number,title,product,severity,status) values
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','CS-1042','Inference failures after a client deployment','Inference',1,'investigating'),
 ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','CS-1041','Model download returns an access error','Hub',2,'needs_diagnostics'),
 ('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000004','CS-1040','Inference latency and failures increased in EU','Inference',1,'investigating'),
 ('30000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','CS-1039','Intermittent rate limits during batch jobs','Hub',2,'investigating'),
 ('30000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000005','CS-1038','Pinned model revision is not updating','Hub',3,'needs_diagnostics'),
 ('30000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','CS-1037','Large requests time out after a workload change','Inference',2,'investigating'),
 ('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','ISOLATED-1','Isolation control case','Hub',3,'open')
on conflict (id) do nothing;
commit;