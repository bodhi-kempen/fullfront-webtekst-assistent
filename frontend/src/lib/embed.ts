// Embed mode: app runs inside an iframe on the Fullfront members site.
// Active when ?embed=true OR when the window is framed (window !== top).
// Effect: hides topbar + sidebar so the app fits cleanly in the host layout.

export function isEmbedded(): boolean {
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

/** Toggle a body class on mount; the CSS does the rest. */
export function applyEmbedClass(): void {
  if (typeof document === 'undefined') return;
  if (isEmbedded()) {
    document.body.classList.add('embed-mode');
  }
}
