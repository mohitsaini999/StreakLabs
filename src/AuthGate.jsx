import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, LoaderCircle, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { supabase, supabaseConfigured } from './supabase.js';
import { setToken } from './api.js';
import App from './App.jsx';
import './auth.css';

function AuthPage() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pw,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        // session is null until they confirm email
        if (!data.session) {
          setMsg('Account created. Check your email for a confirmation link, then come back here to sign in.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pw,
        });
        if (error) throw error;
      }
    } catch (e2) {
      setErr(e2.message || 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const flipMode = () => {
    setMode(mode === 'signup' ? 'login' : 'signup');
    setErr('');
    setMsg('');
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <span><Sparkles size={20} /></span>
          <strong>streak<span>labs</span></strong>
        </div>
        <div className="auth-icon"><BookOpen size={22} /></div>
        <p className="auth-eyebrow">YOUR PERSONAL LEARNING SPACE</p>
        <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
        <p className="auth-intro">
          {mode === 'signup'
            ? 'Save your learning progress and pick up where you left off.'
            : 'Sign in to continue your learning journey.'}
        </p>
        <form onSubmit={onSubmit} className="auth-form">
          {mode === 'signup' && (
            <label>
              Your name
              <input
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Alex Morgan"
                maxLength="80"
                required
              />
            </label>
          )}
          <label>
            Email address
            <span className="auth-input">
              <Mail size={16} />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </span>
          </label>
          <label>
            Password
            <span className="auth-input">
              <LockKeyhole size={16} />
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                minLength="8"
                required
              />
            </span>
          </label>
          {err && <p className="auth-feedback auth-error" role="alert">{err}</p>}
          {msg && <p className="auth-feedback auth-success" role="status">{msg}</p>}
          <button className="auth-submit" disabled={busy}>
            {busy ? (
              <><LoaderCircle className="auth-spin" size={17} /> Please wait…</>
            ) : (
              <>{mode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></>
            )}
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'signup' ? 'Already have an account?' : 'New to StreakLabs?'}{' '}
          <button onClick={flipMode}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</button>
        </p>
        <p className="auth-privacy">Your learning data is saved to your own account.</p>
      </section>
    </main>
  );
}

export default function AuthGate() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setToken(data.session?.access_token || '');
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_evt, next) => {
      setSession(next);
      setToken(next?.access_token || '');
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured) {
    return (
      <main className="auth-shell">
        <section className="auth-card auth-config">
          <div className="auth-brand">
            <span><Sparkles size={20} /></span>
            <strong>streak<span>labs</span></strong>
          </div>
          <h1>Finish Supabase setup</h1>
          <p>
            Add your Supabase project URL and publishable key to the frontend <code>.env</code> file, then restart Vite. The publishable key is safe for browser use; keep the secret key in the backend only.
          </p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="auth-shell">
        <LoaderCircle className="auth-spin auth-loading" size={28} />
      </main>
    );
  }

  if (!session) return <AuthPage />;

  return <App key={session.user.id} user={session.user} onSignOut={() => supabase.auth.signOut()} />;
}
