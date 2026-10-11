import test from 'node:test';
import assert from 'node:assert/strict';
import { runSupportChat } from '../apps/support-console/lib/chat.ts';
import { executeSyntheticWorkflow } from '../apps/support-console/lib/workflow-executor.ts';

test('support chat grounds Ollama output in the graph and filters invented references', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OLLAMA_API_KEY;
  const originalModel = process.env.OLLAMA_MODEL;
  const originalBaseUrl = process.env.OLLAMA_BASE_URL;
  process.env.OLLAMA_API_KEY = 'test-secret-value';
  process.env.OLLAMA_MODEL = 'gpt-oss:20b-cloud';
  process.env.OLLAMA_BASE_URL = 'https://ollama.com/api';
  let requestBody = '';

  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body ?? '');
    return new Response(JSON.stringify({
      message: {
        content: JSON.stringify({
          answer: 'The controlled comparison supports a probable client-version regression, while the credential and regional checks weaken the main alternatives.',
          confidence: 'high',
          nextBestAction: 'Prepare the scoped engineering handoff and test the previous client in a controlled environment.',
          referenceIds: ['DOC-INFERENCE-CLIENT', 'INVENTED-REFERENCE'],
        }),
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const response = await runSupportChat({
      caseId: 'CS-1042',
      message: 'What changed after the deployment?',
    });
    assert.equal(response.reply.source, 'ollama');
    assert.equal(response.reply.model, 'gpt-oss:20b');
    assert.deepEqual(response.reply.referenceIds, ['DOC-INFERENCE-CLIENT']);
    assert.equal(response.references[0]?.id, 'DOC-INFERENCE-CLIENT');
    assert.ok(!requestBody.includes('test-secret-value'));
    assert.match(requestBody, /verifiedInvestigation/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OLLAMA_API_KEY; else process.env.OLLAMA_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.OLLAMA_MODEL; else process.env.OLLAMA_MODEL = originalModel;
    if (originalBaseUrl === undefined) delete process.env.OLLAMA_BASE_URL; else process.env.OLLAMA_BASE_URL = originalBaseUrl;
  }
});

test('synthetic workflow execution is policy checked and idempotent', async () => {
  const idempotencyKey = `test:${crypto.randomUUID()}`;
  const first = await executeSyntheticWorkflow({
    caseId: 'CS-1042',
    actionType: 'engineering_handoff',
    confirmed: true,
    idempotencyKey,
  });
  const repeated = await executeSyntheticWorkflow({
    caseId: 'CS-1042',
    actionType: 'engineering_handoff',
    confirmed: true,
    idempotencyKey,
  });

  assert.equal(first.status, 'completed');
  assert.equal(first.synthetic, true);
  assert.equal(first.duplicate, false);
  assert.equal(repeated.duplicate, true);
  assert.equal(repeated.executionId, first.executionId);
  assert.equal(repeated.actionDigest, first.actionDigest);
});
