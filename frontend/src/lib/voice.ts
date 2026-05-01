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

export function isVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false;
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
