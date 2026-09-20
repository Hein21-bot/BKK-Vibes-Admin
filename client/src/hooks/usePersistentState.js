import { useEffect, useRef, useState } from 'react';

const PREFIX = 'cargo-admin:pricing:';

// useState that mirrors to localStorage, tolerant of private-mode / disabled storage.
export function usePersistentState(key, initial) {
  const storageKey = PREFIX + key;

  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw != null) {
        const parsed = JSON.parse(raw);
        // Merge object shapes so newly added fields keep their defaults;
        // arrays and primitives are replaced wholesale.
        if (
          initial &&
          typeof initial === 'object' &&
          !Array.isArray(initial) &&
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed)
        ) {
          return { ...initial, ...parsed };
        }
        return parsed;
      }
    } catch {
      /* ignore */
    }
    return initial;
  });

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [storageKey, value]);

  return [value, setValue];
}

export function clearPersistedPricing() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
