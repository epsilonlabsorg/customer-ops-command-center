'use client';

import { useCallback, useRef, useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, BookOpen, ChevronRight, Clock3, FlaskConical, Inbox, Layers3, LifeBuoy, MessageCircle, Network, Search, Settings2, ShieldCheck, Sparkles, Users, X, ArrowDownWideNarrow } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cases, snapshotLabel, type SupportCase } from '@/lib/fixtures';
import { InvestigationDialog } from '@/components/investigation-dialog';
import { AgentWorkbench } from '@/components/agent-workbench';
import { SupportAssistant } from '@/components/support-assistant';
import { WorkspaceSection } from '@/components/workspace-sections';
import { useCaseTools } from '@/hooks/use-case-tools';
import { countCaseStatuses, filterCaseQueue, queueStatuses as statuses, type QueueStatus } from '@/lib/case-queue';

const sections = [
  { name: 'Overview', icon: Layers3 },
  { name: 'Case queue', icon: Inbox },
  { name: 'Customer 360', icon: Users },
  { name: 'Emerging issues', icon: Activity },
  { name: 'Support assistant', icon: MessageCircle },
  { name: 'Agent graph', icon: Network },
  { name: 'Knowledge', icon: BookOpen },
  { name: 'Evaluations', icon: FlaskConical },
];
gsap.registerPlugin(useGSAP);
const counts = countCaseStatuses(cases);

