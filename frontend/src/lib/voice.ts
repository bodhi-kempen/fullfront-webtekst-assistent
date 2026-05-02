/**
 * Web Speech API wrapper for Dutch (nl-NL) voice dictation.
 * Falls back gracefully when the browser doesn't support SpeechRecognition.
 *
 * Detection policy: be optimistic. If the SpeechRecognition constructor
 * exists, expose voice input. Don't pre-emptively hide the mic based on
 * iframe / origin heuristics — those have produced false negatives that
 * blocked legitimate same-site embeds. If the browser actually refuses
 * (cross-site iframe with no Permissions-Policy, no permission granted,
 * etc.), recog.start() raises onError and the UI surfaces a toast,
 * keeping the button visible so the user can retry.
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

// ---------------------------------------------------------------------------
// Diagnostics — emit a one-shot environment dump the first time anyone asks
// whether voice is supported. Helps debug "mic doesn't work in iframe" cases
// without touching code.
// ---------------------------------------------------------------------------

function registrableDomain(hostname: string): string {
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length <= 2) return hostname.toLowerCase();
  return parts.slice(-2).join('.').toLowerCase();
}

function topFrameHostname(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    if (window.self === window.top) return window.location.hostname;
    return window.top!.location.hostname;
  } catch {
    // cross-origin block — fall through
  }
  const al = (window.location as Location & { ancestorOrigins?: DOMStringList })
    .ancestorOrigins;
  if (al && al.length > 0) {
    try {
      return new URL(al[al.length - 1]!).hostname;
    } catch {
      /* ignore */
    }
  }
  if (typeof document !== 'undefined' && document.referrer) {
    try {
      return new URL(document.referrer).hostname;
    } catch {
      /* ignore */
    }
  }
  return null;
}

let envLogged = false;
function logVoiceEnvironmentOnce(): void {
  if (envLogged) return;
  envLogged = true;
  if (typeof window === 'undefined') return;

  const w = window as SpeechWindow;
  const apiAvailable = !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  const inIframe = window.self !== window.top;

  let crossOrigin = false;
  try {
    crossOrigin = inIframe && window.top!.location.origin !== window.self.location.origin;
  } catch {
    crossOrigin = inIframe;
  }

  const myHost = window.location.hostname;
  const parentHost = topFrameHostname();
  const sameSite = parentHost
    ? registrableDomain(myHost) === registrableDomain(parentHost)
    : null;

  console.info(`[voice] SpeechRecognition API available: ${apiAvailable}`);
  console.info(`[voice] In iframe: ${inIframe}`);
  console.info(`[voice] Cross-origin framed: ${crossOrigin}`);
  console.info(`[voice] Self host: ${myHost}`);
  console.info(`[voice] Parent host: ${parentHost ?? '(unknown)'}`);
  console.info(`[voice] Same-site: ${sameSite ?? '(unknown)'}`);
  console.info(
    `[voice] Decision policy: optimistic — try start() and trust the browser`
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false;
  logVoiceEnvironmentOnce();
  const w = window as SpeechWindow;
  const supported = !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  console.info(`[voice] isVoiceSupported result: ${supported}`);
  return supported;
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
    const code = event.error ?? 'unknown_error';
    console.warn(`[voice] recognition.onerror: ${code}`, event);
    opts.onError?.(code);
  };

  recog.onend = () => {
    console.info('[voice] recognition.onend');
    listening = false;
    opts.onEnd?.();
  };

  return {
    start() {
      if (listening) return;
      console.info('[voice] recognition.start() called');
      try {
        recog.start();
        listening = true;
      } catch (err) {
        const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        console.warn(`[voice] recognition.start() threw synchronously: ${msg}`);
        opts.onError?.(msg);
      }
    },
    stop() {
      if (!listening) return;
      console.info('[voice] recognition.stop() called');
      recog.stop();
    },
    abort() {
      if (!listening) return;
      console.info('[voice] recognition.abort() called');
      recog.abort();
      listening = false;
    },
    isListening() {
      return listening;
    },
  };
}
