import clsx from 'clsx';
import { STATUS_COLORS, CARGO_STATUS_COLORS } from '../../lib/constants.js';
import { useI18n } from '../../i18n/I18nContext.jsx';

export function Badge({ children, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className || 'bg-panel2 text-ink2',
      )}
    >
      {children}
    </span>
  );
}

// kind: 'order' | 'cargo'
export function StatusBadge({ value, kind = 'order' }) {
  const { t } = useI18n();
  if (!value) return <span className="text-ink2">—</span>;
  return <Badge className={(kind === 'cargo' ? CARGO_STATUS_COLORS : STATUS_COLORS)[value]}>{t(`status.${kind}.${value}`)}</Badge>;
}

export function PaidBadge({ paid }) {
  const { t } = useI18n();
  return paid ? (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
      {t('paid.paid')}
    </Badge>
  ) : (
    <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
      {t('paid.unpaid')}
    </Badge>
  );
}
