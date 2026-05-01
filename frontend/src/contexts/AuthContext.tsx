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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const embed = isEmbedded();

    supabase.auth.getSession().then(async ({ data }) => {
      // Embedded in the Fullfront members area: skip the login screen and
      // sign in anonymously. The resulting auth.uid() satisfies the existing
      // RLS policies, so projects scope correctly to this anonymous user.
      if (!data.session && embed) {
        console.info('[auth] embed mode — signing in anonymously');
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('[auth] anonymous sign-in failed', error);
          setLoading(false);
          return;
        }
        // onAuthStateChange (SIGNED_IN) will set the session and flip loading.
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

    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
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
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
