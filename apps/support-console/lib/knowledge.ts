export type KnowledgeItem = {
  id: string;
  title: string;
  sourceType: 'documentation' | 'issue' | 'runbook';
  product: 'Hub' | 'Inference' | 'Security';
  url: string;
  snapshot: string;
  summary: string;
  keywords: string[];
};

export const knowledgeItems: KnowledgeItem[] = [
  {
    id: 'DOC-HUB-AUTH',
    title: 'Hub authentication overview',
    sourceType: 'documentation',
    product: 'Hub',
    url: 'https://huggingface.co/docs/huggingface_hub/package_reference/authentication',
    snapshot: '2026-09-12',
    summary: 'Official public reference for sign-in, token handling, and authentication helpers.',
    keywords: ['401', '403', 'authentication', 'token', 'login', 'whoami'],
  },
  {
    id: 'DOC-HUB-DOWNLOAD',
    title: 'Downloading files from the Hub',
    sourceType: 'documentation',
    product: 'Hub',
    url: 'https://huggingface.co/docs/huggingface_hub/guides/download',
    snapshot: '2026-09-12',
    summary: 'Official public guide for downloads, revisions, and local cache behavior.',
    keywords: ['download', 'revision', 'cache', 'snapshot', 'repository'],
  },
  {
    id: 'DOC-INFERENCE-CLIENT',
    title: 'Inference client reference',
    sourceType: 'documentation',
    product: 'Inference',
    url: 'https://huggingface.co/docs/huggingface_hub/guides/inference',
    snapshot: '2026-09-12',
    summary: 'Official public guide for inference clients, providers, request options, and usage.',
    keywords: ['inference', 'timeout', 'provider', 'client', 'request'],
  },
  {
    id: 'ISSUES-HUB-PUBLIC',
    title: 'huggingface_hub public issue history',
    sourceType: 'issue',
    product: 'Hub',
    url: 'https://github.com/huggingface/huggingface_hub/issues',
    snapshot: '2026-09-12',
    summary: 'Public reports can supply error patterns and workarounds. They are not proof of a customer root cause.',
    keywords: ['regression', 'error', 'version', 'bug', 'workaround'],
  },
  {
    id: 'RUNBOOK-SAFE-DIAGNOSTICS',
    title: 'Synthetic safe-diagnostics runbook',
    sourceType: 'runbook',
    product: 'Security',
    url: 'https://genai.owasp.org/llm-top-10/',
    snapshot: '2026-09-12',
    summary: 'Remove secrets, request the smallest missing diagnostic, and require authorization for sensitive changes.',
    keywords: ['redact', 'secret', 'diagnostic', 'approval', 'authorization'],
  },
];

export function searchKnowledge(query: string, product?: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 12);
  return knowledgeItems
    .filter((item) => !product || item.product.toLowerCase() === product.toLowerCase())
    .map((item) => {
      const text = `${item.title} ${item.summary} ${item.keywords.join(' ')}`.toLowerCase();
      return { ...item, score: terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0) };
    })
    .filter((item) => item.score > 0 || terms.length === 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
