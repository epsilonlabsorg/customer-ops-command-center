import { cases } from './fixtures.ts';

export type IssueSignal = {
  id: string;
  title: string;
  product: string;
  caseCount: number;
  accountCount: number;
  confidence: 'candidate' | 'insufficient';
  reason: string;
};

export function detectIssueSignals(): IssueSignal[] {
  return [...new Set(cases.map((item) => item.product))].map((product) => {
    const grouped = cases.filter((item) => item.product === product);
    const accountCount = new Set(grouped.map((item) => item.account)).size;
    const candidate = grouped.length >= 3 && accountCount >= 2;
    return {
      id: `SIG-${product.toUpperCase()}`,
      title: `${product} support pattern`,
      product,
      caseCount: grouped.length,
      accountCount,
      confidence: candidate ? 'candidate' : 'insufficient',
      reason: candidate
        ? 'The demo threshold is met. Version and error-signature checks are required before declaring an incident.'
        : 'The demo threshold requires at least three cases across two accounts.',
    };
  });
}
