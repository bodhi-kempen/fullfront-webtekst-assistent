import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Bezig met laden…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
