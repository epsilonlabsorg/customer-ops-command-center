'use client';

import { useState } from 'react';
import { ArrowUpRight, BookOpen, Bot, CheckCircle2, Download, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { SupportCase } from '@/lib/fixtures';
import { buildBrief, investigate, type InvestigationResult } from '@/lib/investigation';
import { fixtureForCase, demoContext } from '@/lib/demo-investigations';
import type { KnowledgeItem } from '@/lib/knowledge';
import type { OllamaDraft } from '@/lib/ollama';
import type { AgentPolicyResult, AgentTraceStep } from '@/lib/agent-graph';

type ApiPayload = {
  result: InvestigationResult;
  knowledge: Array<KnowledgeItem & { score: number }>;
  draft: OllamaDraft | null;
  modelStatus: 'ready' | 'skipped' | 'not_configured' | 'unavailable';
  trace: AgentTraceStep[];
  policy: AgentPolicyResult;
};

export function InvestigationDialog({ selected, close }: { selected: SupportCase | null; close: () => void }) {
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [knowledge, setKnowledge] = useState<Array<KnowledgeItem & { score: number }>>([]);
  const [draft, setDraft] = useState<OllamaDraft | null>(null);
  const [modelStatus, setModelStatus] = useState<ApiPayload['modelStatus'] | null>(null);
  const [trace, setTrace] = useState<AgentTraceStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [staged, setStaged] = useState(false);
  const [error, setError] = useState('');

  function runEvidenceOnly() {
    if (!selected) return;
    try {
      setError('');
      setDraft(null);
      setModelStatus('skipped');
      setTrace([]);
      setResult(investigate(fixtureForCase(selected.id), demoContext.tenantId, demoContext.accountIds));
    } catch {
      setError('The checks could not complete. Keep the case open and request engineering review.');
    }
  }

  async function runFullInvestigation() {
    if (!selected) return;
    setBusy(true);
    setError('');
    setStaged(false);
    try {
      const response = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: selected.id, useModel: true }),
      });
      if (!response.ok) throw new Error('Investigation failed');
      const payload = await response.json() as ApiPayload;
      setResult(payload.result);
      setKnowledge(payload.knowledge);
      setDraft(payload.draft);
      setModelStatus(payload.modelStatus);
      setTrace(payload.trace ?? []);
    } catch {
      runEvidenceOnly();
      setError('The server draft was unavailable. Deterministic evidence checks completed locally.');
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!result) return;
    const modelSection = draft ? ['','## Ollama communication draft', draft.summary, '', draft.customerReply].join('\n') : '';
    const href = URL.createObjectURL(new Blob([buildBrief(result) + modelSection], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = result.caseId + '-synthetic-brief.md';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  return <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) close(); }}>
    {selected && <DialogContent className="case-dialog">
      <div className="detail-top"><span className="eyebrow">{selected.id} / SYNTHETIC CASE</span></div>
      <span className={'severity ' + (selected.priority === 'Sev 1' ? 'sev-1' : selected.priority === 'Sev 2' ? 'sev-2' : 'sev-3')}>{selected.priority}</span>
      <DialogTitle className="case-dialog-title">{selected.title}</DialogTitle>
      <DialogDescription className="sr-only">Review synthetic evidence, test competing hypotheses, and prepare a safe handoff.</DialogDescription>
      <div className="inline-account"><span className="account-avatar">{selected.initials}</span>{selected.account}<span className="product-tag">{selected.product}</span></div>
      <div className="customer-message"><span className="eyebrow">CUSTOMER REPORT · UNTRUSTED SYNTHETIC TEXT</span><p>{selected.summary}</p></div>
      <div className="investigation-actions">
        <Button className="primary-button" onClick={() => void runFullInvestigation()} disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <Sparkles/>}{busy ? 'Investigating…' : 'Run investigation'}</Button>
        <Button variant="outline" onClick={runEvidenceOnly} disabled={busy}>Evidence only</Button>
      </div>
      {error && <p role="alert" className="error-notice">{error}</p>}

      {result ? <div aria-live="polite">
        <section className="evidence-overview">
          <div><span className="eyebrow">EVIDENCE OVERVIEW</span><h3>{result.outcome === 'probable_cause' ? 'One cause is supported by controlled checks.' : 'The evidence is incomplete.'}</h3></div>
          <span className={'severity ' + (result.outcome === 'probable_cause' ? 'sev-3' : 'sev-2')}>{result.outcome === 'probable_cause' ? 'Probable cause' : 'Needs context'}</span>
          <p>{result.conclusion}</p>
        </section>

        {trace.length > 0 && <section className="agent-run-strip">
          <div><span className="eyebrow">LANGGRAPH RUN</span><strong>{trace.length} nodes completed</strong></div>
          <div>{trace.map((step) => <span key={step.node} title={step.detail}><CheckCircle2/>{step.label}<small>{step.durationMs} ms</small></span>)}</div>
        </section>}

        <h3 className="detail-section-title">Observed evidence</h3>
        <div className="evidence-list">{result.evidence.map((item) => <article key={item.id}><span className="evidence-id">{item.id}</span><div><strong>{item.title}</strong><p>{item.observation}</p></div></article>)}</div>

        <h3 className="detail-section-title">Competing hypotheses</h3>
        {result.hypotheses.map((hypothesis) => <article className="hypothesis" key={hypothesis.title}>
          <div><strong>{hypothesis.title}</strong><span className={'severity ' + (hypothesis.status === 'Supported' ? 'sev-3' : 'sev-2')}>{hypothesis.status}</span></div>
          <p><b>For:</b> {hypothesis.evidenceFor.join(' ') || 'No supporting observation available.'}</p>
          <p><b>Against:</b> {hypothesis.evidenceAgainst.join(' ') || 'No counterevidence established.'}</p>
        </article>)}

        <section className="next-step">
          <span className="eyebrow">{result.outcome === 'needs_diagnostics' ? 'MISSING CONTEXT / REQUEST NEXT' : 'SAFE NEXT STEP'}</span>
          <p>{result.nextStep}</p>
        </section>

        {knowledge.length > 0 && <section>
          <h3 className="detail-section-title">Relevant public references</h3>
          <div className="reference-list">{knowledge.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer"><BookOpen/><span><strong>{item.title}</strong><small>{item.sourceType} · snapshot {item.snapshot}</small></span><ArrowUpRight/></a>)}</div>
          <p className="reference-note">References provide public context. They do not prove this synthetic customer root cause.</p>
        </section>}

        {draft && <section className="ai-draft">
          <div className="section-kicker"><Bot/><span>OLLAMA DRAFT · {draft.model}</span></div>
          <h3>{draft.escalationTitle}</h3>
          <p>{draft.summary}</p>
          <div className="customer-draft"><span className="eyebrow">CUSTOMER REPLY DRAFT · HUMAN REVIEW REQUIRED</span><p>{draft.customerReply}</p></div>
        </section>}
        {modelStatus && modelStatus !== 'ready' && <div className="model-state"><ShieldCheck/>{modelStatus === 'not_configured' ? 'Ollama is not configured. The deterministic investigation is complete.' : modelStatus === 'unavailable' ? 'Ollama was unavailable or returned invalid output. No model text was used.' : 'Model drafting was skipped.'}</div>}

        <div className="workflow-actions">
          <Button variant="outline" onClick={() => setStaged(true)} disabled={staged}><CheckCircle2/>{staged ? 'Handoff staged' : 'Stage engineering handoff'}</Button>
          <Button variant="outline" onClick={download}><Download/>Download brief</Button>
        </div>
        {staged && <p className="staged-note">Staged in this session only. A live write requires authenticated Supabase access, an exact action digest, and server-side authorization.</p>}
      </div> : <div className="before-investigation">
        <h3>Test the explanation, then draft the response.</h3>
        <p>{selected.id === 'CS-1042' ? 'The workflow compares weighted error rates, client versions, credential validity, and a regional control. Ollama may draft communication after deterministic checks complete.' : 'This case intentionally lacks context. A safe investigation should ask for the smallest useful diagnostic.'}</p>
      </div>}

      <div className="detail-notice"><ShieldCheck/>Ticket text and public content are evidence, never executable instructions. No account-sensitive action runs autonomously.</div>
    </DialogContent>}
  </Dialog>;
}
