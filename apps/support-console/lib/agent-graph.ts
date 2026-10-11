import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { demoContext, fixtureForCase } from './demo-investigations.ts';
import { errorRate, investigate, type InvestigationFixture, type InvestigationResult } from './investigation.ts';
import { searchKnowledge, type KnowledgeItem } from './knowledge.ts';
import { createOllamaDraft, isOllamaConfigured, type OllamaDraft } from './ollama.ts';
import { evaluateWorkflow, type WorkflowActionType } from './policy.ts';

export type AgentNodeId =
  | 'scope_intake'
  | 'telemetry_analyst'
  | 'diagnosis_investigator'
  | 'knowledge_researcher'
  | 'safety_guard'
  | 'response_drafter'
  | 'finalize';

export type AgentTraceStep = {
  node: AgentNodeId;
  label: string;
  status: 'completed' | 'skipped' | 'fallback';
  durationMs: number;
  detail: string;
};

export type AgentPolicyResult = ReturnType<typeof evaluateWorkflow> & {
  actionType: WorkflowActionType;
  persists: false;
};

export type CustomerOpsGraphResult = {
  runId: string;
  caseId: string;
  result: InvestigationResult;
  knowledge: Array<KnowledgeItem & { score: number }>;
  draft: OllamaDraft | null;
  modelStatus: 'ready' | 'skipped' | 'not_configured' | 'unavailable';
  policy: AgentPolicyResult;
  trace: AgentTraceStep[];
};

export const customerOpsTopology: Array<{
  id: AgentNodeId;
  label: string;
  role: string;
  boundary: string;
}> = [
  { id: 'scope_intake', label: 'Scope intake', role: 'Loads the case and verifies tenant/account scope.', boundary: 'Rejects unknown and out-of-scope records.' },
  { id: 'telemetry_analyst', label: 'Telemetry analyst', role: 'Calculates weighted before/after error rates.', boundary: 'Rejects empty, invalid, and overflowing counters.' },
  { id: 'diagnosis_investigator', label: 'Diagnosis investigator', role: 'Tests three competing causes with controlled checks.', boundary: 'Abstains unless exactly one cause is supported.' },
  { id: 'knowledge_researcher', label: 'Knowledge researcher', role: 'Retrieves bounded, versioned public references.', boundary: 'References add context; they never prove the cause.' },
  { id: 'safety_guard', label: 'Safety guard', role: 'Classifies the proposed next action by risk.', boundary: 'No unauthenticated action can persist.' },
  { id: 'response_drafter', label: 'Ollama drafter', role: 'Optionally drafts customer-safe communication.', boundary: 'Strict schema, timeout, and deterministic fallback.' },
  { id: 'finalize', label: 'Run finalizer', role: 'Returns the evidence, trace, policy, and citations.', boundary: 'Output remains a reviewable proposal.' },
];

const GraphState = Annotation.Root({
  caseId: Annotation<string>(),
  tenantId: Annotation<string>(),
  accountIds: Annotation<readonly string[]>(),
  useModel: Annotation<boolean>(),
  fixture: Annotation<InvestigationFixture | null>({ default: () => null, reducer: (_, update) => update }),
  product: Annotation<'Hub' | 'Inference'>({ default: () => 'Inference', reducer: (_, update) => update }),
  result: Annotation<InvestigationResult | null>({ default: () => null, reducer: (_, update) => update }),
  knowledge: Annotation<Array<KnowledgeItem & { score: number }>>({ default: () => [], reducer: (_, update) => update }),
  draft: Annotation<OllamaDraft | null>({ default: () => null, reducer: (_, update) => update }),
  modelStatus: Annotation<'ready' | 'skipped' | 'not_configured' | 'unavailable'>({ default: () => 'skipped', reducer: (_, update) => update }),
  policy: Annotation<AgentPolicyResult | null>({ default: () => null, reducer: (_, update) => update }),
  trace: Annotation<AgentTraceStep[]>({ default: () => [], reducer: (current, update) => current.concat(update) }),
});

type GraphStateValue = typeof GraphState.State;

function trace(node: AgentNodeId, label: string, started: number, detail: string, status: AgentTraceStep['status'] = 'completed'): AgentTraceStep[] {
  return [{ node, label, status, durationMs: Math.max(0, Date.now() - started), detail }];
}

async function scopeIntake(state: GraphStateValue) {
  const started = Date.now();
  const fixture = fixtureForCase(state.caseId);
  if (fixture.tenantId !== state.tenantId || !state.accountIds.includes(fixture.accountId)) {
    throw new Error('Account access denied');
  }
  const product = ['CS-1041', 'CS-1038', 'CS-1039'].includes(state.caseId) ? 'Hub' as const : 'Inference' as const;
  return {
    fixture,
    product,
    trace: trace('scope_intake', 'Scope intake', started, `Authorized ${state.caseId} for one synthetic account in ${state.tenantId}.`),
  };
}

