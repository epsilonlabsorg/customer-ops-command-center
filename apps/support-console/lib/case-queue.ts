import type { SupportCase } from './fixtures';

export const queueStatuses = ['All cases', 'Investigating', 'Needs diagnostics', 'Escalated'] as const;
export type QueueStatus = typeof queueStatuses[number];

export function countCaseStatuses(records: readonly SupportCase[]): Record<QueueStatus, number> {
  const counts: Record<QueueStatus, number> = { 'All cases': records.length, Investigating: 0, 'Needs diagnostics': 0, Escalated: 0 };
  for (const item of records) counts[item.status]++;
  return counts;
}

export function filterCaseQueue(records: readonly SupportCase[], query: string, status: QueueStatus, priorityFirst = false): SupportCase[] {
  const search = query.trim().toLowerCase();
  const result = records.filter(item => (status === 'All cases' || item.status === status) && `${item.id} ${item.account} ${item.title} ${item.product}`.toLowerCase().includes(search));
  if (priorityFirst) result.sort((a, b) => a.priority.localeCompare(b.priority));
  return result;
}
