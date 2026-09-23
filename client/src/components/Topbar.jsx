import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { ControlToggles } from './ControlToggles.jsx';
import { initials } from '../lib/format.js';

export function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-edge bg-panel px-4 print:hidden">
      <button
        className="-ml-2 rounded-lg p-2 text-3xl leading-none text-ink2 hover:bg-panel2 lg:hidden"
        onClick={onMenu}
        aria-label="Menu"
      >
        ☰
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <ControlToggles />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-panel2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {initials(user?.username)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold text-ink">{user?.username}</span>
              <span className="block text-xs text-ink2">{t(`role.${user?.role}`)}</span>
            </span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-40 rounded-lg border border-edge bg-panel py-1 shadow-lg">
              <button
                onClick={logout}
                className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-panel2"
              >
                {t('common.signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
