import type { RiskTier, WorkflowActionType } from './policy.ts';
import type { SyntheticWorkflowExecution } from './workflow-executor.ts';
import { getSupabaseServerClient } from './supabase-server.ts';

type CaseScope = { id: string; tenant_id: string; account_id: string };
type StoredAction = { id: string; status: string; payload: Record<string, unknown>; executed_at: string | null };

function fromStoredAction(
  stored: StoredAction,
  fallback: SyntheticWorkflowExecution,
): SyntheticWorkflowExecution {
  const payload = stored.payload ?? {};
  return {
    ...fallback,
    executionId: stored.id,
    auditId: typeof payload.auditId === 'string' ? payload.auditId : fallback.auditId,
    actionDigest: typeof payload.actionDigest === 'string' ? payload.actionDigest : fallback.actionDigest,
    summary: typeof payload.summary === 'string' ? payload.summary : fallback.summary,
    executedAt: stored.executed_at ?? fallback.executedAt,
    duplicate: true,
    persistence: 'supabase',
  };
}

export async function persistWorkflowExecution(input: {
  record: SyntheticWorkflowExecution;
  idempotencyKey: string;
  riskTier: RiskTier;
  actionType: WorkflowActionType;
}): Promise<SyntheticWorkflowExecution> {
  const client = getSupabaseServerClient();
  if (!client) return input.record;

  try {
    const { data: supportCase, error: caseError } = await client
      .from('support_cases')
      .select('id,tenant_id,account_id')
      .eq('case_number', input.record.caseId)
      .eq('synthetic', true)
      .limit(1)
      .maybeSingle<CaseScope>();
    if (caseError || !supportCase) throw new Error(`case_lookup:${caseError?.code ?? 'missing'}`);

    const loadExisting = async () => client
      .from('workflow_actions')
      .select('id,status,payload,executed_at')
      .eq('tenant_id', supportCase.tenant_id)
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle<StoredAction>();

    const existing = await loadExisting();
    if (existing.error) throw new Error(`action_lookup:${existing.error.code ?? 'failed'}`);
    if (existing.data) return fromStoredAction(existing.data, input.record);

    const databaseStatus = input.record.status === 'completed'
      ? 'executed'
      : input.record.status === 'requires_approval'
        ? 'proposed'
        : 'denied';
    const payload = {
      synthetic: true,
      publicCaseId: input.record.caseId,
      actionDigest: input.record.actionDigest,
      auditId: input.record.auditId,
      summary: input.record.summary,
    };
    const { error: actionError } = await client.from('workflow_actions').insert({
      id: input.record.executionId,
      tenant_id: supportCase.tenant_id,
      account_id: supportCase.account_id,
      case_id: supportCase.id,
      action_type: input.actionType,
      risk_tier: input.riskTier,
      status: databaseStatus,
      payload,
      idempotency_key: input.idempotencyKey,
      requested_by: null,
      requested_at: input.record.executedAt,
      executed_at: input.record.status === 'completed' ? input.record.executedAt : null,
    });
    if (actionError?.code === '23505') {
      const raced = await loadExisting();
      if (raced.data) return fromStoredAction(raced.data, input.record);
    }
    if (actionError) throw new Error(`action_insert:${actionError.code ?? 'failed'}`);

    const { error: auditError } = await client.from('audit_events').insert({
      id: input.record.auditId,
      tenant_id: supportCase.tenant_id,
      actor_id: null,
      action: `workflow_execute:${input.actionType}`,
      resource_id: input.record.executionId,
      outcome: input.record.status === 'completed' ? 'allowed' : 'denied',
      created_at: input.record.executedAt,
    });
    if (auditError) throw new Error(`audit_insert:${auditError.code ?? 'failed'}`);

    return { ...input.record, persistence: 'supabase' };
  } catch (error) {
    console.error('Supabase workflow persistence fallback:', error instanceof Error ? error.message : 'unknown persistence error');
    return input.record;
  }
}