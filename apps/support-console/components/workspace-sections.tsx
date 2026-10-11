'use client';

import { Activity, ArrowUpRight, BookOpen, CheckCircle2, CircleDashed, Database, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveAccessPanel } from '@/components/live-access-panel';
import { calculateCustomerHealth } from '@/lib/customer-health';
import { cases, type SupportCase } from '@/lib/fixtures';
import results from '@/lib/foundation-results.json';
import benchmark from '@/lib/deterministic-report.json';
import { knowledgeItems } from '@/lib/knowledge';
import { detectIssueSignals } from '@/lib/systemic';

export function WorkspaceSection({ section, openCase }: { section: string; openCase: (item: SupportCase) => void }) {
  if (section === 'Customer 360') {
    return <div className="account-grid">{[...new Set(cases.map((item) => item.account))].map((account) => {
      const related = cases.filter((item) => item.account === account);
      const health = calculateCustomerHealth(account);
      return <section className="account-card" key={account}>
        <div className="inline-account"><span className="account-avatar large">{related[0].initials}</span><div><h2>{account}</h2><small>Synthetic account</small></div></div>
        <div className="account-stats"><div><strong>{health.score}</strong><span>Health signal</span></div><div><strong>{related.length}</strong><span>Open cases</span></div></div>
        <span className={'health-band ' + health.band}>{health.band}</span>
        <p className="account-signal">{health.reasons.join(' · ')}</p>
        <div className="account-case-list">{related.map((item) => <Button key={item.id} variant="ghost" onClick={() => openCase(item)}><span>{item.id} · {item.title}</span><ArrowUpRight size={16}/></Button>)}</div>
      </section>;
    })}</div>;
  }

  if (section === 'Emerging issues') {
    return <>
      <section className="signal-banner"><Activity/><div><h2>Shared symptoms need shared evidence.</h2><p>Signals are calculated from the six demo cases. Thresholds create candidates, not confirmed incidents.</p></div></section>
      <div className="account-grid">{detectIssueSignals().map((signal) => {
        const grouped = cases.filter((item) => item.product === signal.product);
        return <section className="account-card" key={signal.id}>
          <span className={'severity ' + (signal.confidence === 'candidate' ? 'sev-2' : 'sev-3')}>{signal.confidence}</span>
          <h2 className="group-title">{signal.title}</h2>
          <p className="account-signal">{signal.caseCount} cases across {signal.accountCount} accounts. {signal.reason}</p>
          <div className="account-case-list">{grouped.map((item) => <Button key={item.id} variant="ghost" onClick={() => openCase(item)}><span>{item.id} · {item.account}</span><ArrowUpRight size={16}/></Button>)}</div>
          <div className="detail-notice"><ShieldCheck size={16}/>No incident has been declared.</div>
        </section>;
      })}</div>
    </>;
  }

  if (section === 'Knowledge') {
    return <>
      <div className="section-note"><BookOpen size={17}/>Versioned public references and a synthetic runbook. Keyword search is available at /api/knowledge; vector retrieval is a deployment extension.</div>
      <div className="account-grid">{knowledgeItems.map((source) => <a className="account-card knowledge-card" key={source.id} href={source.url} target="_blank" rel="noreferrer">
        <span className="eyebrow">{source.sourceType} · SNAPSHOT {source.snapshot}</span>
        <h2>{source.title}<ArrowUpRight size={18}/></h2>
        <p className="account-signal">{source.summary}</p>
        <span className="source-host">{source.id}</span>
      </a>)}</div>
    </>;
  }

  if (section === 'Evaluations') {
    return <>
      <div className="evaluation-overview">{results.status === 'passed' ? <CheckCircle2 size={30}/> : <CircleDashed size={30}/>}<div><div className="eyebrow">FOUNDATION TEST RUN</div><h2>{results.status === 'not_run' ? 'Checks have not run yet.' : results.passed + ' of ' + results.total + ' checks passed.'}</h2><p>{results.recordedAt ? 'Recorded ' + results.recordedAt + '. Local fixture logic and database policies only.' : 'Results appear after the local suite runs.'}</p></div></div>
      <div className="benchmark-grid"><div><strong>{benchmark.totalCases}</strong><span>Deterministic cases</span></div><div><strong>{benchmark.metrics.diagnosisAccuracy === null ? '—' : Math.round(benchmark.metrics.diagnosisAccuracy * 100) + '%'}</strong><span>Rule diagnosis</span></div><div><strong>{benchmark.metrics.abstentionAccuracy === null ? '—' : Math.round(benchmark.metrics.abstentionAccuracy * 100) + '%'}</strong><span>Rule abstention</span></div><div><strong>{benchmark.metrics.securityCriticalViolations ?? '—'}</strong><span>Critical violations</span></div></div>
      <div className="account-grid">{[
        ['Telemetry calculations', 'Weighted error rates, empty windows, invalid counts, and overflow protection.'],
        ['Access boundaries', 'Two tenants, account scope, internal-note visibility, and blocked direct writes.'],
        ['Hypothesis discipline', 'Controlled comparisons, contradictory evidence, missing diagnostics, and untrusted ticket text.'],
        ['AI response safety', 'Server-only credentials, strict output validation, timeouts, and deterministic fallback.'],
      ].map(([title, text]) => <section className="account-card" key={title}><h2>{title}</h2><p className="account-signal">{text}</p></section>)}</div>
      <div className="section-note"><CircleDashed size={18}/>Live model accuracy, vector retrieval metrics, and production latency gates remain unmeasured. The deterministic application benchmark covers 650 cases.</div>
    </>;
  }

  return <section className="connections-panel">
    <div className="section-kicker"><KeyRound size={18}/><span>WORKSPACE CONNECTIONS</span></div>
    <h2>Configure once. Keep secrets on the server.</h2>
    <p>The console stays usable with synthetic fixtures. Enter credentials in the ignored root .env file; this screen never asks for or displays secrets.</p>
    <LiveAccessPanel/>
    <div className="connection-row"><Database/><div><h3>Supabase</h3><p>Project URL, browser publishable key, and optional server secret.</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_PUBLISHABLE_KEY<br/>SUPABASE_URL<br/>SUPABASE_SECRET_KEY</code></div><span className="severity sev-3">Optional live mode</span></div>
    <div className="connection-row"><Activity/><div><h3>Ollama</h3><p>The investigation endpoint can add a validated communication draft. Deterministic evidence remains the source of truth.</p><code>OLLAMA_API_KEY<br/>OLLAMA_BASE_URL<br/>OLLAMA_MODEL</code></div><span className="severity sev-3">Server only</span></div>
    <div className="section-note"><ShieldCheck size={18}/>Never place a secret or service-role key in a VITE_ variable.</div>
    <a className="source-link" href="https://supabase.com/docs/guides/getting-started/api-keys" target="_blank" rel="noreferrer">Where to find Supabase values<ArrowUpRight size={15}/></a>
  </section>;
}
