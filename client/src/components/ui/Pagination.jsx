import { useI18n } from '../../i18n/I18nContext.jsx';

export function Pagination({ pagination, onChange }) {
  const { t } = useI18n();
  if (!pagination) return null;
  const { page, totalPages, total, pageSize } = pagination;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-4 py-3 text-sm text-ink2">
      <span>{t('pager.showing', { from, to, total })}</span>
      <div className="flex items-center gap-1">
        <button className="btn-secondary px-2.5 py-1" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          {t('pager.prev')}
        </button>
        <span className="px-2">{t('pager.page', { page, pages: totalPages })}</span>
        <button
          className="btn-secondary px-2.5 py-1"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          {t('pager.next')}
        </button>
      </div>
    </div>
  );
}
