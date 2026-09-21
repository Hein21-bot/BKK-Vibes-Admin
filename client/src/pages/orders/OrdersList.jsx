import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage, downloadFile } from '../../api/client.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Table, THead, TBody, Th, Td, EmptyRow } from '../../components/ui/Table.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StatusBadge, PaidBadge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { SelectInput } from '../../components/ui/Field.jsx';
import { OrderForm } from './OrderForm.jsx';
import { ORDER_STATUSES } from '../../lib/constants.js';
import { money, dateOnly } from '../../lib/format.js';

const emptyFilters = { status: '', paid: '', search: '', dateFrom: '', dateTo: '', cargoBatchId: '' };

export default function OrdersList() {
  const toast = useToast();
  const { t } = useI18n();
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cargoOptions, setCargoOptions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const statusOptions = ORDER_STATUSES.map((s) => ({ value: s, label: t(`status.order.${s}`) }));

  useEffect(() => {
    api
      .get('/cargo', { params: { pageSize: 100 } })
      .then((r) => setCargoOptions(r.data.data.map((c) => ({ value: c.cargoId, label: c.cargoBatchCode }))));
  }, []);

  const load = () => {
    setLoading(true);
    api
      .get('/orders', { params: { ...applied, page, pageSize: 15 } })
      .then((r) => {
        setResp(r.data);
        setSelected([]);
      })
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

  const rows = resp?.data || [];
  const allChecked = rows.length > 0 && selected.length === rows.length;
  const toggleAll = () => setSelected(allChecked ? [] : rows.map((r) => r.orderId));
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const exportOrders = (format) =>
    downloadFile('/orders/export', { ...applied, format }, `orders.${format}`).catch((e) =>
      toast.error(apiErrorMessage(e)),
    );

  return (
    <div>
      <PageHeader title={t('orders.title')} subtitle={resp ? t('orders.count', { n: resp.pagination.total }) : ''}>
        <button className="btn-secondary" onClick={() => exportOrders('csv')}>
          {t('common.exportCsv')}
        </button>
        <button className="btn-secondary" onClick={() => exportOrders('xlsx')}>
          {t('common.exportExcel')}
        </button>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          {t('orders.new')}
        </button>
      </PageHeader>

      <form onSubmit={apply} className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="label">{t('common.search')}</span>
          <input
            className="input"
            placeholder={t('orders.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </label>
        <SelectInput
          label={t('col.status')}
          includeBlank={t('common.all')}
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          options={statusOptions}
        />
        <SelectInput
          label={t('orders.filterPayment')}
          includeBlank={t('common.all')}
          value={filters.paid}
          onChange={(e) => setFilters({ ...filters, paid: e.target.value })}
          options={[
            { value: 'true', label: t('paid.paid') },
            { value: 'false', label: t('paid.unpaid') },
          ]}
        />
        <SelectInput
          label={t('orders.filterCargo')}
          includeBlank={t('common.all')}
          value={filters.cargoBatchId}
          onChange={(e) => setFilters({ ...filters, cargoBatchId: e.target.value })}
          options={cargoOptions}
        />
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
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary">
            {t('common.search')}
          </button>
          <button type="button" className="btn-secondary" onClick={reset}>
            {t('common.reset')}
          </button>
        </div>
      </form>

      {selected.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
          <span className="font-medium text-brand-800 dark:text-brand-200">
            {t('orders.selected', { n: selected.length })}
          </span>
          <button className="btn-primary py-1.5" onClick={() => setBulkOpen(true)}>
            {t('orders.bulkUpdate')}
          </button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-7 w-7" />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th className="w-10">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </Th>
                <Th>{t('col.order')}</Th>
                <Th>{t('col.customer')}</Th>
                <Th>{t('col.status')}</Th>
                <Th>{t('col.paid')}</Th>
                <Th>{t('col.units')}</Th>
                <Th>{t('col.total')}</Th>
                <Th>{t('col.cargo')}</Th>
                <Th>{t('col.created')}</Th>
              </tr>
            </THead>
            <TBody>
              {rows.length === 0 && <EmptyRow colSpan={9} />}
              {rows.map((o) => (
                <tr key={o.orderId} className="hover:bg-panel2">
                  <Td>
                    <input
                      type="checkbox"
                      checked={selected.includes(o.orderId)}
                      onChange={() => toggle(o.orderId)}
                    />
                  </Td>
                  <Td>
                    <Link to={`/orders/${o.orderId}`} className="font-semibold text-brand-600">
                      #{o.orderId}
                    </Link>
                  </Td>
                  <Td>
                    <div className="font-medium text-ink">{o.customerName}</div>
                    <div className="text-xs text-ink2">{o.customerPhone || '—'}</div>
                  </Td>
                  <Td>
                    <StatusBadge value={o.status} />
                  </Td>
                  <Td>
                    <PaidBadge paid={o.paid} />
                  </Td>
                  <Td>{o.itemCount}</Td>
                  <Td className="font-medium">{money(o.totalAmount)}</Td>
                  <Td>
                    {o.cargoBatch ? (
                      <Link to={`/cargo/${o.cargoBatch.cargoId}`} className="text-brand-600">
                        {o.cargoBatch.cargoBatchCode}
                      </Link>
                    ) : (
                      <span className="text-ink2">—</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-ink2">{dateOnly(o.createdDatetime)}</Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
        <Pagination pagination={resp?.pagination} onChange={setPage} />
      </div>

      <OrderForm open={showForm} onClose={() => setShowForm(false)} onSaved={load} />
      <BulkModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        orderIds={selected}
        cargoOptions={cargoOptions}
        onDone={load}
      />
    </div>
  );
}

function BulkModal({ open, onClose, orderIds, cargoOptions, onDone }) {
  const toast = useToast();
  const { t } = useI18n();
  const [status, setStatus] = useState('');
  const [paid, setPaid] = useState('');
  const [cargoBatchId, setCargoBatchId] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const payload = { orderIds };
    if (status) payload.status = status;
    if (paid) payload.paid = paid === 'true';
    if (cargoBatchId) payload.cargoBatchId = Number(cargoBatchId);
    if (Object.keys(payload).length === 1) return toast.error(t('orders.chooseChange'));
    setSaving(true);
    try {
      const { data } = await api.patch('/orders/bulk', payload);
      toast.success(t('orders.updatedN', { n: data.updated }));
      onDone();
      onClose();
      setStatus('');
      setPaid('');
      setCargoBatchId('');
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('orders.bulkTitle', { n: orderIds.length })}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? t('common.saving') : t('orders.applyAll')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <SelectInput
          label={t('orders.orderStatus')}
          includeBlank={t('orders.noChange')}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={ORDER_STATUSES.map((s) => ({ value: s, label: t(`status.order.${s}`) }))}
        />
        <SelectInput
          label={t('orders.filterPayment')}
          includeBlank={t('orders.noChange')}
          value={paid}
          onChange={(e) => setPaid(e.target.value)}
          options={[
            { value: 'true', label: t('orders.markPaid') },
            { value: 'false', label: t('orders.markUnpaid') },
          ]}
        />
        <SelectInput
          label={t('orders.assignCargo')}
          includeBlank={t('orders.noChange')}
          value={cargoBatchId}
          onChange={(e) => setCargoBatchId(e.target.value)}
          options={cargoOptions}
        />
      </div>
    </Modal>
  );
}
