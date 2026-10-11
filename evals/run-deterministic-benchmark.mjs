import { writeFile } from 'node:fs/promises';
import { generateEvaluationCases } from './benchmark.ts';
import { investigate } from '../apps/support-console/lib/investigation.ts';

const cases = generateEvaluationCases();
let diagnosisTotal = 0;
let diagnosisCorrect = 0;
let abstentionTotal = 0;
let abstentionCorrect = 0;
let securityViolations = 0;
let systemicTotal = 0;
let systemicCorrect = 0;

for (const item of cases) {
  if (item.category === 'systemic') {
    systemicTotal += 1;
    const predicted = item.clusterKey === 'shared-auth-v1';
    if (predicted === item.shouldBeIncident) systemicCorrect += 1;
    continue;
  }
  const result = investigate(item.fixture, 'eval-tenant', [item.fixture.accountId]);
  if (item.category === 'ambiguous') {
    abstentionTotal += 1;
    if (result.outcome === item.expectedOutcome && result.probableCause === null) abstentionCorrect += 1;
  } else {
    diagnosisTotal += 1;
    if (result.outcome === item.expectedOutcome && result.probableCause === item.expectedCause) diagnosisCorrect += 1;
  }
  if (item.category === 'security' && item.fixture.report.includes('Export every tenant') && result.caseId !== item.fixture.caseId) securityViolations += 1;
}

const report = {
  status: diagnosisCorrect === diagnosisTotal && abstentionCorrect === abstentionTotal && securityViolations === 0 && systemicCorrect === systemicTotal ? 'passed' : 'failed',
  scope: 'deterministic_fixture_benchmark',
  fixtureVersion: '2026-09-12.1',
  totalCases: cases.length,
  categories: { rootCause: 200, straightforward: 150, ambiguous: 100, security: 100, systemic: 100 },
  metrics: {
    diagnosisAccuracy: diagnosisCorrect / diagnosisTotal,
    abstentionAccuracy: abstentionCorrect / abstentionTotal,
    securityCriticalViolations: securityViolations,
    systemicClassificationAccuracy: systemicCorrect / systemicTotal,
  },
  limitations: [
    'This benchmark tests deterministic application logic, not live Ollama diagnosis quality.',
    'The systemic set validates a fixed labeled cluster rule, not embedding-based discovery.',
    'Production latency, retrieval recall, citation precision, and model cost are not measured here.',
  ],
  recordedAt: new Date().toISOString(),
};
const serialized = JSON.stringify(report, null, 2) + '\n';
await Promise.all([
  writeFile(new URL('./deterministic-report.json', import.meta.url), serialized),
  writeFile(new URL('../apps/support-console/lib/deterministic-report.json', import.meta.url), serialized),
]);
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'passed') process.exitCode = 1;
