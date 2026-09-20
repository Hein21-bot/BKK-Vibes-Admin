import { useTheme } from '../context/ThemeContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

// Compact theme + language switchers, used in the Topbar and on the Login page.
export function ControlToggles({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useI18n();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={toggleLang}
        className="rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-panel2"
        title={lang === 'en' ? t('lang.my') : t('lang.en')}
      >
        {lang === 'en' ? 'မြန်မာ' : 'EN'}
      </button>
      <button
        onClick={toggleTheme}
        className="rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink hover:bg-panel2"
        title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
        aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  );
}
