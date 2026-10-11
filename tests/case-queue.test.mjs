import test from 'node:test';
import assert from 'node:assert/strict';
import { countCaseStatuses, filterCaseQueue } from '../apps/support-console/lib/case-queue.ts';
import { cases } from '../apps/support-console/lib/fixtures.ts';

test('queue counters derive from records and partition the snapshot', () => {
  assert.deepEqual(countCaseStatuses(cases), { 'All cases': 6, Investigating: 2, 'Needs diagnostics': 3, Escalated: 1 });
  assert.deepEqual(countCaseStatuses([]), { 'All cases': 0, Investigating: 0, 'Needs diagnostics': 0, Escalated: 0 });
});
test('queue filters combine case status and normalized search', () => {
  assert.deepEqual(filterCaseQueue(cases, ' NORTHSTAR ', 'Needs diagnostics').map(c => c.id), ['CS-1041', 'CS-1037']);
  assert.equal(filterCaseQueue(cases, 'CS-1042', 'Needs diagnostics').length, 0);
  assert.equal(filterCaseQueue(cases, 'inference', 'Investigating').length, 2);
});
test('priority ordering does not mutate the fixture or reset filters', () => {
  const reversed = [...cases].reverse();
  const original = reversed.map(c => c.id);
  const result = filterCaseQueue(reversed, '', 'Needs diagnostics', true);
  assert.equal(result[0].priority, 'Sev 2');
  assert.ok(result.every(c => c.status === 'Needs diagnostics'));
  assert.deepEqual(reversed.map(c => c.id), original);
});
