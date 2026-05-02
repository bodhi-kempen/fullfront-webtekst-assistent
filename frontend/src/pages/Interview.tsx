import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LayoutDashboard, MessageCircle, Mic, Send, Square } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useToast } from '../components/Toast';
import { apiFetch } from '../lib/api';
import {
  createVoiceController,
  ensureMicrophonePermission,
  isVoiceSupported,
  type VoiceController,
} from '../lib/voice';

interface CurrentQuestion {
  question_id: string;
  parent_question_id: string | null;
  is_followup: boolean;
  part: number;
  text: string;
}

interface Progress {
  part: number;
  parts_total: number;
  answered: number;
  archetype: string | null;
  sub_archetype: string | null;
  service_index?: number;
}

interface InterviewStep {
  done: boolean;
  assistant_message: string;
  current_question: CurrentQuestion | null;
  progress: Progress;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

export function InterviewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<InterviewStep | null>(null);
  const [input, setInput] = useState('');
  const [committedSource, setCommittedSource] = useState<'voice' | 'typed'>('typed');
  const [partialVoice, setPartialVoice] = useState('');
  const [voiceListening, setVoiceListening] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const voiceRef = useRef<VoiceController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  // Computed once at mount: the API exists AND we're not in a cross-site
  // frame. Errors from start() don't disable voice — see onError below.
  const voiceSupported = useMemo(() => isVoiceSupported(), []);
  const toast = useToast();

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await apiFetch<InterviewStep>(
          `/api/projects/${projectId}/interview/start`,
          { method: 'POST' }
        );
        if (cancelled) return;
        setStep(s);
        setChat([
          { id: crypto.randomUUID(), role: 'assistant', text: s.assistant_message },
        ]);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Kon interview niet laden');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [chat, partialVoice, sending]);

  useEffect(() => {
    if (!voiceSupported) return;
    voiceRef.current = createVoiceController({
      lang: 'nl-NL',
      onPartial: (t) => setPartialVoice(t),
      onFinal: (t) => {
        setInput((prev) => (prev ? prev + ' ' + t : t).trim());
        setPartialVoice('');
        setCommittedSource('voice');
      },
      onError: (msg) => {
        // SpeechRecognition surfaces 'not-allowed', 'service-not-allowed',
        // 'network', etc. Some are recoverable (permission later granted,
        // header propagation, retry on flaky network), so we keep the mic
        // visible and let the user try again rather than hiding it forever.
        setVoiceListening(false);
        toast.show(
          'Spraakherkenning lukte niet — typ je antwoord of probeer het opnieuw.'
        );
        console.warn(`[voice] error: ${msg}`);
      },
      onEnd: () => setVoiceListening(false),
    });
    return () => voiceRef.current?.abort();
  }, [voiceSupported, toast]);

  async function toggleVoice() {
    const v = voiceRef.current;
    if (!v) return;
    if (v.isListening()) {
      v.stop();
      return;
    }
    setError(null);

    // Pre-flight: in cross-origin iframes Chrome refuses to show the
    // permission prompt for SpeechRecognition. Triggering getUserMedia
    // first does prompt the user (when allow="microphone" is on the
    // parent's iframe tag), so we ask there and only call start() once
    // permission is granted.
    const perm = await ensureMicrophonePermission();
    if (perm.state === 'denied') {
      toast.show(perm.message ?? 'Microfoon-toegang geweigerd');
      return;
    }
    if (perm.state === 'unsupported') {
      toast.show('Spraakherkenning werkt niet in deze browser. Typ je antwoord.');
      return;
    }

    v.start();
    setVoiceListening(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!step?.current_question) return;
    const text = input.trim();
    if (!text) return;

    setSending(true);
    setError(null);
    voiceRef.current?.stop();

    const q = step.current_question;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text };
    setChat((prev) => [...prev, userMsg]);
    setInput('');
    setPartialVoice('');

