export type TelemetryBucket = { requests: number; errors: number };

export type InvestigationFixture = {
  tenantId: string;
  accountId: string;
  caseId: string;
  report: string;
  baseline: TelemetryBucket[];
  current: TelemetryBucket[];
  credentialProbe: 'valid' | 'invalid' | 'unknown';
  previousClient: string | null;
  currentClient: string | null;
  previousClientProbe: 'passed' | 'failed' | 'unknown';
  currentClientProbe: 'passed' | 'failed' | 'unknown';
  regionalControl: 'healthy' | 'degraded' | 'unknown';
};

export type Hypothesis = {
  title: string;
  status: 'Supported' | 'Weakened' | 'Unresolved';
  evidenceFor: string[];
  evidenceAgainst: string[];
};

export type InvestigationResult = {
  mode: 'deterministic-fixture';
  caseId: string;
  outcome: 'probable_cause' | 'needs_diagnostics';
  probableCause: string | null;
  baselineErrorRate: number | null;
  currentErrorRate: number | null;
  hypotheses: Hypothesis[];
  conclusion: string;
  nextStep: string;
  evidence: { id: string; title: string; observation: string }[];
};

export function errorRate(buckets: TelemetryBucket[]): number | null {
  let requests = 0;
  let errors = 0;
  for (const bucket of buckets) {
    if (
      !Number.isSafeInteger(bucket.requests) ||
      !Number.isSafeInteger(bucket.errors) ||
      bucket.requests < 0 ||
      bucket.errors < 0 ||
      bucket.errors > bucket.requests
    ) throw new Error('Invalid telemetry counts');
    requests += bucket.requests;
    errors += bucket.errors;
    if (!Number.isSafeInteger(requests) || !Number.isSafeInteger(errors)) {
      throw new Error('Telemetry totals exceed safe limits');
    }
  }
  return requests === 0 ? null : errors / requests;
}