export default function Home() {
  const [section, setSection] = useState('Overview');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<QueueStatus>('All cases');
  const [priorityFirst, setPriorityFirst] = useState(false);
  const scope = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<SupportCase | null>(null);
  const openCase = useCallback((item: SupportCase) => setSelected(item), []);
  useCaseTools(openCase);
  const filtered = filterCaseQueue(cases, query, status, priorityFirst);
  const changeSection = (name: string) => { setSection(name); setSelected(null); };
  const selectQueue = (value: QueueStatus) => { setStatus(value); setSection('Case queue'); setSelected(null); };
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('.main-content > :not(.disclosure)', { y: 10 }, { y: 0, duration: .35, stagger: .035, ease: 'power2.out', clearProps: 'transform' });
    });
    return () => media.revert();
  }, { scope, dependencies: [section], revertOnUpdate: true });
  return (
    <div className="workspace" ref={scope}>
      <a href="#main" className="skip-link">Skip to workspace</a>
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Epsilon Labs home"><span className="brand-mark">ε</span><span>epsilon<span className="brand-light">labs</span><small>CUSTOMER OPERATIONS</small></span></a>
        <div className="workspace-picker"><span className="workspace-icon">E</span><div>Epsilon workspace<small>Developer platform support</small></div><ChevronRight size={15}/></div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">{sections.map(({name, icon: Icon}) => <Button key={name} variant="ghost" className={`nav-item ${section === name ? 'active' : ''}`} onClick={() => changeSection(name)} aria-label={name} title={name} aria-current={section === name ? 'page' : undefined}><Icon size={18}/><span>{name}</span>{name === 'Case queue' && <span className="nav-count">{cases.length}</span>}</Button>)}</nav>
        <div className="sidebar-bottom"><div className="boundary-note"><ShieldCheck size={19}/><strong>Built around evidence.</strong><p>Public product knowledge.<br/>Synthetic customer data.</p></div><Button variant="ghost" className="nav-item" onClick={() => changeSection('Connections')}><Settings2 size={18}/><span>Connections</span></Button><a className="nav-item help-link" href="https://huggingface.co/docs/huggingface_hub/index" target="_blank" rel="noreferrer"><LifeBuoy size={18}/><span>Product documentation</span><ArrowUpRight size={14}/></a><div className="user"><span className="avatar">GD</span><div>Demo workspace<small>Support engineer</small></div><span className="online-dot"/></div></div>
      </aside>
      <div className="main-shell">
        <header className="topbar"><div className="breadcrumb">Workspace <ChevronRight size={13}/><strong>{section}</strong></div><div className="topbar-right"><span className="sandbox"><span/>Synthetic sandbox</span><span className="topbar-divider"/><span className="avatar small">GD</span></div></header>
        <main id="main" className="main-content">
          <div className="page-heading"><div><div className="eyebrow">CUSTOMER OPERATIONS COMMAND CENTER</div><h1>{section === 'Overview' ? 'Operations overview' : section}</h1><p>A clear view of your customers, their cases, and what needs attention.</p></div><span className="snapshot"><Clock3 size={14}/> {snapshotLabel}</span></div>
          {(section === 'Overview' || section === 'Case queue') ? <>
            <div className="queue-controls">
              <div className="queue-statuses" role="group" aria-label="Filter case status">{statuses.map(value => <button key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>{value}<span>{counts[value]}</span></button>)}</div>
              <div className="queue-actions"><Button variant="ghost" size="icon" aria-label="Sort by priority" title="Sort by priority" aria-pressed={priorityFirst} onClick={() => setPriorityFirst(!priorityFirst)}><ArrowDownWideNarrow size={18}/></Button>{(status !== 'All cases' || query) && <Button variant="ghost" size="icon" aria-label="Clear filters" title="Clear filters" onClick={() => { setStatus('All cases'); setQuery(''); }}><X size={17}/></Button>}</div>
              <span className="sr-only" role="status">{filtered.length} matching cases</span>
            </div>
            <div className="metrics">
              {[{name:'Open cases',status:'All cases' as QueueStatus,value:cases.length,detail:'Across 4 synthetic accounts',icon:Inbox},{name:'In investigation',status:'Investigating' as QueueStatus,value:cases.filter(c => c.status === 'Investigating').length,detail:'Evidence gathering in progress',icon:Sparkles},{name:'Needs diagnostics',status:'Needs diagnostics' as QueueStatus,value:cases.filter(c => c.status === 'Needs diagnostics').length,detail:'Waiting for specific evidence',icon:Clock3},{name:'Engineering handoffs',status:'Escalated' as QueueStatus,value:cases.filter(c => c.status === 'Escalated').length,detail:'Ready for specialist review',icon:ArrowUpRight}].map(({name,status:target,value,detail,icon:Icon}) => <button className="metric" key={name} onClick={() => selectQueue(target)} aria-label={`View ${name.toLowerCase()}`}><span className="metric-label">{name}<Icon size={17}/></span><strong>{value.toString().padStart(2,'0')}</strong><span className="metric-detail">{detail}</span></button>)}
            </div>
            {section === 'Overview' && <div className="focus-grid"><section className="priority-case"><div className="section-kicker"><span className="severity sev-1">Sev 1</span><span>PRIORITY INVESTIGATION</span><span className="case-id">CS-1042</span></div><h2>What changed after the deployment?</h2><p>Meridian AI’s inference workload is failing. Start with the timeline, test competing causes, and prepare the escalation call.</p><div className="focus-footer"><div className="inline-account"><span className="account-avatar">MA</span><span>Meridian AI<small>Enterprise · Inference</small></span></div><Button className="primary-button" onClick={() => openCase(cases[0])}>Open investigation<ArrowRight size={16}/></Button></div></section><section className="queue-distribution" aria-labelledby="distribution-title"><h2 id="distribution-title">Queue distribution</h2>{statuses.slice(1).map(value => { const count = cases.filter(item => item.status === value).length; return <button key={value} onClick={() => selectQueue(value)}><span>{value}</span><svg viewBox="0 0 120 8" aria-hidden="true"><path d={`M0 4H${count / cases.length * 120}`}/></svg><strong>{count}</strong><ArrowUpRight size={14}/></button>; })}<p>Synthetic snapshot. No live customer information.</p></section></div>}
            <section className="case-panel"><div className="panel-heading"><div><h2>Cases needing attention <span className="count-pill">{cases.length}</span></h2><p>Investigate, collect evidence, and make the next step clear.</p></div><div className="search-field"><Search size={16}/><Input aria-label="Search cases" placeholder="Search cases or accounts…" value={query} onChange={event => setQuery(event.target.value)}/></div></div><div className="table-scroll"><table><thead><tr><th>CASE / SUBJECT</th><th>ACCOUNT</th><th>PRIORITY</th><th>STATUS</th><th>UPDATED</th><th><span className="sr-only">Open case</span></th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><button className="case-link" onClick={() => openCase(item)}><span>{item.id}<span className="product-tag">{item.product}</span></span><strong>{item.title}</strong></button></td><td><div className="inline-account"><span className="account-avatar">{item.initials}</span>{item.account}</div></td><td><span className={`severity ${item.priority === 'Sev 1' ? 'sev-1' : item.priority === 'Sev 2' ? 'sev-2' : 'sev-3'}`}>{item.priority}</span></td><td><span className={`status status-${item.status.split(' ')[0].toLowerCase()}`}><span/>{item.status}</span></td><td className="muted">{item.updated}</td><td><Button variant="ghost" size="icon" aria-label={`Open ${item.id}`} onClick={() => openCase(item)}><ArrowUpRight size={17}/></Button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><Search/><h3>No matching cases</h3><p>Try a case number, product, or account name.</p><Button variant="outline" onClick={() => setQuery('')}>Clear search</Button></div>}</div><div className="table-footer">Showing {filtered.length} of {cases.length} cases<span>Snapshot data · No live customer information</span></div></section>
          </> : section === 'Support assistant' ? <SupportAssistant/> : section === 'Agent graph' ? <AgentWorkbench/> : <WorkspaceSection section={section} openCase={openCase}/>}

          <footer className="disclosure"><span className="brand-mark mini">ε</span><span>An independent Epsilon Labs prototype. Not affiliated with Hugging Face. Accounts, telemetry, and cases are synthetic.</span><span>PROJECT 03</span></footer>
        </main>
      </div>
      <InvestigationDialog key={selected?.id || 'closed'} selected={selected} close={() => setSelected(null)}/>
    </div>
  );
}
