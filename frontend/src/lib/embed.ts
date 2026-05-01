// Embed mode: app runs inside an iframe on the Fullfront members site.
// Triggered by ?embed=true OR window.self !== window.top. We persist the
// flag to localStorage on first detection so client-side route changes
// (which drop the query param) and SPA redirects keep behaving as embed.
// Effect: hides topbar + sidebar AND skips the login screen in favor of
// supabase.auth.signInAnonymously().

const KEY = 'fullfront.embed';

function detectEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.self !== window.top) return true;
  } catch {
    // Cross-origin frame access throws — that itself confirms we are framed.
    return true;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('embed') === 'true' || params.get('embed') === '1';
}

let cached: boolean | null = null;

export function isEmbedded(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined') return false;

  const fromEnv = detectEnvironment();
  let fromStorage = false;
  try {
    fromStorage = window.localStorage.getItem(KEY) === '1';
  } catch {
    // localStorage may be blocked in partitioned iframes — fall back to env detection.
  }

  cached = fromEnv || fromStorage;

  // Persist on first detection so later navigations still see embed mode
  // even after the ?embed=true query param has been dropped.
  if (fromEnv && !fromStorage) {
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      // ignore — env detection alone keeps things working for this load
    }
  }

  return cached;
}

/** Toggle a body class on mount; the CSS does the rest. */
export function applyEmbedClass(): void {
  if (typeof document === 'undefined') return;
  if (isEmbedded()) {
    document.body.classList.add('embed-mode');
  }
}
