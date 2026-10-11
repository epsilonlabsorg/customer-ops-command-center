import { cases } from './fixtures.ts';

export type CustomerHealth = {
  account: string;
  score: number;
  band: 'attention' | 'watch' | 'stable';
  reasons: string[];
};

export function calculateCustomerHealth(account: string): CustomerHealth {
  const related = cases.filter((item) => item.account === account);
  const sev1 = related.filter((item) => item.priority === 'Sev 1').length;
  const sev2 = related.filter((item) => item.priority === 'Sev 2').length;
  const diagnostics = related.filter((item) => item.status === 'Needs diagnostics').length;
  const score = Math.max(0, 100 - sev1 * 35 - sev2 * 15 - diagnostics * 8);
  const reasons = [
    ...(sev1 ? [`${sev1} unresolved Sev 1 case`] : []),
    ...(sev2 ? [`${sev2} active Sev 2 case${sev2 > 1 ? 's' : ''}`] : []),
    ...(diagnostics ? [`${diagnostics} case${diagnostics > 1 ? 's' : ''} waiting for diagnostics`] : []),
  ];
  return {
    account,
    score,
    band: score < 55 ? 'attention' : score < 80 ? 'watch' : 'stable',
    reasons: reasons.length ? reasons : ['No high-severity demo cases'],
  };
}
