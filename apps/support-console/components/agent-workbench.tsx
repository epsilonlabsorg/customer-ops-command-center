'use client';

import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Activity, Bot, BrainCircuit, CheckCircle2, Clock3, FileCheck2, FileText, LoaderCircle, Network, Play, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cases } from '@/lib/fixtures';
import type { AgentPolicyResult, AgentTraceStep, CustomerOpsGraphResult } from '@/lib/agent-graph';
import type { InvestigationResult } from '@/lib/investigation';
import type { OllamaDraft } from '@/lib/ollama';

type TopologyNode = { id: string; label: string; role: string; boundary: string };
type RunPayload = CustomerOpsGraphResult & { topology: TopologyNode[] };

const initialTopology: TopologyNode[] = [
  { id: 'scope_intake', label: 'Scope intake', role: 'Authorize case scope', boundary: 'Tenant and account gate' },
  { id: 'telemetry_analyst', label: 'Telemetry analyst', role: 'Calculate weighted rates', boundary: 'Validated counters only' },
  { id: 'diagnosis_investigator', label: 'Diagnosis investigator', role: 'Test competing causes', boundary: 'Abstain when uncertain' },
  { id: 'knowledge_researcher', label: 'Knowledge researcher', role: 'Retrieve public context', boundary: 'Bounded references' },
  { id: 'safety_guard', label: 'Safety guard', role: 'Classify proposed action', boundary: 'No unauthenticated writes' },
  { id: 'response_drafter', label: 'Ollama drafter', role: 'Draft communication', boundary: 'Optional and validated' },
  { id: 'finalize', label: 'Run finalizer', role: 'Return reviewable output', boundary: 'Proposal only' },
];

const nodeIcons = [ShieldCheck, Activity, BrainCircuit, Search, FileCheck2, Bot, FileText];
gsap.registerPlugin(useGSAP);

function RunSummary({ result, policy, draft }: { result: InvestigationResult; policy: AgentPolicyResult; draft: OllamaDraft | null }) {
  return <div className="agent-summary-grid">
    <div><span>Outcome</span><strong>{result.outcome === 'probable_cause' ? 'Probable cause' : 'Needs diagnostics'}</strong></div>
    <div><span>Cause</span><strong>{result.probableCause ?? 'Unresolved'}</strong></div>
    <div><span>Action gate</span><strong>{policy.decision.replaceAll('_', ' ')}</strong></div>
    <div><span>AI draft</span><strong>{draft ? draft.model : 'Deterministic only'}</strong></div>
  </div>;
}

