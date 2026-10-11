import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCustomerHealth } from '../apps/support-console/lib/customer-health.ts';
import { searchKnowledge } from '../apps/support-console/lib/knowledge.ts';
import { detectIssueSignals } from '../apps/support-console/lib/systemic.ts';
import { createOllamaDraft } from '../apps/support-console/lib/ollama.ts';
import { investigate } from '../apps/support-console/lib/investigation.ts';
import { demoContext, flagshipFixture } from '../apps/support-console/lib/demo-investigations.ts';

test('customer health is deterministic and explains the score', () => {
  const health = calculateCustomerHealth('Meridian AI');
  assert.equal(health.band, 'attention');
  assert.ok(health.reasons.some((reason) => reason.includes('Sev 1')));
});

test('knowledge search favors exact public-reference terms', () => {
  const results = searchKnowledge('authentication 401 token', 'Hub');
  assert.equal(results[0].id, 'DOC-HUB-AUTH');
  assert.ok(results.every((item) => item.product === 'Hub'));
});

test('systemic signals require multiple cases and accounts', () => {
  const signals = detectIssueSignals();
  const hub = signals.find((signal) => signal.product === 'Hub');
  assert.equal(hub?.confidence, 'candidate');
  assert.ok((hub?.accountCount ?? 0) >= 2);
});

test('Ollama response is schema validated and the API key is never part of the prompt', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OLLAMA_API_KEY;
  const originalModel = process.env.OLLAMA_MODEL;
  process.env.OLLAMA_API_KEY = 'test-secret-value';
  process.env.OLLAMA_MODEL = 'test-model';
  let body = '';
  globalThis.fetch = async (_input, init) => {
    body = String(init?.body ?? '');
    return new Response(JSON.stringify({
      message: {
        content: JSON.stringify({
          summary: 'The controlled comparison supports a probable client-version regression.',
          customerReply: 'We reproduced the behavior only with the new client. Please test the previous client in a controlled environment while engineering reviews the evidence.',
          escalationTitle: 'Probable client regression after deployment',
        }),
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const result = investigate(flagshipFixture, demoContext.tenantId, demoContext.accountIds);
    const draft = await createOllamaDraft(result);
    assert.equal(draft.model, 'test-model');
    assert.ok(!body.includes('test-secret-value'));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OLLAMA_API_KEY; else process.env.OLLAMA_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.OLLAMA_MODEL; else process.env.OLLAMA_MODEL = originalModel;
  }
});

test('invalid Ollama JSON is rejected instead of reaching workflow output', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OLLAMA_API_KEY;
  process.env.OLLAMA_API_KEY = 'test-secret-value';
  globalThis.fetch = async () => new Response(JSON.stringify({ message: { content: '{"summary":"too short"}' } }), { status: 200 });
  try {
    const result = investigate(flagshipFixture, demoContext.tenantId, demoContext.accountIds);
    await assert.rejects(() => createOllamaDraft(result));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OLLAMA_API_KEY; else process.env.OLLAMA_API_KEY = originalKey;
  }
});
