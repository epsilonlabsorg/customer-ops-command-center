import { runCustomerOpsGraph, type AgentTraceStep } from './agent-graph.ts';
import { persistInvestigationRun, type PersistenceMode } from './investigation-persistence.ts';
import { createOllamaChatReply, type OllamaChatReply } from './ollama.ts';
import type { InvestigationResult } from './investigation.ts';
import type { KnowledgeItem } from './knowledge.ts';
import type { WorkflowActionType } from './policy.ts';

export type SupportChatReply = {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  nextBestAction: string;
  referenceIds: string[];
  source: 'ollama' | 'deterministic_fallback';
  model: string | null;
};

export type SupportChatResponse = {
  runId: string;
  caseId: string;
  reply: SupportChatReply;
  diagnosis: Pick<InvestigationResult, 'outcome' | 'probableCause' | 'conclusion' | 'nextStep'>;
  evidence: InvestigationResult['evidence'];
  references: Array<KnowledgeItem & { score: number }>;
  recommendedAction: WorkflowActionType;
  trace: AgentTraceStep[];
  persistence: PersistenceMode;
};

function deterministicReply(result: InvestigationResult): SupportChatReply {
  const answer = result.outcome === 'probable_cause'
    ? `${result.conclusion} Observed evidence supports this as a probable cause, not a confirmed statement about a real customer or Hugging Face system.`
    : `${result.conclusion} The investigation cannot isolate one cause yet. ${result.nextStep}`;
  return {
    answer,
    confidence: result.outcome === 'probable_cause' ? 'high' : 'low',
    nextBestAction: result.nextStep,
    referenceIds: [],
    source: 'deterministic_fallback',
    model: null,
  };
}

export async function runSupportChat(input: {
  caseId: string;
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<SupportChatResponse> {
  const graph = await runCustomerOpsGraph({ caseId: input.caseId, useModel: false });
  let reply = deterministicReply(graph.result);

  try {
    const modelReply: OllamaChatReply = await createOllamaChatReply({
      message: input.message,
      history: input.history ?? [],
      result: graph.result,
      knowledge: graph.knowledge,
    });
    reply = {
      answer: modelReply.answer,
      confidence: modelReply.confidence,
      nextBestAction: modelReply.nextBestAction,
      referenceIds: modelReply.referenceIds,
      source: 'ollama',
      model: modelReply.model,
    };
  } catch (error) {
    console.error('Ollama chat fallback:', error instanceof Error ? error.message : 'unknown provider error');
  }

  const referenceIds = new Set(reply.referenceIds);
  const references = graph.knowledge.filter((item) => referenceIds.has(item.id));
  const persistence = await persistInvestigationRun(graph, reply);

  return {
    runId: graph.runId,
    caseId: graph.caseId,
    reply,
    diagnosis: {
      outcome: graph.result.outcome,
      probableCause: graph.result.probableCause,
      conclusion: graph.result.conclusion,
      nextStep: graph.result.nextStep,
    },
    evidence: graph.result.evidence,
    references,
    recommendedAction: graph.policy.actionType,
    trace: graph.trace,
    persistence,
  };
}