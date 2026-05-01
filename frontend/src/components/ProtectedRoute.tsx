import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isEmbedded } from '../lib/embed';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Bezig met laden…</div>;
  if (!user) {
    // Embedded: never redirect to /login (would drop the embed context and
    // strand the user). AuthContext is responsible for signing in anonymously;
    // if we get here, that flow is still in flight or failed — keep showing
    // the loader rather than break out of the iframe.
    if (isEmbedded()) {
      return <div style={{ padding: 24 }}>Bezig met laden…</div>;
    }
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
