import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle } from 'lucide-react';

interface ToastState {
  message: string;
  visible: boolean;
}

interface ToastApi {
  show: (message: string, durationMs?: number) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({ message: '', visible: false });
  const hideTimer = useRef<number | null>(null);
  const removeTimer = useRef<number | null>(null);

  const show = useCallback((message: string, durationMs = 2400) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (removeTimer.current) window.clearTimeout(removeTimer.current);
    setState({ message, visible: true });
    hideTimer.current = window.setTimeout(() => {
      setState((s) => ({ ...s, visible: false }));
      removeTimer.current = window.setTimeout(() => {
        setState({ message: '', visible: false });
      }, 320);
    }, durationMs);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (removeTimer.current) window.clearTimeout(removeTimer.current);
    };
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {state.message && (
        <div className={`toast${state.visible ? ' show' : ''}`}>
          <span className="toast-icon">
            <CheckCircle />
          </span>
          <span>{state.message}</span>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
