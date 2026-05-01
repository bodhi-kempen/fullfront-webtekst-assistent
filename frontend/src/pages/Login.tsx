import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { LogIn, Lock, MailCheck, Send, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isEmbedded } from '../lib/embed';
import { supabase } from '../lib/supabase';

type Panel =
  | 'login'
  | 'signup'
  | 'forgot'
  | 'forgot_sent'
  | 'reset'
  | 'verification_pending';

export function LoginPage() {
  const { user, signIn, signUp, loading } = useAuth();
  const [panel, setPanel] = useState<Panel>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Detect Supabase password-recovery flow (user clicked email link).
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPanel('reset');
        setError(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Send authenticated users to dashboard — UNLESS we're in reset flow,
  // where Supabase has them auth'd briefly to allow password change.
  if (!loading && user && panel !== 'reset') return <Navigate to="/" replace />;
  // Embedded view never needs the login screen — AuthContext signs in anonymously.
  if (isEmbedded()) return <Navigate to="/" replace />;

  function switchPanel(next: Panel) {
    setError(null);
    setPanel(next);
    setPassword('');
    setPassword2('');
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inloggen mislukt');
    } finally {
      setBusy(false);
    }
  }

  async function onSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens zijn.');
      return;
    }
    if (password !== password2) {
      setError('Wachtwoorden komen niet overeen.');
      return;
    }
    setBusy(true);
    try {
      await signUp(email, password);
      // If email confirmation is on, signUp returns no session yet → show pending.
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setPanel('verification_pending');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account aanmaken mislukt');
    } finally {
      setBusy(false);
    }
  }

  async function onForgot(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setPanel('forgot_sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Versturen mislukt');
    } finally {
      setBusy(false);
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens zijn.');
      return;
    }
    if (password !== password2) {
      setError('Wachtwoorden komen niet overeen.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Sign out the recovery session, then send to login.
      await supabase.auth.signOut();
      switchPanel('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-logo">
          <img src="/fullfront-logo.webp" alt="Fullfront" className="logo-img" />
          <div className="logo-divider" />
          <span className="login-logo-sub">Webtekst Assistent</span>
        </div>

        {panel === 'login' && (
          <form onSubmit={onLogin}>
            <div className="login-title">Inloggen</div>
            <div className="login-subtitle">Vul je gegevens in om verder te gaan.</div>
            {error && <div className="login-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">E-mailadres</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Wachtwoord</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <div className="form-link">
                <a onClick={() => switchPanel('forgot')}>Wachtwoord vergeten?</a>
              </div>
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={busy}>
              <LogIn /> {busy ? 'Bezig…' : 'Inloggen'}
            </button>
            <div className="auth-switch-link">
              Nog geen account? <a onClick={() => switchPanel('signup')}>Registreer hier</a>
            </div>
          </form>
        )}

        {panel === 'signup' && (
          <form onSubmit={onSignup}>
            <div className="login-title">Account aanmaken</div>
            <div className="login-subtitle">Maak een gratis account aan.</div>
            {error && <div className="login-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">E-mailadres</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Wachtwoord</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimaal 8 tekens"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Wachtwoord herhalen</label>
              <input
                className="form-input"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={busy}>
              <UserPlus /> {busy ? 'Bezig…' : 'Account aanmaken'}
            </button>
            <div className="auth-switch-link">
              Al een account? <a onClick={() => switchPanel('login')}>Log in</a>
            </div>
          </form>
        )}

        {panel === 'forgot' && (
          <form onSubmit={onForgot}>
            <div className="login-title">Wachtwoord vergeten</div>
            <div className="login-subtitle">
              Vul je e-mailadres in. We sturen je een resetlink.
            </div>
            {error && <div className="login-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">E-mailadres</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={busy}>
              <Send /> {busy ? 'Bezig…' : 'Stuur resetlink'}
            </button>
            <div className="auth-switch-link">
              <a onClick={() => switchPanel('login')}>← terug naar inloggen</a>
            </div>
          </form>
        )}

        {panel === 'forgot_sent' && (
          <div>
            <div className="login-info-icon">
              <MailCheck />
            </div>
            <div className="login-title" style={{ textAlign: 'center' }}>
              Check je e-mail voor de resetlink
            </div>
            <div className="login-subtitle" style={{ textAlign: 'center' }}>
              Als dit e-mailadres bij ons bekend is, staat er binnen enkele minuten een
              resetlink in je inbox. De link is 1 uur geldig.
            </div>
            <div className="auth-switch-link">
              <a onClick={() => switchPanel('login')}>← terug naar inloggen</a>
            </div>
          </div>
        )}

        {panel === 'reset' && (
          <form onSubmit={onReset}>
            <div className="login-title">Nieuw wachtwoord</div>
            <div className="login-subtitle">
              Kies een nieuw wachtwoord van minimaal 8 tekens.
            </div>
            {error && <div className="login-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Nieuw wachtwoord</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Wachtwoord herhalen</label>
              <input
                className="form-input"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={busy}>
              <Lock /> {busy ? 'Bezig…' : 'Wachtwoord opslaan'}
            </button>
          </form>
        )}

        {panel === 'verification_pending' && (
          <div>
            <div className="login-info-icon">
              <MailCheck />
            </div>
            <div className="login-title" style={{ textAlign: 'center' }}>
              Check je e-mail
            </div>
            <div className="login-subtitle" style={{ textAlign: 'center' }}>
              We hebben een bevestigingslink gestuurd naar
              <br />
              <strong style={{ color: 'var(--text)' }}>{email}</strong>
            </div>
            <div className="auth-switch-link">
              <a onClick={() => switchPanel('login')}>← terug naar inloggen</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
