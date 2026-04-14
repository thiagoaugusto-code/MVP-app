import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import styles from './ToastProvider.module.css';

const ToastContext = createContext(null);

const DEFAULT_DURATION_MS = 2600;

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timeoutsRef.current.get(id);
    if (t) clearTimeout(t);
    timeoutsRef.current.delete(id);
  }, []);

  const push = useCallback(
    (toast) => {
      const id = toast.id || makeId();
      const durationMs = toast.durationMs ?? DEFAULT_DURATION_MS;

      setToasts((prev) => {
        const next = [{ ...toast, id }, ...prev];
        return next.slice(0, 3);
      });

      if (durationMs !== Infinity) {
        const timeout = setTimeout(() => remove(id), durationMs);
        timeoutsRef.current.set(id, timeout);
      }
      return id;
    },
    [remove]
  );

  const api = useMemo(() => {
    return {
      push,
      remove,
      success: (message, opts) => push({ type: 'success', message, ...opts }),
      error: (message, opts) => push({ type: 'error', message, ...opts }),
      info: (message, opts) => push({ type: 'info', message, ...opts }),
    };
  }, [push, remove]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.viewport} role="region" aria-label="Notificações">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toast} ${styles[t.type] || ''}`}
            role="status"
            aria-live="polite"
          >
            <div className={styles.message}>{t.message}</div>
            <button className={styles.close} onClick={() => remove(t.id)} aria-label="Fechar">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

