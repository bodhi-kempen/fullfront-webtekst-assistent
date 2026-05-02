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
// Microphone permission gate
// ---------------------------------------------------------------------------
//
// In a cross-origin iframe, Chrome won't show the permission prompt for
// SpeechRecognition.start() — start() just fails silently with 'not-allowed'.
// Calling getUserMedia({audio: true}) first DOES trigger the prompt, provided
// the parent's <iframe allow="microphone"> tag is set. So we use it as a
// pre-flight: it asks for permission, we immediately stop the stream, and
// then call SpeechRecognition.start() now that permission is granted.

export type MicPermissionState = 'granted' | 'denied' | 'unsupported';

export interface MicPermissionResult {
  state: MicPermissionState;
  /** Human-readable message for the UI when state === 'denied'. */
  message?: string;
}

const DENIED_MSG =
  'Microfoon is geblokkeerd. Klik op het slotje in de adresbalk om toegang toe te staan.';

export async function ensureMicrophonePermission(): Promise<MicPermissionResult> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    console.warn('[voice] mediaDevices.getUserMedia not available');
    return { state: 'unsupported' };
  }

  // permissions.query is Chrome/Edge/Firefox; Safari ignores the microphone
  // permission name. Wrap in try/catch and fall through on failure.
  let queriedState: PermissionState | null = null;
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });
      queriedState = status.state;
      console.info(`[voice] permissions.query microphone: ${status.state}`);
    } else {
      console.info('[voice] permissions.query unavailable, will probe via getUserMedia');
    }
  } catch (e) {
    console.warn('[voice] permissions.query threw, will probe via getUserMedia', e);
  }

  if (queriedState === 'granted') {
    return { state: 'granted' };
  }
  if (queriedState === 'denied') {
    return { state: 'denied', message: DENIED_MSG };
  }

  // 'prompt' or unknown — request the actual permission via getUserMedia.
  try {
    console.info('[voice] calling getUserMedia({audio: true}) to trigger prompt');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // We only wanted the permission grant, not the audio. Stopping the tracks
    // releases the mic so SpeechRecognition can take it cleanly.
    stream.getTracks().forEach((t) => t.stop());
    console.info('[voice] getUserMedia granted, mic released');
    return { state: 'granted' };
  } catch (e) {
    const err = e as { name?: string; message?: string };
    const name = err.name ?? 'Error';
    const message = err.message ?? '';
    console.warn(`[voice] getUserMedia rejected: ${name}: ${message}`);
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return { state: 'denied', message: DENIED_MSG };
    }
    return {
      state: 'denied',
      message: `Microfoon niet beschikbaar: ${name}${message ? ` — ${message}` : ''}.`,
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** iOS Safari detection. iPadOS 13+ reports a Mac UA, but the trick used
 *  here (no MSStream + iPad/iPhone/iPod in UA) covers the common case. */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as unknown as { MSStream?: unknown };
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !w.MSStream;
}

export function isVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false;
  logVoiceEnvironmentOnce();

  // iOS Safari refuses Web Speech API in iframes — hard Apple restriction
  // we can't work around. The OS-level keyboard mic icon is the answer for
  // those users, and the UI nudges them toward it via the placeholder.
  if (isIOS() && window.self !== window.top) {
    console.info('[voice] iOS Safari in iframe — voice unavailable');
    console.info('[voice] isVoiceSupported result: false');
    return false;
  }

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
