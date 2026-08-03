import { useEffect, useRef } from 'react';

/**
 * Componente genérico para disparo automático com debounce
 */
export const AutoSave = ({ data, onSave, delay = 1000, enabled = true }) => {
  const isFirstRender = useRef(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (typeof onSave === 'function') {
        onSave(data);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, onSave]);

  return null;
};