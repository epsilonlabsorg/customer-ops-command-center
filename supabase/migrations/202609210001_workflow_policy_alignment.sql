-- Keep the database action vocabulary aligned with the policy engine.
begin;
alter table public.workflow_actions
  drop constraint if exists workflow_actions_action_type_check;
alter table public.workflow_actions
  add constraint workflow_actions_action_type_check
  check (action_type in (
    'case_note',
    'diagnostic_request',
    'engineering_handoff',
    'csm_task',
    'incident_candidate',
    'entitlement_change',
    'credit',
    'credential_rotation',
    'delete_data',
    'billing_ownership'
  ));
commit;