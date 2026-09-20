import { useI18n } from '../../i18n/I18nContext.jsx';

export function Table({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = '', ...props }) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink2 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

// Extra props (colSpan, title, ...) are passed through to the <td>.
export function Td({ children, className = '', ...props }) {
  return (
    <td className={`px-4 py-3 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
}

export function THead({ children }) {
  return <thead className="border-b border-edge bg-panel2">{children}</thead>;
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-edge">{children}</tbody>;
}

export function EmptyRow({ colSpan, children }) {
  const { t } = useI18n();
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-ink2">
        {children || t('common.noRecords')}
      </td>
    </tr>
  );
}
