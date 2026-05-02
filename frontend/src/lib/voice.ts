/**
 * Web Speech API wrapper for Dutch (nl-NL) voice dictation.
 * Falls back gracefully when the browser doesn't support SpeechRecognition.
 *
 * The "live preview" mechanic: as the user speaks, partial transcripts
 * stream via onPartial(); on pause/stop, onFinal() fires with the committed
 * text so the caller can append to the textarea (which the user can then edit).
 */

// Browser shim — SpeechRecognition lives on `window.SpeechRecognition` or
// `window.webkitSpeechRecognition`. Types come from the DOM lib but they're
// not consistently exposed.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

interface SpeechWindow extends Window {
  SpeechRecognition?: new () => AnySpeechRecognition;
  webkitSpeechRecognition?: new () => AnySpeechRecognition;
}

/** Naive registrable-domain extraction: take the last two labels.
 *  Works for .nl, .com, .org. Wrong for compound TLDs like .co.uk or
 *  .com.au — accepted trade-off since Fullfront runs on .nl. Swap in
 *  a Public Suffix List lookup if that ever changes. */
function registrableDomain(hostname: string): string {
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length <= 2) return hostname.toLowerCase();
  return parts.slice(-2).join('.').toLowerCase();
}

/** Best-effort hostname of the top frame, even when it's cross-origin.
 *  Returns null if we genuinely can't tell. */
function topFrameHostname(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    if (window.self === window.top) return window.location.hostname;
    return window.top!.location.hostname;
  } catch {
    // Cross-origin access blocked — fall through to alternatives.
  }
  // ancestorOrigins is WebKit/Blink only, ordered nearest → top.
  const al = (
    window.location as Location & { ancestorOrigins?: DOMStringList }
  ).ancestorOrigins;
  if (al && al.length > 0) {
    try {
      return new URL(al[al.length - 1]!).hostname;
    } catch {
      // ignore
    }
  }
  // document.referrer carries the parent URL when we were just embedded,
  // unless the parent strips it via Referrer-Policy. Falls through to null.
  if (typeof document !== 'undefined' && document.referrer) {
    try {
      return new URL(document.referrer).hostname;
    } catch {
      // ignore
    }
  }
  return null;
}

/** True when this window is embedded in a frame on a *different* registrable
 *  domain. iOS Safari blocks the microphone + Web Speech API in cross-site
 *  iframes, but it works fine in same-site iframes (e.g. webtekst.fullfront.nl
 *  inside fullfront.nl), so this is what the mic check should gate on. */
function isCrossSiteFramed(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.self === window.top) return false;
  const parentHost = topFrameHostname();
  if (!parentHost) {
    // Couldn't determine parent — assume cross-site to stay safe (the mic
    // would fail silently in the worst case otherwise).
    return true;
  }
  return registrableDomain(window.location.hostname) !== registrableDomain(parentHost);
}

export function isVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari exposes webkitSpeechRecognition inside an iframe but start()
  // silently fails when the parent is a *different site*. Same-site iframes
  // are fine, so we hide the mic only in the cross-site case.
  if (isCrossSiteFramed()) return false;
  const w = window as SpeechWindow;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export interface VoiceController {
  start(): void;
  stop(): void;
  abort(): void;
  isListening(): boolean;
}

export interface VoiceOptions {
  lang?: string;
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}

export function createVoiceController(opts: VoiceOptions = {}): VoiceController | null {
  if (!isVoiceSupported()) return null;

  const w = window as SpeechWindow;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition!;
  const recog: AnySpeechRecognition = new Ctor();
  recog.lang = opts.lang ?? 'nl-NL';
  recog.continuous = true;
  recog.interimResults = true;
  recog.maxAlternatives = 1;

  let listening = false;

  recog.onresult = (event: AnySpeechRecognition) => {
    let finalText = '';
    let partialText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      if (result.isFinal) finalText += transcript;
      else partialText += transcript;
    }
    if (partialText) opts.onPartial?.(partialText);
    if (finalText) opts.onFinal?.(finalText);
  };

  recog.onerror = (event: AnySpeechRecognition) => {
    opts.onError?.(event.error ?? 'unknown_error');
  };

  recog.onend = () => {
    listening = false;
    opts.onEnd?.();
  };

  return {
    start() {
      if (listening) return;
      try {
        recog.start();
        listening = true;
      } catch (err) {
        opts.onError?.(err instanceof Error ? err.message : 'start_failed');
      }
    },
    stop() {
      if (!listening) return;
      recog.stop();
    },
    abort() {
      if (!listening) return;
      recog.abort();
      listening = false;
    },
    isListening() {
      return listening;
    },
  };
}
