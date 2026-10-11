export type SupportCase = {
  id: string; account: string; initials: string; title: string; product: string;
  priority: 'Sev 1' | 'Sev 2' | 'Sev 3'; status: 'Investigating' | 'Needs diagnostics' | 'Escalated';
  owner: string; updated: string; summary: string;
};
export const cases: SupportCase[] = [
  { id: 'CS-1042', account: 'Meridian AI', initials: 'MA', title: 'Inference failures after a client deployment', product: 'Inference', priority: 'Sev 1', status: 'Investigating', owner: 'Alex Chen', updated: '12 min', summary: 'Our enterprise inference workload started failing after yesterday’s deployment. The team says nothing changed. Investigate before the escalation call.' },
  { id: 'CS-1041', account: 'Northstar Labs', initials: 'NL', title: 'Model download returns an access error', product: 'Hub', priority: 'Sev 2', status: 'Needs diagnostics', owner: 'Sam Rivera', updated: '24 min', summary: 'A previously accessible model now returns 403. Confirm the repository, runtime version, and account entitlement before proposing a change.' },
  { id: 'CS-1040', account: 'Aster Research', initials: 'AR', title: 'Latency increased in the EU region', product: 'Inference', priority: 'Sev 2', status: 'Investigating', owner: 'Alex Chen', updated: '38 min', summary: 'Customers report slower inference. Compare traffic, endpoint configuration, and regional telemetry before attributing the change to an incident.' },
  { id: 'CS-1039', account: 'Meridian AI', initials: 'MA', title: 'Intermittent rate limits during batch jobs', product: 'Hub', priority: 'Sev 2', status: 'Escalated', owner: 'Sam Rivera', updated: '1 hr', summary: 'Batch workloads show intermittent 429 responses. Gather request concurrency and retry behavior for the engineering handoff.' },
  { id: 'CS-1038', account: 'Cedar Systems', initials: 'CS', title: 'Pinned model revision is not updating', product: 'Hub', priority: 'Sev 3', status: 'Needs diagnostics', owner: 'Alex Chen', updated: '2 hr', summary: 'A deployment still serves the old model behavior. Ask for the exact revision, dependency lockfile, and cache configuration.' },
  { id: 'CS-1037', account: 'Northstar Labs', initials: 'NL', title: 'Timeouts after increasing workload size', product: 'Inference', priority: 'Sev 3', status: 'Needs diagnostics', owner: 'Sam Rivera', updated: '3 hr', summary: 'Larger requests time out after a release. Compare observed latency with the configured timeout and request size.' },
];
export const snapshotLabel = '12 Sep 2026 · 10:00 UTC';
