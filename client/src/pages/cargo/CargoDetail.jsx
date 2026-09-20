import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { StatusBadge, PaidBadge } from '../../components/ui/Badge.jsx';
import { Table, THead, TBody, Th, Td, EmptyRow } from '../../components/ui/Table.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { SelectInput } from '../../components/ui/Field.jsx';
import { CargoForm } from './CargoForm.jsx';
import { ORDER_STATUSES } from '../../lib/constants.js';
import { money, dateTime } from '../../lib/format.js';

export default function CargoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const { data: batch, loading, error, reload } = useApi(`/cargo/${id}`, null, [id]);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');

  if (loading) return <PageLoader />;
  if (error) return <p className="text-rose-600">{error}</p>;

  const orders = batch.orders;
  const allChecked = orders.length > 0 && selected.length === orders.length;
  const toggleAll = () => setSelected(allChecked ? [] : orders.map((o) => o.orderId));
  const toggle = (oid) => setSelected((s) => (s.includes(oid) ? s.filter((x) => x !== oid) : [...s, oid]));

  const applyBulkStatus = async () => {
    if (!bulkStatus) return toast.error(t('cargoDetail.pickStatus'));
    try {
      const { data } = await api.patch('/orders/bulk', { orderIds: selected, status: bulkStatus });
      toast.success(t('orders.updatedN', { n: data.updated }));
      setBulkOpen(false);
      setBulkStatus('');
      setSelected([]);
      reload();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const removeSelected = async () => {
    if (!confirm(t('cargoDetail.confirmRemove', { n: selected.length }))) return;
    try {
      const { data } = await api.delete(`/cargo/${id}/orders`, { data: { orderIds: selected } });
      toast.success(t('toast.removedN', { n: data.removed }));
      setSelected([]);
      reload();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const removeBatch = async () => {
    if (!confirm(t('cargoDetail.confirmDeleteBatch', { code: batch.cargoBatchCode }))) return;
    try {
      await api.delete(`/cargo/${id}`);
      toast.success(t('toast.batchDeleted'));
      navigate('/cargo');
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader
        title={batch.cargoBatchCode}
        subtitle={`${batch.origin} → ${batch.destination} · ${t(`status.cargo.${batch.status}`)}`}
      >
        <Link to="/cargo" className="btn-secondary">
          {t('common.back')}
        </Link>
        <button className="btn-secondary" onClick={() => setEditOpen(true)}>
          {t('cargoDetail.editBatch')}
        </button>
        <button className="btn-danger" onClick={removeBatch}>
          {t('common.delete')}
        </button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label={t('col.status')} value={<StatusBadge value={batch.status} kind="cargo" />} />
        <Info label={t('cargoDetail.weight')} value={`${batch.weight} kg`} />
        <Info label={t('cargoDetail.rate')} value={money(batch.cargoRate)} />
        <Info label={t('cargoDetail.totalCost')} value={money(batch.totalPrice)} />
        <Info label={t('cargoDetail.ordersInBatch')} value={orders.length} />
        <Info label={t('cargoDetail.departure')} value={dateTime(batch.departureDate)} />
        <Info label={t('cargoDetail.arrival')} value={dateTime(batch.arrivalDate)} />
        <Info label={t('cargoDetail.note')} value={batch.note || '—'} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">
          {t('cargoDetail.ordersHeading', { n: orders.length })}
        </h3>
        <button className="btn-primary py-1.5" onClick={() => setAddOpen(true)}>
          {t('cargoDetail.addOrders')}
        </button>
      </div>

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
          <span className="font-medium text-brand-800 dark:text-brand-200">
            {t('orders.selected', { n: selected.length })}
          </span>
          <div className="flex gap-2">
            <button className="btn-primary py-1.5" onClick={() => setBulkOpen(true)}>
              {t('cargoDetail.updateStatusBtn')}
            </button>
            <button className="btn-secondary py-1.5" onClick={removeSelected}>
              {t('cargoDetail.removeFromBatch')}
            </button>
          </div>
        </div>
      )}

      <div className="card mt-3">
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
              <Th>{t('col.tracking')}</Th>
              <Th>{t('col.total')}</Th>
            </tr>
          </THead>
          <TBody>
            {orders.length === 0 && <EmptyRow colSpan={8}>{t('cargoDetail.noOrders')}</EmptyRow>}
            {orders.map((o) => (
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
                <Td>{o.units}</Td>
                <Td>{o.trackingNumber || '—'}</Td>
                <Td className="font-medium">{money(o.totalAmount)}</Td>
              </tr>
            ))}
          </TBody>
        </Table>
      </div>

      <CargoForm open={editOpen} onClose={() => setEditOpen(false)} batch={batch} onSaved={reload} />

      <AddOrdersModal open={addOpen} onClose={() => setAddOpen(false)} cargoId={id} onDone={reload} />

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title={t('cargoDetail.updateNOrders', { n: selected.length })}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setBulkOpen(false)}>
              {t('common.cancel')}
            </button>
            <button className="btn-primary" onClick={applyBulkStatus}>
              {t('common.apply')}
            </button>
          </>
        }
      >
        <SelectInput
          label={t('cargoDetail.newOrderStatus')}
          includeBlank={t('cargoDetail.select')}
          value={bulkStatus}
          onChange={(e) => setBulkStatus(e.target.value)}
          options={ORDER_STATUSES.map((s) => ({ value: s, label: t(`status.order.${s}`) }))}
        />
      </Modal>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink2">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function AddOrdersModal({ open, onClose, cargoId, onDone }) {
  const toast = useToast();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/orders', { params: { unassigned: 'true', search, pageSize: 50 } })
      .then((r) => setRows(r.data.data))
      .catch((e) => toast.error(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      setPicked([]);
      setSearch('');
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async () => {
    if (!picked.length) return toast.error(t('cargoDetail.pickOrders'));
    setSaving(true);
    try {
      const { data } = await api.post(`/cargo/${cargoId}/orders`, { orderIds: picked });
      toast.success(t('toast.addedN', { n: data.added }));
      onDone();
      onClose();
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
      size="lg"
      title={t('cargoDetail.addModalTitle')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? t('common.saving') : t('cargoDetail.addNOrders', { n: picked.length || '' })}
          </button>
        </>
      }
    >
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          className="input"
          placeholder={t('cargoDetail.addSearchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-secondary">{t('common.search')}</button>
      </form>

      <div className="max-h-80 overflow-y-auto rounded-lg border border-edge">
        <Table>
          <THead>
            <tr>
              <Th className="w-10" />
              <Th>{t('col.order')}</Th>
              <Th>{t('col.customer')}</Th>
              <Th>{t('col.units')}</Th>
              <Th>{t('col.total')}</Th>
            </tr>
          </THead>
          <TBody>
            {loading && <EmptyRow colSpan={5}>{t('common.loading')}</EmptyRow>}
            {!loading && rows.length === 0 && <EmptyRow colSpan={5}>{t('cargoDetail.noUnassigned')}</EmptyRow>}
            {!loading &&
              rows.map((o) => (
                <tr
                  key={o.orderId}
                  className="cursor-pointer hover:bg-panel2"
                  onClick={() => toggle(o.orderId)}
                >
                  <Td>
                    <input type="checkbox" readOnly checked={picked.includes(o.orderId)} />
                  </Td>
                  <Td className="font-semibold text-brand-600">#{o.orderId}</Td>
                  <Td>
                    <div className="font-medium text-ink">{o.customerName}</div>
                    <div className="text-xs text-ink2">{o.customerPhone || '—'}</div>
                  </Td>
                  <Td>{o.itemCount}</Td>
                  <Td>{money(o.totalAmount)}</Td>
                </tr>
              ))}
          </TBody>
        </Table>
      </div>
    </Modal>
  );
}
