import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage, downloadFile } from '../../api/client.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Table, THead, TBody, Th, Td, EmptyRow } from '../../components/ui/Table.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { Badge, PaidBadge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { SelectInput } from '../../components/ui/Field.jsx';
import { ExpenseForm } from './ExpenseForm.jsx';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_COLORS } from '../../lib/constants.js';
import { money, dateOnly } from '../../lib/format.js';

const emptyFilters = { category: '', paid: '', search: '', dateFrom: '', dateTo: '' };

function SummaryCard({ label, value, accent = 'text-ink' }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink2">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

export default function ExpensesList() {
  const toast = useToast();
  const { t } = useI18n();
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/expenses', { params: { ...applied, page, pageSize: 15 } })
      .then((r) => setResp(r.data))
      .catch((e) => toast.error(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [applied, page]);

  const apply = (e) => {
    e?.preventDefault();
    setPage(1);
    setApplied(filters);
  };
  const reset = () => {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  };

  const togglePaid = async (row) => {
    try {
      await api.put(`/expenses/${row.expenseId}`, { paid: !row.paid });
      toast.success(row.paid ? t('toast.expenseMarkedUnpaid') : t('toast.expenseMarkedPaid'));
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const remove = async (row) => {
    if (!confirm(t('expenses.confirmDelete'))) return;
    try {
      await api.delete(`/expenses/${row.expenseId}`);
      toast.success(t('toast.expenseDeleted'));
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const exportExpenses = (format) =>
    downloadFile('/expenses/export', { ...applied, format }, `expenses.${format}`).catch((e) =>
      toast.error(apiErrorMessage(e)),
    );

  const rows = resp?.data || [];
  const summary = resp?.summary;

  return (
    <div>
      <PageHeader
        title={t('expenses.title')}
        subtitle={resp ? t('expenses.count', { n: resp.pagination.total }) : t('expenses.subtitle')}
      >
        <button className="btn-secondary" onClick={() => exportExpenses('csv')}>
          {t('common.exportCsv')}
        </button>
        <button className="btn-secondary" onClick={() => exportExpenses('xlsx')}>
          {t('common.exportExcel')}
        </button>
        <button
          className="btn-primary"
          onClick={() => {
            setEditRow(null);
            setFormOpen(true);
          }}
        >
          {t('expenses.new')}
        </button>
      </PageHeader>

      {summary && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label={t('expenses.total')} value={money(summary.totalAmount)} />
          <SummaryCard label={t('expenses.paidSum')} value={money(summary.paidAmount)} accent="text-emerald-500" />
          <SummaryCard label={t('expenses.unpaidSum')} value={money(summary.unpaidAmount)} accent="text-rose-500" />
        </div>
      )}

      <form onSubmit={apply} className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="label">{t('common.search')}</span>
          <input
            className="input"
            placeholder={t('expenses.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </label>
        <SelectInput
          label={t('expenses.category')}
          includeBlank={t('common.all')}
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: t(`cat.${c}`) }))}
        />
        <SelectInput
          label={t('expenses.status')}
          includeBlank={t('common.all')}
          value={filters.paid}
          onChange={(e) => setFilters({ ...filters, paid: e.target.value })}
          options={[
            { value: 'true', label: t('paid.paid') },
            { value: 'false', label: t('paid.unpaid') },
          ]}
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label">{t('orders.from')}</span>
            <input
              type="date"
              className="input"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="label">{t('orders.to')}</span>
            <input
              type="date"
              className="input"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </label>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary">
            {t('common.apply')}
          </button>
          <button type="button" className="btn-secondary" onClick={reset}>
            {t('common.reset')}
          </button>
        </div>
      </form>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-7 w-7" />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t('expenses.date')}</Th>
                <Th>{t('expenses.title_field')}</Th>
                <Th>{t('expenses.category')}</Th>
                <Th>{t('expenses.amount')}</Th>
                <Th>{t('expenses.status')}</Th>
                <Th>{t('col.batch')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {rows.length === 0 && <EmptyRow colSpan={7} />}
              {rows.map((e) => (
                <tr key={e.expenseId} className="hover:bg-panel2">
                  <Td className="whitespace-nowrap text-ink2">{dateOnly(e.expenseDate)}</Td>
                  <Td>
                    <div className="font-medium text-ink">{e.title}</div>
                    {e.note && <div className="text-xs text-ink2">{e.note}</div>}
                  </Td>
                  <Td>
                    <Badge className={EXPENSE_CATEGORY_COLORS[e.category]}>{t(`cat.${e.category}`)}</Badge>
                  </Td>
                  <Td className="font-medium">{money(e.amount)}</Td>
                  <Td>
                    <button onClick={() => togglePaid(e)} title={t('expenses.markPaid')}>
                      <PaidBadge paid={e.paid} />
                    </button>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {e.cargoBatchId ? (
                      <Link to={`/cargo/${e.cargoBatchId}`} className="font-medium text-brand-600">
                        {e.cargoBatchCode}
                      </Link>
                    ) : (
                      <span className="text-ink2">—</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex gap-3">
                      <button
                        className="text-sm text-brand-600"
                        onClick={() => {
                          setEditRow(e);
                          setFormOpen(true);
                        }}
                      >
                        {t('common.edit')}
                      </button>
                      <button className="text-sm text-rose-600" onClick={() => remove(e)}>
                        {t('common.delete')}
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
        <Pagination pagination={resp?.pagination} onChange={setPage} />
      </div>

      <ExpenseForm open={formOpen} onClose={() => setFormOpen(false)} expense={editRow} onSaved={load} />
    </div>
  );
}