async function telemetryAnalyst(state: GraphStateValue) {
  const started = Date.now();
  if (!state.fixture) throw new Error('Case fixture missing');
  const before = errorRate(state.fixture.baseline);
  const after = errorRate(state.fixture.current);
  const detail = before === null || after === null
    ? 'A comparison window is empty; the graph preserved unknown rather than treating it as zero.'
    : `Weighted error rate moved from ${(before * 100).toFixed(1)}% to ${(after * 100).toFixed(1)}%.`;
  return { trace: trace('telemetry_analyst', 'Telemetry analyst', started, detail) };
}

async function diagnosisInvestigator(state: GraphStateValue) {
  const started = Date.now();
  if (!state.fixture) throw new Error('Case fixture missing');
  const result = investigate(state.fixture, state.tenantId, state.accountIds);
  const detail = result.probableCause
    ? `Supported one probable cause: ${result.probableCause}.`
    : `Abstained and requested: ${result.nextStep}`;
  return { result, trace: trace('diagnosis_investigator', 'Diagnosis investigator', started, detail) };
}

async function knowledgeResearcher(state: GraphStateValue) {
  const started = Date.now();
  if (!state.result) throw new Error('Investigation result missing');
  const knowledge = searchKnowledge(`${state.product} ${state.result.nextStep}`, state.product).slice(0, 3);
  return {
    knowledge,
    trace: trace('knowledge_researcher', 'Knowledge researcher', started, `Retrieved ${knowledge.length} bounded public reference${knowledge.length === 1 ? '' : 's'}.`),
  };
}

async function safetyGuard(state: GraphStateValue) {
  const started = Date.now();
  if (!state.result) throw new Error('Investigation result missing');
  const actionType: WorkflowActionType = state.result.outcome === 'probable_cause' ? 'engineering_handoff' : 'diagnostic_request';
  const decision = evaluateWorkflow({ actionType, authenticated: false, authorized: false, approved: false, actionDigestMatches: false });
  const policy: AgentPolicyResult = { ...decision, actionType, persists: false };
  return {
    policy,
    trace: trace('safety_guard', 'Safety guard', started, `${actionType} is ${decision.riskTier} risk; persistence decision: ${decision.decision}.`),
  };
}

async function responseDrafter(state: GraphStateValue) {
  const started = Date.now();
  if (!state.result) throw new Error('Investigation result missing');
  try {
    const draft = await createOllamaDraft(state.result);
    return {
      draft,
      modelStatus: 'ready' as const,
      trace: trace('response_drafter', 'Ollama drafter', started, `Validated a structured draft from ${draft.model}.`),
    };
  } catch {
    const configured = isOllamaConfigured();
    return {
      draft: null,
      modelStatus: configured ? 'unavailable' as const : 'not_configured' as const,
      trace: trace('response_drafter', 'Ollama drafter', started, configured ? 'Provider unavailable or output invalid; deterministic evidence was preserved.' : 'Ollama is not configured; deterministic evidence was preserved.', 'fallback'),
    };
  }
}

async function finalize(state: GraphStateValue) {
  const started = Date.now();
  if (!state.result || !state.policy) throw new Error('Graph output incomplete');
  return {
    trace: trace('finalize', 'Run finalizer', started, `Returned ${state.result.evidence.length} evidence items, ${state.knowledge.length} references, and a non-persisting action proposal.`),
  };
}

const customerOpsGraph = new StateGraph(GraphState)
  .addNode('scope_intake', scopeIntake)
  .addNode('telemetry_analyst', telemetryAnalyst)
  .addNode('diagnosis_investigator', diagnosisInvestigator)
  .addNode('knowledge_researcher', knowledgeResearcher)
  .addNode('safety_guard', safetyGuard)
  .addNode('response_drafter', responseDrafter)
  .addNode('finalize', finalize)
  .addEdge(START, 'scope_intake')
  .addEdge('scope_intake', 'telemetry_analyst')
  .addEdge('telemetry_analyst', 'diagnosis_investigator')
  .addEdge('diagnosis_investigator', 'knowledge_researcher')
  .addEdge('knowledge_researcher', 'safety_guard')
  .addConditionalEdges('safety_guard', (state) => state.useModel ? 'response_drafter' : 'finalize')
  .addEdge('response_drafter', 'finalize')
  .addEdge('finalize', END)
  .compile();

export async function runCustomerOpsGraph(input: {
  caseId: string;
  useModel?: boolean;
  tenantId?: string;
  accountIds?: readonly string[];
}): Promise<CustomerOpsGraphResult> {
  const output = await customerOpsGraph.invoke({
    caseId: input.caseId,
    useModel: input.useModel ?? true,
    tenantId: input.tenantId ?? demoContext.tenantId,
    accountIds: input.accountIds ?? demoContext.accountIds,
  });
  if (!output.result || !output.policy) throw new Error('Graph returned incomplete state');
  return {
    runId: crypto.randomUUID(),
    caseId: output.caseId,
    result: output.result,
    knowledge: output.knowledge,
    draft: output.draft,
    modelStatus: output.modelStatus,
    policy: output.policy,
    trace: output.trace,
  };
}
