import type { CustomerOpsGraphResult } from './agent-graph.ts';
import type { SupportChatReply } from './chat.ts';
import { getSupabaseServerClient } from './supabase-server.ts';

export type PersistenceMode = 'supabase' | 'runtime_only';

type CaseScope = { id: string; tenant_id: string; account_id: string };

export async function persistInvestigationRun(
  graph: CustomerOpsGraphResult,
  reply: SupportChatReply,
): Promise<PersistenceMode> {
  const client = getSupabaseServerClient();
  if (!client) return 'runtime_only';

  try {
    const { data: supportCase, error: caseError } = await client
      .from('support_cases')
      .select('id,tenant_id,account_id')
      .eq('case_number', graph.caseId)
      .eq('synthetic', true)
      .limit(1)
      .maybeSingle<CaseScope>();
    if (caseError || !supportCase) throw new Error(`case_lookup:${caseError?.code ?? 'missing'}`);

    const completedAt = new Date().toISOString();
    const { error: runError } = await client.from('investigation_runs').insert({
      id: graph.runId,
      tenant_id: supportCase.tenant_id,
      account_id: supportCase.account_id,
      case_id: supportCase.id,
      status: graph.result.outcome,
      model_provider: reply.source === 'ollama' ? 'ollama' : 'deterministic',
      model_name: reply.model,
      completed_at: completedAt,
    });
    if (runError) throw new Error(`run_insert:${runError.code ?? 'failed'}`);

    const evidenceRows = graph.result.evidence.map((item) => ({
      tenant_id: supportCase.tenant_id,
      account_id: supportCase.account_id,
      run_id: graph.runId,
      evidence_key: item.id,
      evidence_type: item.id === 'E1' ? 'telemetry' : item.id === 'E2' ? 'deployment' : 'diagnostic',
      observation: item.observation,
      source_url: null,
      observed_at: completedAt,
    }));
    const { error: evidenceError } = await client.from('investigation_evidence').insert(evidenceRows);
    if (evidenceError) throw new Error(`evidence_insert:${evidenceError.code ?? 'failed'}`);

    const hypothesisRows = graph.result.hypotheses.map((item, index) => ({
      tenant_id: supportCase.tenant_id,
      account_id: supportCase.account_id,
      run_id: graph.runId,
      title: item.title,
      rank: index + 1,
      status: item.status.toLowerCase(),
      evidence_for: item.evidenceFor,
      evidence_against: item.evidenceAgainst,
    }));
    const { error: hypothesisError } = await client.from('investigation_hypotheses').insert(hypothesisRows);
    if (hypothesisError) throw new Error(`hypothesis_insert:${hypothesisError.code ?? 'failed'}`);

    return 'supabase';
  } catch (error) {
    console.error('Supabase investigation persistence fallback:', error instanceof Error ? error.message : 'unknown persistence error');
    return 'runtime_only';
  }
}