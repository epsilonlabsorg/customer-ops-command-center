'use client';

import { useMemo, useState } from 'react';
import { Bot, CheckCircle2, ExternalLink, LoaderCircle, PlayCircle, RotateCcw, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cases } from '@/lib/fixtures';
import type { SupportChatResponse } from '@/lib/chat';
import type { SyntheticWorkflowExecution } from '@/lib/workflow-executor';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: SupportChatResponse;
};

const prompts = [
  'What is the most likely root cause and what evidence supports it?',
  'What evidence weakens the other hypotheses?',
  'What should I ask the customer for next?',
];

function welcome(caseId: string): Message {
  return {
    id: 'welcome',
    role: 'assistant',
    content: `I am ready to investigate ${caseId}. I will run the bounded evidence graph first, then use Ollama to explain the result. Ask about the probable cause, competing hypotheses, or the safest next action.`,
  };
}

export function SupportAssistant() {
  const [caseId, setCaseId] = useState(cases[0].id);
  const [messages, setMessages] = useState<Message[]>([welcome(cases[0].id)]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [workflow, setWorkflow] = useState<SyntheticWorkflowExecution | null>(null);
  const lastResponse = useMemo(() => [...messages].reverse().find((message) => message.response)?.response ?? null, [messages]);

  function chooseCase(nextCaseId: string) {
    setCaseId(nextCaseId);
    setMessages([welcome(nextCaseId)]);
    setWorkflow(null);
    setError('');
  }

  async function sendMessage(text = input) {
    const message = text.trim();
    if (!message || busy) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: message };
    const history = messages
      .filter((item) => item.id !== 'welcome')
      .slice(-6)
      .map(({ role, content }) => ({ role, content }));

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setBusy(true);
    setError('');
    setWorkflow(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, message, history }),
      });
      if (!response.ok) throw new Error('Chat request failed');
      const payload = await response.json() as SupportChatResponse;
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: payload.reply.answer,
        response: payload,
      }]);
    } catch {
      setError('The assistant could not complete this turn. The case remains unchanged; try again or run the evidence graph.');
    } finally {
      setBusy(false);
    }
  }

  async function executeRecommendedAction() {
    if (!lastResponse || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          actionType: lastResponse.recommendedAction,
          confirmed: true,
          idempotencyKey: `${lastResponse.runId}:${lastResponse.recommendedAction}`,
        }),
      });
      if (!response.ok) throw new Error('Workflow execution failed');
      setWorkflow(await response.json() as SyntheticWorkflowExecution);
    } catch {
      setError('The workflow could not be completed. No external system was changed.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="assistant-shell">
    <section className="assistant-intro">
      <div>
        <div className="section-kicker"><Sparkles size={17}/><span>OLLAMA SUPPORT COPILOT</span></div>
        <h2>Investigate the case through conversation.</h2>
        <p>Every answer begins with the deterministic LangGraph investigation. Ollama explains verified evidence, while policy code controls actions.</p>
      </div>
      <label className="assistant-case-picker">
        <span>ACTIVE CASE</span>
        <select value={caseId} onChange={(event) => chooseCase(event.target.value)} disabled={busy}>
          {cases.map((item) => <option value={item.id} key={item.id}>{item.id} - {item.account}</option>)}
        </select>
      </label>
    </section>

    <div className="assistant-layout">
      <section className="chat-panel" aria-label="Support assistant conversation">
        <div className="chat-header">
          <div className="assistant-avatar"><Bot/></div>
          <div><strong>Customer Operations Agent</strong><span><i/>Ollama connected with deterministic fallback</span></div>
          <Button variant="ghost" size="icon" aria-label="Reset conversation" onClick={() => chooseCase(caseId)} disabled={busy}><RotateCcw/></Button>
        </div>

        <div className="chat-messages" aria-live="polite">
          {messages.map((message) => <article className={`chat-message ${message.role}`} key={message.id}>
            <span>{message.role === 'assistant' ? <Bot/> : 'You'}</span>
            <div>
              <p>{message.content}</p>
              {message.response && <div className="chat-evidence-summary">
                <span className={`confidence ${message.response.reply.confidence}`}>{message.response.reply.confidence} confidence</span>
                <span>{message.response.evidence.length} evidence items</span>
                <span>{message.response.trace.length} graph steps</span>
                <span>{message.response.reply.source === 'ollama' ? message.response.reply.model : 'deterministic fallback'}</span>
                <span>{message.response.persistence === 'supabase' ? 'Supabase persisted' : 'runtime only'}</span>
              </div>}
              {message.response && message.response.references.length > 0 && <div className="chat-references">
                {message.response.references.map((reference) => <a href={reference.url} target="_blank" rel="noreferrer" key={reference.id}>
                  <span>{reference.id}</span>{reference.title}<ExternalLink/>
                </a>)}
              </div>}
            </div>
          </article>)}
          {busy && !workflow && <article className="chat-message assistant"><span><Bot/></span><div className="assistant-thinking"><LoaderCircle className="spin"/><p>Running scope, telemetry, diagnosis, retrieval, and safety checks...</p></div></article>}
        </div>

        <div className="prompt-row">{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => void sendMessage(prompt)} disabled={busy}>{prompt}</button>)}</div>
        <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
          <Textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about evidence, hypotheses, or the safest next action..." maxLength={800} rows={3} disabled={busy}/>
          <div><span>{input.length}/800</span><Button className="primary-button" type="submit" disabled={busy || !input.trim()}><Send/>Send</Button></div>
        </form>
        {error && <p className="error-notice" role="alert">{error}</p>}
      </section>

      <aside className="assistant-context">
        <div className="context-heading"><span className="eyebrow">CURRENT CASE</span><h2>{caseId}</h2><p>{cases.find((item) => item.id === caseId)?.title}</p></div>
        {lastResponse ? <>
          <div className="context-block"><span>DIAGNOSIS</span><strong>{lastResponse.diagnosis.probableCause ?? 'Needs diagnostics'}</strong><p>{lastResponse.diagnosis.conclusion}</p></div>
          <div className="context-block"><span>NEXT BEST ACTION</span><strong>{lastResponse.recommendedAction.replaceAll('_', ' ')}</strong><p>{lastResponse.reply.nextBestAction}</p></div>
          <Button className="primary-button workflow-button" onClick={() => void executeRecommendedAction()} disabled={busy || Boolean(workflow)}>
            {busy ? <LoaderCircle className="spin"/> : workflow ? <CheckCircle2/> : <PlayCircle/>}
            {workflow ? 'Workflow completed' : 'Run synthetic workflow'}
          </Button>
          {workflow && <div className="workflow-receipt">
            <CheckCircle2/>
            <div><strong>{workflow.status.replaceAll('_', ' ')}</strong><p>{workflow.summary}</p><small>Audit {workflow.auditId.slice(0, 8)} - {workflow.persistence === 'supabase' ? 'durable Supabase record' : 'runtime record'}</small></div>
          </div>}
        </> : <div className="context-empty"><ShieldCheck/><strong>No unverified answer enters this panel.</strong><p>Ask a question to generate a scoped run, evidence trace, and policy-controlled action proposal.</p></div>}
        <div className="assistant-boundary"><ShieldCheck/><span>Public product references and synthetic customer data only. Secrets never enter prompts or browser responses.</span></div>
      </aside>
    </div>
  </div>;
}
