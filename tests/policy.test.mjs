import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateWorkflow } from '../apps/support-console/lib/policy.ts';

test('unauthenticated workflow actions are denied at every tier', () => {
  assert.equal(evaluateWorkflow({ actionType: 'case_note', authenticated: false, authorized: false, approved: false, actionDigestMatches: false }).decision, 'deny');
});

test('authorized low and medium actions can proceed', () => {
  assert.equal(evaluateWorkflow({ actionType: 'case_note', authenticated: true, authorized: true, approved: false, actionDigestMatches: false }).decision, 'allow');
  assert.equal(evaluateWorkflow({ actionType: 'diagnostic_request', authenticated: true, authorized: true, approved: false, actionDigestMatches: false }).decision, 'allow');
});

test('high-risk actions require approval bound to the exact payload', () => {
  assert.equal(evaluateWorkflow({ actionType: 'credential_rotation', authenticated: true, authorized: true, approved: true, actionDigestMatches: false }).decision, 'require_approval');
  assert.equal(evaluateWorkflow({ actionType: 'credential_rotation', authenticated: true, authorized: true, approved: true, actionDigestMatches: true }).decision, 'allow');
});

test('critical actions always require specialist handoff', () => {
  assert.equal(evaluateWorkflow({ actionType: 'delete_data', authenticated: true, authorized: true, approved: true, actionDigestMatches: true }).decision, 'specialist_handoff');
});
