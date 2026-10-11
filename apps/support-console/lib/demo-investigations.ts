import type { InvestigationFixture } from './investigation.ts';

export const demoContext = {
  tenantId: 'epsilon-demo',
  accountIds: ['meridian', 'northstar', 'aster', 'cedar'],
};

export const flagshipFixture: InvestigationFixture = {
  tenantId: 'epsilon-demo',
  accountId: 'meridian',
  caseId: 'CS-1042',
  report: 'Inference workload began failing after a deployment.',
  baseline: [{ requests: 9000, errors: 45 }, { requests: 1000, errors: 5 }],
  current: [{ requests: 7500, errors: 2250 }, { requests: 2500, errors: 750 }],
  credentialProbe: 'valid',
  previousClient: 'demo-client-1.4',
  currentClient: 'demo-client-1.5',
  previousClientProbe: 'passed',
  currentClientProbe: 'failed',
  regionalControl: 'healthy',
};

const fixtures: Record<string, InvestigationFixture> = {
  'CS-1042': flagshipFixture,
  'CS-1041': {
    tenantId: 'epsilon-demo',
    accountId: 'northstar',
    caseId: 'CS-1041',
    report: 'Model download returns 403.',
    baseline: [{ requests: 2000, errors: 4 }],
    current: [{ requests: 1000, errors: 1000 }],
    credentialProbe: 'invalid',
    previousClient: 'hub-client-0.34',
    currentClient: 'hub-client-0.34',
    previousClientProbe: 'unknown',
    currentClientProbe: 'unknown',
    regionalControl: 'healthy',
  },
  'CS-1040': {
    tenantId: 'epsilon-demo',
    accountId: 'aster',
    caseId: 'CS-1040',
    report: 'Inference latency and failures increased in EU.',
    baseline: [{ requests: 5000, errors: 20 }],
    current: [{ requests: 5000, errors: 850 }],
    credentialProbe: 'valid',
    previousClient: 'inference-client-2.1',
    currentClient: 'inference-client-2.1',
    previousClientProbe: 'passed',
    currentClientProbe: 'passed',
    regionalControl: 'degraded',
  },
  'CS-1039': {
    tenantId: 'epsilon-demo',
    accountId: 'meridian',
    caseId: 'CS-1039',
    report: 'Intermittent 429 responses during batch jobs.',
    baseline: [{ requests: 10000, errors: 50 }],
    current: [{ requests: 12000, errors: 600 }],
    credentialProbe: 'valid',
    previousClient: 'hub-client-0.34',
    currentClient: 'hub-client-0.34',
    previousClientProbe: 'passed',
    currentClientProbe: 'passed',
    regionalControl: 'healthy',
  },
  'CS-1038': {
    tenantId: 'epsilon-demo',
    accountId: 'cedar',
    caseId: 'CS-1038',
    report: 'Pinned model revision is not updating.',
    baseline: [],
    current: [],
    credentialProbe: 'valid',
    previousClient: null,
    currentClient: null,
    previousClientProbe: 'unknown',
    currentClientProbe: 'unknown',
    regionalControl: 'healthy',
  },
  'CS-1037': {
    tenantId: 'epsilon-demo',
    accountId: 'northstar',
    caseId: 'CS-1037',
    report: 'Large requests time out after a workload change.',
    baseline: [{ requests: 5000, errors: 25 }],
    current: [{ requests: 2000, errors: 320 }],
    credentialProbe: 'valid',
    previousClient: 'inference-client-2.0',
    currentClient: 'inference-client-2.0',
    previousClientProbe: 'passed',
    currentClientProbe: 'passed',
    regionalControl: 'healthy',
  },
};

export function fixtureForCase(caseId: string): InvestigationFixture {
  if (!Object.hasOwn(fixtures, caseId)) throw new Error('Unknown demo case');
  return structuredClone(fixtures[caseId]);
}
