import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, apiErrorMessage } from '../../api/client.js';

// Price Calculator data lives in the database (table pricing_settings, one row per key).
// Only these keys are synced. `activeTab` and `settingsLocked` stay per-browser (see
// hooks/usePersistentState.js) because they are view preferences, not data.
export const PRICING_KEYS = ['assumptions', 'tiers', 'weightPresets', 'marketRef', 'priceCalc', 'batchRows'];

const LEGACY_PREFIX = 'cargo-admin:pricing:';
const SAVE_DELAY_MS = 600;

// The calculator uses NaN for "empty / auto" number fields, but JSON has no NaN
// (it would silently become null). Send it as a sentinel and restore it on load.
const NAN = '__NaN__';
const encode = (v) => {
  if (typeof v === 'number' && Number.isNaN(v)) return NAN;
  if (Array.isArray(v)) return v.map(encode);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)]));
  return v;
};
const decode = (v) => {
  if (v === NAN) return NaN;
  if (Array.isArray(v)) return v.map(decode);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decode(x)]));
  return v;
};
// Values saved in the browser by the old version stored NaN as null.
const decodeLegacy = (v) => {
  if (v === null) return NaN;
  if (Array.isArray(v)) return v.map(decodeLegacy);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decodeLegacy(x)]));
  return v;
};

const PricingContext = createContext(null);

export function PricingProvider({ children }) {
  const [load, setLoad] = useState({ status: 'loading', data: null, error: '' });
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const timers = useRef(new Map());
  const pending = useRef(new Map());
  const failed = useRef(new Map());

  const settle = useCallback(() => {
    if (pending.current.size === 0 && timers.current.size === 0) {
      setSaveState(failed.current.size ? 'error' : 'saved');
    }
  }, []);

  const flushKey = useCallback(
    async (key) => {
      clearTimeout(timers.current.get(key));
      timers.current.delete(key);
      if (!pending.current.has(key)) return;
      const value = pending.current.get(key);
      pending.current.delete(key);
      try {
        await api.put(`/pricing/${key}`, { value: encode(value) });
        failed.current.delete(key);
      } catch {
        failed.current.set(key, value);
      }
      settle();
    },
    [settle],
  );

  const save = useCallback(
    (key, value) => {
      pending.current.set(key, value);
      failed.current.delete(key);
      setSaveState('saving');
      clearTimeout(timers.current.get(key));
      timers.current.set(key, setTimeout(() => flushKey(key), SAVE_DELAY_MS));
    },
    [flushKey],
  );

  const retry = useCallback(() => {
    for (const [key, value] of failed.current) save(key, value);
  }, [save]);

  // Don't lose an edit made just before leaving the page.
  useEffect(
    () => () => {
      for (const key of [...pending.current.keys()]) flushKey(key);
    },
    [flushKey],
  );

  const fetchAll = useCallback(async () => {
    setLoad({ status: 'loading', data: null, error: '' });
    try {
      const { data: res } = await api.get('/pricing');
      const data = Object.fromEntries(Object.entries(res.settings).map(([k, v]) => [k, decode(v)]));

      // One-time move of settings the old (browser-only) version saved on this device.
      const migrated = [];
      for (const key of PRICING_KEYS) {
        if (key in data) continue;
        try {
          const raw = localStorage.getItem(LEGACY_PREFIX + key);
          if (raw == null) continue;
          data[key] = decodeLegacy(JSON.parse(raw));
          migrated.push(key);
        } catch {
          /* ignore unreadable legacy value */
        }
      }
      await Promise.all(
        migrated.map((key) =>
          api
            .put(`/pricing/${key}`, { value: encode(data[key]) })
            .then(() => localStorage.removeItem(LEGACY_PREFIX + key))
            .catch(() => {}),
        ),
      );

      setLoad({ status: 'ready', data, error: '' });
    } catch (e) {
      setLoad({ status: 'error', data: null, error: apiErrorMessage(e) });
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const value = useMemo(
    () => ({ data: load.data, save, saveState, retry, reload: fetchAll }),
    [load.data, save, saveState, retry, fetchAll],
  );

  return <PricingContext.Provider value={{ ...value, load }}>{children}</PricingContext.Provider>;
}

export const usePricingStore = () => useContext(PricingContext);

// Same shape as useState / usePersistentState, but stored in the database.
// Object values are merged over `initial` so newly added fields keep their defaults.
export function usePricingState(key, initial) {
  const store = usePricingStore();
  const [value, setValue] = useState(() => {
    const stored = store.data?.[key];
    if (stored === undefined) return initial;
    if (
      initial && typeof initial === 'object' && !Array.isArray(initial) &&
      stored && typeof stored === 'object' && !Array.isArray(stored)
    ) {
      return { ...initial, ...stored };
    }
    return stored;
  });

  // Only save once the value has really changed: merely opening the page (React runs
  // effects twice in development) must not write the built-in defaults to the database.
  const baseline = useRef(value);
  useEffect(() => {
    if (baseline.current !== null && value === baseline.current) return;
    baseline.current = null;
    store.save(key, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  return [value, setValue];
}
