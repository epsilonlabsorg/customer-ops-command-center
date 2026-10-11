'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Database, LoaderCircle, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export function LiveAccessPanel() {
  const client = getSupabaseBrowserClient();
  const [email, setEmail] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [caseCount, setCaseCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!client) return;
    void client.auth.getSession().then(({ data }) => setUserEmail(data.session?.user.email ?? null));
    const { data } = client.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!client || !userEmail) { setCaseCount(null); return; }
    void client.from('support_cases').select('*', { count: 'exact', head: true }).then(({ count, error }) => {
      setMessage(error ? 'Connected, but the signed-in user has no readable case scope or the migration is not applied.' : '');
      setCaseCount(error ? null : count ?? 0);
    });
  }, [client, userEmail]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    if (!client || !email.trim()) return;
    setBusy(true);
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setMessage(error ? error.message : 'Check your email for the secure sign-in link.');
    setBusy(false);
  }

  if (!client) return <div className="live-access disabled"><Database/><div><strong>Supabase client is ready for configuration</strong><p>Add the project URL and publishable key, apply all migrations, and restart the app. Demo mode remains available.</p></div></div>;

  if (userEmail) return <div className="live-access"><CheckCircle2/><div><strong>Signed in as {userEmail}</strong><p>{caseCount === null ? 'Checking authorized records…' : `Row policies allow ${caseCount} case${caseCount === 1 ? '' : 's'} for this user.`}</p>{message && <p className="integration-message">{message}</p>}</div><Button variant="outline" onClick={() => void client.auth.signOut()}><LogOut size={15}/>Sign out</Button></div>;

  return <form className="live-access" onSubmit={signIn}><ShieldCheck/><div><strong>Test Supabase access</strong><p>A magic link signs in a real Auth user. Row policies decide which synthetic cases are visible.</p><div className="inline-form"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" aria-label="Email address" required/><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <Mail/>}Send link</Button></div>{message && <p className="integration-message">{message}</p>}</div></form>;
}
