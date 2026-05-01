import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isEmbedded } from '../lib/embed';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, authError } = useAuth();
  const embed = isEmbedded();

  if (loading) return <div style={{ padding: 24 }}>Bezig met laden…</div>;

  if (!user) {
    if (embed) {
      // Never redirect to /login in embed mode — that drops the embed
      // context and strands the user. Show the auth error if AuthContext
      // gave up; otherwise show the loader.
      if (authError) {
        return (
          <div
            style={{
              padding: 24,
              maxWidth: 600,
              margin: '40px auto',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <h2 style={{ marginBottom: 12, color: '#E05C5C' }}>
              Inloggen mislukt
            </h2>
            <p style={{ marginBottom: 12 }}>{authError}</p>
            <p style={{ fontSize: 13, color: '#8896AA' }}>
              Open de browser DevTools console en zoek naar regels die
              beginnen met <code>[supabase]</code> of <code>[auth]</code>.
            </p>
          </div>
        );
      }
      return <div style={{ padding: 24 }}>Bezig met laden…</div>;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
