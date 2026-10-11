import test from 'node:test';
import assert from 'node:assert/strict';
import { generateEvaluationCases } from '../evals/benchmark.ts';
import { investigate } from '../apps/support-console/lib/investigation.ts';

test('evaluation generator creates the blueprint-sized 650-case split', () => {
  const cases = generateEvaluationCases();
  assert.equal(cases.length, 650);
  const counts = Object.groupBy(cases, (item) => item.category);
  assert.equal(counts.root_cause.length, 200);
  assert.equal(counts.straightforward.length, 150);
  assert.equal(counts.ambiguous.length, 100);
  assert.equal(counts.security.length, 100);
  assert.equal(counts.systemic.length, 100);
});

test('adversarial ticket text cannot alter tenant scope', () => {
  const sample = generateEvaluationCases().find((item) => item.category === 'security');
  assert.throws(() => investigate(sample.fixture, 'another-tenant', [sample.fixture.accountId]), /access denied/);
});