export function investigate(
  fixture: InvestigationFixture,
  tenantId: string,
  accountIds: readonly string[],
): InvestigationResult {
  if (fixture.tenantId !== tenantId || !accountIds.includes(fixture.accountId)) {
    throw new Error('Account access denied');
  }

  const baselineErrorRate = errorRate(fixture.baseline);
  const currentErrorRate = errorRate(fixture.current);
  const enoughTelemetry =
    baselineErrorRate !== null &&
    currentErrorRate !== null &&
    currentErrorRate > baselineErrorRate;
  const changedClient = Boolean(
    fixture.previousClient &&
    fixture.currentClient &&
    fixture.previousClient !== fixture.currentClient,
  );
  const clientSupported =
    changedClient &&
    fixture.previousClientProbe === 'passed' &&
    fixture.currentClientProbe === 'failed' &&
    fixture.credentialProbe === 'valid' &&
    fixture.regionalControl === 'healthy';
  const credentialSupported = fixture.credentialProbe === 'invalid';
  const regionSupported =
    fixture.regionalControl === 'degraded' &&
    fixture.credentialProbe === 'valid' &&
    fixture.currentClientProbe !== 'failed';

  const evidence = [
    {
      id: 'E1',
      title: 'Request counters',
      observation: baselineErrorRate === null || currentErrorRate === null
        ? 'At least one comparison window has no requests. A rate comparison is unavailable.'
        : `Error rate: ${(baselineErrorRate * 100).toFixed(1)}% before deployment → ${(currentErrorRate * 100).toFixed(1)}% after deployment, using summed request/error counts.`,
    },
    {
      id: 'E2',
      title: 'Client deployment',
      observation: changedClient
        ? `Synthetic client changed from ${fixture.previousClient} to ${fixture.currentClient}.`
        : 'A client-version change has not been established.',
    },
    {
      id: 'E3',
      title: 'Credential check',
      observation: `Synthetic credential probe: ${fixture.credentialProbe}.`,
    },
    {
      id: 'E4',
      title: 'Controlled version comparison',
      observation: `Same-account test: previous client ${fixture.previousClientProbe}; current client ${fixture.currentClientProbe}.`,
    },
    {
      id: 'E5',
      title: 'Regional control',
      observation: `Same-region control workload: ${fixture.regionalControl}.`,
    },
  ];

  const hypotheses: Hypothesis[] = [
    {
      title: 'Client-version regression',
      status: clientSupported ? 'Supported' : fixture.currentClientProbe === 'passed' ? 'Weakened' : 'Unresolved',
      evidenceFor: changedClient
        ? ['E2: A client version changed during deployment.', ...(fixture.currentClientProbe === 'failed' && fixture.previousClientProbe === 'passed' ? ['E4: Only the new client fails the controlled check.'] : [])]
        : [],
      evidenceAgainst: fixture.currentClientProbe === 'passed' ? ['E4: The current client passed its controlled check.'] : [],
    },
    {
      title: 'Invalid or expired credential',
      status: credentialSupported ? 'Supported' : fixture.credentialProbe === 'valid' ? 'Weakened' : 'Unresolved',
      evidenceFor: credentialSupported ? ['E3: The credential probe failed.'] : [],
      evidenceAgainst: fixture.credentialProbe === 'valid' ? ['E3: The credential probe passed.'] : [],
    },
    {
      title: 'Regional service degradation',
      status: regionSupported ? 'Supported' : fixture.regionalControl === 'healthy' ? 'Weakened' : 'Unresolved',
      evidenceFor: regionSupported ? ['E5: The same-region control workload is also degraded.'] : [],
      evidenceAgainst: fixture.regionalControl === 'healthy' ? ['E5: The same-region control workload is healthy.'] : [],
    },
  ];

  const supported = hypotheses.filter((item) => item.status === 'Supported');
  const resolved = enoughTelemetry && supported.length === 1;
  const probableCause = resolved ? supported[0].title : null;

  const conclusions: Record<string, string> = {
    'Client-version regression': 'The synthetic evidence supports a client-version regression as the probable cause. The controlled comparison is stronger than timing alone. This does not establish a real Hugging Face regression.',
    'Invalid or expired credential': 'The synthetic evidence supports an invalid or expired credential as the probable cause. The result comes from a scoped credential probe; the credential value is never placed in model context.',
    'Regional service degradation': 'The synthetic evidence supports regional service degradation as the probable cause because an independent same-region control is also degraded.',
  };
  const nextSteps: Record<string, string> = {
    'Client-version regression': 'Prepare an engineering brief with E1–E5. Recommend testing the previous client in a controlled environment; do not change the customer deployment automatically.',
    'Invalid or expired credential': 'Ask an authorized account owner to replace or revalidate the credential through the secure workflow. Never request the credential value in a ticket.',
    'Regional service degradation': 'Open a synthetic incident candidate for authorized staff review and offer a documented regional workaround when available.',
  };

  const missingDiagnostic = !enoughTelemetry
    ? 'Request comparable before/after request and error counts.'
    : !changedClient
      ? 'Request the exact deployed and previous client versions.'
      : fixture.previousClientProbe === 'unknown' || fixture.currentClientProbe === 'unknown'
        ? 'Request the same-account result on the previous and current client versions, with secrets removed.'
        : fixture.credentialProbe === 'unknown'
          ? 'Request a scoped credential-validity result without sharing the credential.'
          : fixture.regionalControl === 'unknown'
            ? 'Request a same-region control workload comparison.'
            : supported.length > 1
              ? 'Two causes remain supported. Request one controlled check that isolates credential and regional behavior.'
              : 'Request a controlled comparison that distinguishes credentials, client version, and regional behavior.';

  return {
    mode: 'deterministic-fixture',
    caseId: fixture.caseId,
    outcome: resolved ? 'probable_cause' : 'needs_diagnostics',
    probableCause,
    baselineErrorRate,
    currentErrorRate,
    evidence,
    hypotheses,
    conclusion: resolved
      ? conclusions[probableCause as string]
      : 'The available evidence does not establish one root cause. Keep the case open and request the smallest missing diagnostic.',
    nextStep: resolved ? nextSteps[probableCause as string] : missingDiagnostic,
  };
}

export function buildBrief(result: InvestigationResult): string {
  return [
    '# ' + result.caseId + ' — engineering handoff',
    'Synthetic fixture investigation. No live customer system was used.',
    '',
    '## Assessment',
    result.conclusion,
    '',
    '## Observations',
    ...result.evidence.map((item) => '- ' + item.id + ' | ' + item.title + ': ' + item.observation),
    '',
    '## Hypotheses',
    ...result.hypotheses.map((item) => '- ' + item.title + ': ' + item.status),
    '',
    '## Next step',
    result.nextStep,
    '',
  ].join('\n');
}
