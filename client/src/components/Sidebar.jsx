import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useI18n } from '../i18n/I18nContext.jsx';

const NAV = [
  { to: '/', key: 'nav.dashboard', icon: '📊', end: true },
  { to: '/orders', key: 'nav.orders', icon: '🧾' },
  { to: '/to-buy', key: 'nav.toBuy', icon: '🛒' },
  { to: '/cargo', key: 'nav.cargo', icon: '📦' },
  { to: '/products', key: 'nav.products', icon: '🛍️' },
  { to: '/vouchers', key: 'nav.vouchers', icon: '🎫' },
  { to: '/expenses', key: 'nav.expenses', icon: '💸' },
  { to: '/pricing', key: 'nav.pricing', icon: '🧮' },
];

export function Sidebar({ open, onClose }) {
  const { t } = useI18n();
  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden" onClick={onClose} />}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 w-60 transform border-r border-edge bg-panel transition-transform lg:static lg:translate-x-0 print:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-edge px-5">
          <span className="text-xl">📦</span>
          <span className="text-base font-bold text-ink">{t('app.name')}</span>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'text-ink2 hover:bg-panel2',
                )
              }
            >
              <span className="text-base">{n.icon}</span>
              {t(n.key)}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
