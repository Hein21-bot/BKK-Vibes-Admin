import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { en } from './en.js';
import { my } from './my.js';

const DICTS = { en, my };
const STORAGE_KEY = 'cargo-admin:lang';

const I18nContext = createContext(null);

function detectInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'my') return saved;
  } catch {
    /* ignore */
  }
  return 'en';
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const setLang = useCallback((l) => setLangState(l), []);
  const toggleLang = useCallback(() => setLangState((l) => (l === 'en' ? 'my' : 'en')), []);

  const t = useCallback(
    (key, vars) => {
      let str = DICTS[lang]?.[key] ?? en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replaceAll(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

// Convenience: just the translate fn.
export const useT = () => useI18n().t;