    try {
      const next = await apiFetch<InterviewStep>(
        `/api/projects/${projectId}/interview/answer`,
        {
          method: 'POST',
          body: JSON.stringify({
            question_id: q.question_id,
            question_text: q.text,
            answer_text: text,
            answer_source: committedSource,
          }),
        }
      );
      setStep(next);
      setCommittedSource('typed');
      setChat((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: next.assistant_message },
      ]);
      if (next.done) {
        setTimeout(() => navigate(`/strategy/${projectId}`), 1500);
      }
    } catch (err) {
      setInput(text);
      setChat((prev) => prev.filter((m) => m.id !== userMsg.id));
      setError(err instanceof Error ? err.message : 'Kon antwoord niet versturen');
    } finally {
      setSending(false);
    }
  }

  const sidebar = (
    <div className="sidebar-group">
      <button type="button" className="nav-item" onClick={() => navigate('/')}>
        <LayoutDashboard /> Dashboard
      </button>
      <button type="button" className="nav-item active">
        <MessageCircle /> Interview
      </button>
    </div>
  );

  if (loading) {
    return (
      <AppShell sidebar={sidebar}>
        <p className="muted">Bezig met laden…</p>
      </AppShell>
    );
  }

  const partsTotal = step?.progress.parts_total ?? 10;
  const partPct = step ? Math.round(((step.progress.part - 1) / partsTotal) * 100) : 0;

  return (
    <AppShell sidebar={sidebar} flush>
      <div className="chat-shell">
        <div className="chat-header">
          {step && (
            <div className="chat-progress-meta">
              Deel <strong>{step.progress.part}</strong> van {partsTotal}
              {step.progress.service_index !== undefined && (
                <> · dienst {step.progress.service_index}</>
              )}{' '}
              · {step.progress.answered} antwoorden
            </div>
          )}
          <div className="chat-progress-bar">
            <div className="chat-progress-fill" style={{ width: `${partPct}%` }} />
          </div>
        </div>

        <div className="chat-scroll">
          {chat.map((m) => (
            <div
              key={m.id}
              className={`chat-bubble ${
                m.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--assistant'
              }`}
            >
              {m.text}
            </div>
          ))}
          {sending && (
            <div className="chat-typing">
              <span className="chat-typing__dot" />
              <span className="chat-typing__dot" />
              <span className="chat-typing__dot" />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div style={{ padding: '0 16px' }}>
            <div className="login-error" style={{ marginBottom: 0 }}>{error}</div>
          </div>
        )}

        {!step?.done && step?.current_question && (
          <form onSubmit={onSubmit} className="chat-composer">
            {voiceSupported && (
              <button
                type="button"
                className={`mic-btn${voiceListening ? ' is-listening' : ''}`}
                onClick={toggleVoice}
                disabled={sending}
                title={voiceListening ? 'Stop opname' : 'Start spraakopname'}
                aria-label="Microfoon"
              >
                {voiceListening ? <Square /> : <Mic />}
              </button>
            )}
            <textarea
              className="chat-composer__textarea"
              value={input + (partialVoice ? ' ' + partialVoice : '')}
              onChange={(e) => {
                setInput(e.target.value);
                if (partialVoice) setPartialVoice('');
                if (committedSource === 'voice') setCommittedSource('typed');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void onSubmit(e as unknown as FormEvent);
                }
              }}
              placeholder={
                voiceListening
                  ? 'Aan het luisteren…'
                  : voiceSupported
                    ? 'Typ je antwoord, of klik op de microfoon-knop'
                    : 'Typ je antwoord…'
              }
              rows={1}
              disabled={sending}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={sending || !input.trim()}
              aria-label="Verstuur"
            >
              <Send />
            </button>
          </form>
        )}

        {step?.done && (
          <div className="chat-composer" style={{ justifyContent: 'center' }}>
            <span className="muted">Interview voltooid — door naar de strategie…</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}
