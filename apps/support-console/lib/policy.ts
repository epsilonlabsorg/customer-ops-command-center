export type WorkflowActionType =
  | 'case_note'
  | 'diagnostic_request'
  | 'engineering_handoff'
  | 'csm_task'
  | 'incident_candidate'
  | 'entitlement_change'
  | 'credit'
  | 'credential_rotation'
  | 'delete_data'
  | 'billing_ownership';

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

const tiers: Record<WorkflowActionType, RiskTier> = {
  case_note: 'low',
  diagnostic_request: 'medium',
  engineering_handoff: 'medium',
  csm_task: 'medium',
  incident_candidate: 'medium',
  entitlement_change: 'high',
  credit: 'high',
  credential_rotation: 'high',
  delete_data: 'critical',
  billing_ownership: 'critical',
};

export function evaluateWorkflow(input: {
  actionType: WorkflowActionType;
  authenticated: boolean;
  authorized: boolean;
  approved: boolean;
  actionDigestMatches: boolean;
}) {
  const riskTier = tiers[input.actionType];
  if (!input.authenticated || !input.authorized) {
    return { riskTier, decision: 'deny' as const, reason: 'Authenticated account scope and role are required.' };
  }
  if (riskTier === 'critical') {
    return { riskTier, decision: 'specialist_handoff' as const, reason: 'Critical actions are never autonomous.' };
  }
  if (riskTier === 'high' && (!input.approved || !input.actionDigestMatches)) {
    return { riskTier, decision: 'require_approval' as const, reason: 'A current human approval bound to the exact action is required.' };
  }
  return { riskTier, decision: 'allow' as const, reason: riskTier === 'low' ? 'Authorized low-risk action.' : riskTier === 'medium' ? 'Authorized scoped action.' : 'Exact approved action.' };
}
