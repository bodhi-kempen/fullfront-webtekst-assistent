import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isEmbedded } from '../lib/embed';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Surfaced when embed-mode anonymous sign-in fails or times out. */
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Detect embed mode synchronously, BEFORE any auth/redirect decisions.
    // isEmbedded() is also persisted to localStorage so client-side route
    // changes (which drop ?embed=true) keep behaving as embedded.
    const embed = isEmbedded();

    let resolved = false;
    let timeoutId: number | undefined;

    if (embed) {
      // 10s safety net: if anonymous sign-in is silently failing (network
      // block, wrong keys, CORS), surface a visible error instead of hanging
      // on "Bezig met laden…" forever.
      timeoutId = window.setTimeout(() => {
        if (resolved) return;
        const msg =
          'Anonieme login mislukt: geen sessie binnen 10 seconden. ' +
          'Check de browser console voor [supabase] / [auth] logs.';
        console.error('[auth] embed sign-in timeout — surfacing error');
        setAuthError(msg);
        setLoading(false);
      }, 10_000);
    }

    async function ensureAnonymousSession() {
      // Step 1 — try the native anonymous sign-in. This is the cheap,
      // documented path: signInAnonymously() POSTs to /auth/v1/signup with
      // {is_anonymous: true} and returns a session.
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error && data.session) {
          console.info('[auth] anonymous sign-in succeeded (native)', {
            userId: data.session.user?.id,
            isAnonymous: data.session.user?.is_anonymous,
          });
          return;
        }
        console.warn(
          '[auth] native signInAnonymously failed, falling back to email/password',
          JSON.stringify(
            {
              name: error?.name,
              message: error?.message,
              status: error?.status,
              code: (error as { code?: string } | null)?.code,
            },
            null,
            2
          )
        );
      } catch (e) {
        console.warn(
          '[auth] native signInAnonymously threw, falling back to email/password',
          e instanceof Error ? `${e.name}: ${e.message}` : String(e)
        );
      }

      // Step 2 — fallback. Generate (or reuse) an email/password and create
      // a regular user. Credentials are stored in localStorage so the same
      // browser keeps the same identity across iframe reloads, which means
      // projects persist between visits.
      const EMAIL_KEY = 'fullfront.anonEmail';
      const PASS_KEY = 'fullfront.anonPass';

      const storedEmail = window.localStorage.getItem(EMAIL_KEY);
      const storedPass = window.localStorage.getItem(PASS_KEY);

      if (storedEmail && storedPass) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: storedEmail,
          password: storedPass,
        });
        if (!error && data.session) {
          console.info('[auth] email-fallback sign-in succeeded (returning visitor)', {
            userId: data.session.user?.id,
          });
          return;
        }
        console.warn(
          '[auth] stored anon credentials rejected, creating fresh account',
          error?.message
        );
        window.localStorage.removeItem(EMAIL_KEY);
        window.localStorage.removeItem(PASS_KEY);
      }

      // First visit: generate disposable credentials. We use a real-looking
      // domain so GoTrue's email validator accepts it; deliverability isn't
      // needed because email confirmation must be off in the Supabase project
      // for this fallback to yield a session immediately.
      const uuid =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newEmail = `anon-${uuid}@webtekst-anon.fullfront.nl`;
      const newPass = `${uuid}-${Math.random().toString(36).slice(2)}-${Math.random()
        .toString(36)
        .slice(2)}`;

      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPass,
      });

      if (error) {
        console.error('[auth] email-fallback signUp failed', {
          name: error.name,
          message: error.message,
          status: error.status,
        });
        setAuthError(
          `Kon geen anonieme sessie aanmaken: ${error.message}. ` +
            'Check de browser console voor details.'
        );
        return;
      }

      if (!data.session) {
        // No session returned means email confirmation is enabled — the user
        // would need to click a link, which we can't do for a fake address.
        console.error(
          '[auth] signUp returned user but no session — email confirmation must be disabled in Supabase'
        );
        setAuthError(
          'Anonieme sessie niet beschikbaar: schakel "Confirm email" UIT in Supabase ' +
            '(Authentication → Providers → Email).'
        );
        return;
      }

      window.localStorage.setItem(EMAIL_KEY, newEmail);
      window.localStorage.setItem(PASS_KEY, newPass);
      console.info('[auth] email-fallback signUp succeeded (new visitor)', {
        userId: data.session.user?.id,
      });
    }

    supabase.auth.getSession().then(async ({ data }) => {
      // Embedded in the Fullfront members area: skip the login screen and
      // sign in anonymously. The resulting auth.uid() satisfies the existing
      // RLS policies, so projects scope correctly to this anonymous user.
      if (!data.session && embed) {
        console.info('[auth] embed mode — signing in anonymously');
        await ensureAnonymousSession();
        // onAuthStateChange(SIGNED_IN) will set session and flip loading.
        return;
      }

      setSession(data.session);
      setLoading(false);
      if (data.session?.expires_at) {
        const minsLeft = Math.round(
          (data.session.expires_at * 1000 - Date.now()) / 60_000
        );
        console.info(`[auth] session restored, ${minsLeft} min until expiry`);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // Resolve the loading gate that getSession() left open while waiting
        // for anonymous sign-in (or any other late session arrival).
        resolved = true;
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        setAuthError(null);
        setLoading(false);
      }
      // Log significant auth events so we can see refresh/expiry behavior in
      // long-running flows (the interview).
      if (event === 'TOKEN_REFRESHED') {
        const minsLeft = next?.expires_at
          ? Math.round((next.expires_at * 1000 - Date.now()) / 60_000)
          : null;
        console.info(`[auth] token refreshed${minsLeft != null ? `, ${minsLeft} min until next expiry` : ''}`);
      } else if (event === 'SIGNED_OUT') {
        console.warn('[auth] signed out');
      } else if (event === 'SIGNED_IN') {
        console.info('[auth] signed in');
      }
    });

    return () => {
      data.subscription.unsubscribe();
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      authError,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, loading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
