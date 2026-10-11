import test from 'node:test';
import assert from 'node:assert/strict';
import { runCustomerOpsGraph, customerOpsTopology } from '../apps/support-console/lib/agent-graph.ts';

test('LangGraph resolves a controlled regression and records bounded node traces', async () => {
  const run = await runCustomerOpsGraph({ caseId: 'CS-1042', useModel: false });
  assert.equal(run.result.probableCause, 'Client-version regression');
  assert.equal(run.modelStatus, 'skipped');
  assert.deepEqual(run.trace.map((step) => step.node), [
    'scope_intake',
    'telemetry_analyst',
    'diagnosis_investigator',
    'knowledge_researcher',
    'safety_guard',
    'finalize',
  ]);
  assert.equal(run.policy.decision, 'deny');
  assert.equal(run.policy.persists, false);
  assert.ok(run.knowledge.length > 0);
  assert.equal(customerOpsTopology.length, 7);
});

test('LangGraph preserves abstention when evidence is incomplete', async () => {
  const run = await runCustomerOpsGraph({ caseId: 'CS-1038', useModel: false });
  assert.equal(run.result.outcome, 'needs_diagnostics');
  assert.equal(run.result.probableCause, null);
  assert.equal(run.policy.actionType, 'diagnostic_request');
  assert.match(run.result.nextStep, /Request/);
});

test('LangGraph rejects a case outside the supplied tenant scope', async () => {
  await assert.rejects(
    runCustomerOpsGraph({ caseId: 'CS-1042', useModel: false, tenantId: 'other-tenant', accountIds: ['meridian'] }),
    /access denied/i,
  );
});
