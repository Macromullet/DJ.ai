import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import './Toast.css';

/* ─── Types ─── */

export type ToastType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  exiting: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

/* ─── Constants ─── */

const MAX_VISIBLE = 5;
const EXIT_ANIMATION_MS = 250;

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  info: 4000,
  success: 4000,
  warning: 6000,
  error: 6000,
};

const ICONS: Record<ToastType, string> = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️',
};

/* ─── Reducer ─── */

type Action =
  | { type: 'ADD'; toast: Toast }
  | { type: 'MARK_EXIT'; id: number }
  | { type: 'REMOVE'; id: number };

function toastReducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case 'ADD': {
      const next = [...state, action.toast];
      return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
    }
    case 'MARK_EXIT':
      return state.map((t) =>
        t.id === action.id ? { ...t, exiting: true } : t
      );
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

/* ─── Context ─── */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return ctx;
}

/* ─── Provider ─── */

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const dismiss = useCallback((id: number) => {
    dispatch({ type: 'MARK_EXIT', id });
    setTimeout(() => dispatch({ type: 'REMOVE', id }), EXIT_ANIMATION_MS);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const id = ++nextId;
      const resolvedDuration = duration ?? DEFAULT_DURATIONS[type];
      dispatch({
        type: 'ADD',
        toast: { id, message, type, duration: resolvedDuration, exiting: false },
      });
    },
    []
  );

  const value: ToastContextValue = { showToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/* ─── Container ─── */

interface ToastContainerProps {
  toasts?: Toast[];
  onDismiss?: (id: number) => void;
}

export function ToastContainer({ toasts = [], onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss?.(toast.id)}
        />
      ))}
    </div>
  );
}

/* ─── Individual Toast ─── */

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(timerRef.current);
  }, [toast.duration, onDismiss]);

  const className = [
    'toast',
    `toast-${toast.type}`,
    toast.exiting ? 'toast-exit' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} role="status">
      <span className="toast-icon" aria-hidden="true">
        {ICONS[toast.type]}
      </span>
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}