export function AgentWorkbench() {
  const [caseId, setCaseId] = useState(cases[0].id);
  const [useModel, setUseModel] = useState(false);
  const [run, setRun] = useState<RunPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedNode, setSelectedNode] = useState(0);
  const scope = useRef<HTMLDivElement>(null);
  const topology = run?.topology ?? initialTopology;
  const completed = useMemo(() => new Map((run?.trace ?? []).map((step) => [step.node, step])), [run]);
  const totalDuration = (run?.trace ?? []).reduce((sum, step) => sum + step.durationMs, 0);
  const activeNode = topology[selectedNode] ?? topology[0];
  const activeStep = completed.get(activeNode.id as AgentTraceStep['node']);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const completedNodes = gsap.utils.toArray('.graph-node.complete', scope.current);
      if (completedNodes.length) gsap.fromTo(completedNodes, { y: 8 }, { y: 0, duration: .4, stagger: .045, clearProps: 'transform' });
      gsap.fromTo('.node-inspector', { y: 8 }, { y: 0, duration: .3, clearProps: 'transform' });
    });
    return () => media.revert();
  }, { scope, dependencies: [run, selectedNode], revertOnUpdate: true });

  async function execute() {
    setBusy(true);
    setError('');
    setRun(null);
    try {
      const response = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, useModel }),
      });
      if (!response.ok) throw new Error('Agent run failed');
      setRun(await response.json() as RunPayload);
    } catch {
      setError('The agent graph could not complete. Review the server log and keep the case open.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="agent-workbench" ref={scope}>
    <section className="agent-hero">
      <div>
        <div className="section-kicker"><Network size={17}/><span>LANGGRAPH CONTROL PLANE</span></div>
        <h2>Inspect every decision in the support workflow.</h2>
        <p>The graph separates deterministic evidence, public retrieval, policy enforcement, and optional Ollama drafting. Each node reports what it did and where it stopped.</p>
      </div>
      <div className="agent-controls">
        <label><span>CASE</span><select value={caseId} onChange={(event) => setCaseId(event.target.value)} disabled={busy}>{cases.map((item) => <option value={item.id} key={item.id}>{item.id} · {item.account}</option>)}</select></label>
        <label className="model-toggle"><input type="checkbox" checked={useModel} onChange={(event) => setUseModel(event.target.checked)} disabled={busy}/><span><strong>Use Ollama draft</strong><small>Runs after evidence and safety checks</small></span></label>
        <Button className="primary-button run-graph" onClick={() => void execute()} disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <Play/>}{busy ? 'Running graph…' : 'Run agent graph'}</Button>
      </div>
    </section>

    <section className="graph-card">
      <div className="graph-heading"><div><span className="eyebrow">EXECUTION GRAPH</span><h2>Seven bounded agents, one shared state</h2></div><span className="runtime-pill"><span/>@langchain/langgraph</span></div>
      <div className="graph-track">{topology.map((node, index) => {
        const Icon = nodeIcons[index] ?? BrainCircuit;
        const step = completed.get(node.id as AgentTraceStep['node']);
        const isSkipped = node.id === 'response_drafter' && run?.modelStatus === 'skipped';
        return <div className="graph-node-wrap" key={node.id}>
          <button aria-label={`Inspect ${node.label}`} aria-pressed={selectedNode === index} aria-controls="node-inspector" onClick={() => setSelectedNode(index)} className={`graph-node ${step ? 'complete' : isSkipped ? 'skipped' : ''}`}>
            <div className="node-number">{step ? <CheckCircle2/> : <Icon/>}</div>
            <span className="eyebrow">NODE {String(index + 1).padStart(2, '0')}</span>
            <strong className="node-label">{node.label}</strong>
            <p>{node.role}</p>
            <small>{node.boundary}</small>
            {step && <b>{step.durationMs} ms</b>}
            {isSkipped && <b>Skipped</b>}
          </button>
          {index < topology.length - 1 && <span className="graph-connector" aria-hidden="true"/>}
        </div>;
      })}</div>
      <div className="node-inspector" id="node-inspector" aria-live="polite" aria-atomic="true"><div><Network size={18}/><strong>{activeNode.label}</strong><span>{activeStep ? activeStep.status : busy ? 'Request in progress' : 'Not run'}</span></div><p>{activeStep ? activeStep.detail : activeNode.role + '. ' + activeNode.boundary + '.'}</p><small>{activeStep ? `${activeStep.durationMs} ms / recorded server trace` : 'Boundary: ' + activeNode.boundary}</small></div>
    </section>

    {error && <p className="error-notice" role="alert">{error}</p>}
    {!run && !busy && <section className="agent-empty"><BrainCircuit/><h2>Run a case through the graph</h2><p>Start with CS-1042 for a resolved client regression, or select CS-1038 to inspect a safe abstention path.</p></section>}
    {busy && <section className="agent-empty"><LoaderCircle className="spin"/><h2>Executing bounded agents</h2><p>Loading scope, calculating evidence, checking hypotheses, retrieving references, and evaluating the action boundary.</p></section>}

    {run && <>
      <RunSummary result={run.result} policy={run.policy} draft={run.draft}/>
      <div className="agent-output-grid">
        <section className="trace-panel">
          <div className="panel-title"><div><span className="eyebrow">RUN TRACE</span><h2>What happened</h2></div><span><Clock3/> {totalDuration} ms</span></div>
          <div className="trace-list">{run.trace.map((step, index) => <article key={`${step.node}-${index}`}>
            <span className={`trace-dot ${step.status}`}>{index + 1}</span>
            <div><div><strong>{step.label}</strong><span>{step.status}</span><small>{step.durationMs} ms</small></div><p>{step.detail}</p></div>
          </article>)}</div>
        </section>

        <section className="state-panel">
          <span className="eyebrow">FINAL STATE</span>
          <h2>{run.result.probableCause ?? 'Diagnosis intentionally unresolved'}</h2>
          <p>{run.result.conclusion}</p>
          <div className="state-rule"><ShieldCheck/><div><strong>{run.policy.actionType.replaceAll('_', ' ')}</strong><span>{run.policy.reason}</span></div><b>{run.policy.decision}</b></div>
          <div className="state-rule"><FileText/><div><strong>{run.knowledge.length} cited references</strong><span>Public context only; not causal proof.</span></div><b>bounded</b></div>
          <div className="state-rule"><Bot/><div><strong>{run.modelStatus.replaceAll('_', ' ')}</strong><span>Model output cannot authorize an action.</span></div><b>{run.draft ? 'validated' : 'no draft'}</b></div>
        </section>
      </div>

      <div className="agent-output-grid lower">
        <section className="evidence-panel">
          <span className="eyebrow">EVIDENCE STATE</span>
          <h2>{run.result.evidence.length} observations</h2>
          {run.result.evidence.map((item) => <article key={item.id}><span>{item.id}</span><div><strong>{item.title}</strong><p>{item.observation}</p></div></article>)}
        </section>
        <section className="reference-panel">
          <span className="eyebrow">RETRIEVAL STATE</span>
          <h2>Versioned references</h2>
          {run.knowledge.map((item) => <a href={item.url} target="_blank" rel="noreferrer" key={item.id}><Search/><div><strong>{item.title}</strong><span>{item.sourceType} · snapshot {item.snapshot}</span></div><b>score {item.score}</b></a>)}
          {run.knowledge.length === 0 && <p>No bounded reference matched this case.</p>}
        </section>
      </div>
    </>}

    <section className="agent-footnote"><ShieldCheck/><div><strong>Request-scoped execution</strong><p>This deployed prototype returns a complete trace but does not retain LangGraph checkpoints. Production human approvals should use a durable Postgres checkpointer and resume with the same thread ID.</p></div></section>
  </div>;
}
