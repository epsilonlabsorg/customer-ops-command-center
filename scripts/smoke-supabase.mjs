import { runSupportChat } from '../apps/support-console/lib/chat.ts';
import { executeSyntheticWorkflow } from '../apps/support-console/lib/workflow-executor.ts';

const chat = await runSupportChat({
  caseId: 'CS-1042',
  message: 'Summarize the strongest evidence and the safest next action.',
});
const workflow = await executeSyntheticWorkflow({
  caseId: 'CS-1042',
  actionType: chat.recommendedAction,
  confirmed: true,
  idempotencyKey: `smoke:${crypto.randomUUID()}`,
});

const result = {
  chatPersistence: chat.persistence,
  chatSource: chat.reply.source,
  evidenceCount: chat.evidence.length,
  workflowPersistence: workflow.persistence,
  workflowStatus: workflow.status,
  auditCreated: Boolean(workflow.auditId),
};
console.log(JSON.stringify(result));
if (chat.persistence !== 'supabase' || workflow.persistence !== 'supabase') process.exitCode = 1;