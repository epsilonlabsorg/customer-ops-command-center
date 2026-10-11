import { persistWorkflowExecution } from './workflow-persistence.ts';
import { evaluateWorkflow, type WorkflowActionType } from './policy.ts';

export type SyntheticWorkflowExecution = {
  executionId: string;
  auditId: string;
  caseId: string;
  actionType: WorkflowActionType;
  actionDigest: string;
  status: 'completed' | 'requires_approval' | 'specialist_handoff';
  duplicate: boolean;
  synthetic: true;
  persistence: 'supabase' | 'runtime_memory_until_supabase';
  summary: string;
  executedAt: string;
};

const globalStore = globalThis as typeof globalThis & {
  __customerOpsExecutions?: Map<string, SyntheticWorkflowExecution>;
};
const executions = globalStore.__customerOpsExecutions ??= new Map<string, SyntheticWorkflowExecution>();

const actionSummaries: Record<WorkflowActionType, string> = {
  case_note: 'Added a synthetic internal case note with the verified investigation summary.',
  diagnostic_request: 'Created a synthetic diagnostic request containing only the smallest missing evidence.',
  engineering_handoff: 'Created a synthetic engineering handoff with evidence, hypotheses, and references.',
  csm_task: 'Created a synthetic customer-success review task.',
  incident_candidate: 'Created a synthetic emerging-incident candidate for specialist review.',
  entitlement_change: 'Prepared a synthetic entitlement change record.',
  credit: 'Prepared a synthetic credit request.',
  credential_rotation: 'Prepared a synthetic secure credential-rotation request.',
  delete_data: 'Routed the synthetic request to the secure specialist workflow.',
  billing_ownership: 'Routed the synthetic request to the secure specialist workflow.',
};

async function digestAction(input: { caseId: string; actionType: WorkflowActionType }) {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function executeSyntheticWorkflow(input: {
  caseId: string;
  actionType: WorkflowActionType;
  confirmed: boolean;
  idempotencyKey: string;
}): Promise<SyntheticWorkflowExecution> {
  const existing = executions.get(input.idempotencyKey);
  if (existing) return { ...existing, duplicate: true };

  const actionDigest = await digestAction({ caseId: input.caseId, actionType: input.actionType });
  const policy = evaluateWorkflow({
    actionType: input.actionType,
    authenticated: true,
    authorized: true,
    approved: input.confirmed,
    actionDigestMatches: input.confirmed,
  });
  const status = policy.decision === 'allow'
    ? 'completed'
    : policy.decision === 'require_approval'
      ? 'requires_approval'
      : 'specialist_handoff';

  const record: SyntheticWorkflowExecution = {
    executionId: crypto.randomUUID(),
    auditId: crypto.randomUUID(),
    caseId: input.caseId,
    actionType: input.actionType,
    actionDigest,
    status,
    duplicate: false,
    synthetic: true,
    persistence: 'runtime_memory_until_supabase',
    summary: actionSummaries[input.actionType],
    executedAt: new Date().toISOString(),
  };
  const persisted = await persistWorkflowExecution({
    record,
    idempotencyKey: input.idempotencyKey,
    riskTier: policy.riskTier,
    actionType: input.actionType,
  });
  executions.set(input.idempotencyKey, persisted);
  return persisted;
}