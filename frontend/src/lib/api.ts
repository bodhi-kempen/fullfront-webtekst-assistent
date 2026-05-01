import { supabase } from './supabase';

// Empty string in production = same-origin requests (the backend serves
// the built frontend). Override via VITE_API_BASE_URL for cross-origin
// setups (e.g. when running the frontend against a remote API).
const baseUrl =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? 'http://localhost:4000' : '');

// ---------------------------------------------------------------------------
// Token plumbing — keeps the access token fresh across long-running flows
// (interview can last 45-60 minutes, so we proactively refresh and retry
// once on 401).
// ---------------------------------------------------------------------------

const REFRESH_BEFORE_EXPIRY_MS = 60_000;

async function currentToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;

  // Proactive refresh if expiry is within REFRESH_BEFORE_EXPIRY_MS.
  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  if (expiresAtMs > 0 && expiresAtMs - Date.now() < REFRESH_BEFORE_EXPIRY_MS) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn('[auth] proactive refresh failed:', error.message);
      return session.access_token;
    }
    return refreshed.session?.access_token ?? session.access_token;
  }
  return session.access_token;
}

async function forceRefreshToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    console.warn('[auth] forced refresh failed:', error.message);
    return null;
  }
  return data.session?.access_token ?? null;
}

function withAuth(headers: Headers, token: string | null): Headers {
  const out = new Headers(headers);
  if (token) out.set('Authorization', `Bearer ${token}`);
  return out;
}

/** Fetch with automatic token refresh: tries once with the current token,
 *  then refreshes and retries once if the response is 401. Throws an Error
 *  with the parsed body.error or HTTP status text on non-2xx responses. */
async function authedFetch(path: string, init: RequestInit): Promise<Response> {
  const baseHeaders = new Headers(init.headers as HeadersInit | undefined);
  let token = await currentToken();
  let res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: withAuth(baseHeaders, token),
  });
  if (res.status === 401) {
    console.info('[auth] got 401, refreshing token and retrying once');
    token = await forceRefreshToken();
    if (token) {
      res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: withAuth(baseHeaders, token),
      });
    }
  }
  return res;
}

export class BudgetExceededError extends Error {
  code = 'budget_exceeded' as const;
  constructor(message: string) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

async function throwIfBad(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  if (res.status === 402 && body.code === 'budget_exceeded') {
    throw new BudgetExceededError(
      body.error ?? 'Je hebt je gebruikslimiet bereikt.'
    );
  }
  throw new Error(body.error ?? `Request failed: ${res.status}`);
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await authedFetch(path, { ...init, headers });
  await throwIfBad(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Download a binary response and trigger a browser save. */
export async function apiDownload(path: string, init: RequestInit = {}): Promise<void> {
  const res = await authedFetch(path, init);
  await throwIfBad(res);
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? 'download';

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Fetch a plain-text response. */
export async function apiText(path: string, init: RequestInit = {}): Promise<string> {
  const res = await authedFetch(path, init);
  await throwIfBad(res);
  return await res.text();
}
