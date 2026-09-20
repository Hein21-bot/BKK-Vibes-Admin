import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { api, apiErrorMessage } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { StatusBadge, PaidBadge } from '../../components/ui/Badge.jsx';
import { Table, THead, TBody, Th, Td } from '../../components/ui/Table.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { SelectInput } from '../../components/ui/Field.jsx';
import { OrderForm } from './OrderForm.jsx';
import { VoucherForm } from '../vouchers/VoucherForm.jsx';
import { ORDER_STATUSES } from '../../lib/constants.js';
import { money, dateTime, dateOnly } from '../../lib/format.js';

function Stepper({ timeline, t }) {
  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {timeline.map((step, i) => (
        <li key={step.status} className="flex items-center">
          <div className="flex flex-col items-center">
            <span
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold',
                step.current
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : step.reached
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-edge bg-panel text-ink2',
              )}
            >
              {step.reached && !step.current ? '✓' : i + 1}
            </span>
            <span
              className={clsx(
                'mt-1 max-w-[92px] text-center text-[11px] font-medium leading-tight',
                step.current ? 'text-brand-600' : step.reached ? 'text-ink' : 'text-ink2',
              )}
            >
              {t(`status.order.${step.status}`)}
            </span>
          </div>
          {i < timeline.length - 1 && (
            <span
              className={clsx(
                'mx-2 h-0.5 w-8 sm:w-12',
                timeline[i + 1].reached ? 'bg-emerald-500' : 'bg-edge',
              )}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink2">{label}</span>
      <span className="text-right font-medium text-ink">{children}</span>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const { data: order, loading, error, reload } = useApi(`/orders/${id}`, null, [id]);
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  if (loading) return <PageLoader />;
  if (error) return <p className="text-rose-600">{error}</p>;

  const patch = async (data, msg) => {
    try {
      await api.put(`/orders/${id}`, data);
      toast.success(msg);
      setStatusOpen(false);
      reload();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const remove = async () => {
    if (!confirm(t('orderDetail.confirmDelete', { id }))) return;
    try {
      await api.delete(`/orders/${id}`);
      toast.success(t('toast.orderDeleted'));
      navigate('/orders');
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('orderDetail.title', { id: order.orderId })}
        subtitle={t('orderDetail.createdOn', { date: dateTime(order.createdDatetime) })}
      >
        <Link to="/orders" className="btn-secondary">
          {t('common.back')}
        </Link>
        <button
          className="btn-secondary"
          onClick={() => {
            setNewStatus(order.status);
            setStatusOpen(true);
          }}
        >
          {t('orderDetail.updateStatus')}
        </button>
        <button
          className={!order.paid && order.status === 'awaiting_payment' ? 'btn-primary' : 'btn-secondary'}
          onClick={() =>
            patch(
              { paid: !order.paid },
              order.paid
                ? t('toast.markedUnpaid')
                : order.status === 'awaiting_payment'
                  ? t('toast.paymentConfirmed')
                  : t('toast.markedPaid'),
            )
          }
        >
          {order.paid ? t('orders.markUnpaid') : t('orderDetail.confirmPayment')}
        </button>
        <button className="btn-secondary" onClick={() => setEditOpen(true)}>
          {t('common.edit')}
        </button>
        <button className="btn-danger" onClick={remove}>
          {t('common.delete')}
        </button>
      </PageHeader>

      <div className="card mb-4 p-5">
        <h3 className="mb-4 text-sm font-semibold text-ink">{t('orderDetail.statusTimeline')}</h3>
        <Stepper timeline={order.timeline} t={t} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h3 className="mb-2 text-sm font-semibold text-ink">{t('orderDetail.customer')}</h3>
          <InfoRow label={t('orderDetail.name')}>{order.customerName}</InfoRow>
          <InfoRow label={t('orderDetail.phone')}>{order.customerPhone || '—'}</InfoRow>
          <InfoRow label={t('orderDetail.address')}>{order.customerAddress || '—'}</InfoRow>
        </div>

        <div className="card p-5">
          <h3 className="mb-2 text-sm font-semibold text-ink">{t('orderDetail.order')}</h3>
          <InfoRow label={t('col.status')}>
            <StatusBadge value={order.status} />
          </InfoRow>
          <InfoRow label={t('orderDetail.payment')}>
            <PaidBadge paid={order.paid} />
          </InfoRow>
          <InfoRow label={t('orderDetail.total')}>{money(order.totalAmount)}</InfoRow>
          <InfoRow label={t('orderDetail.trackingNo')}>{order.trackingNumber || '—'}</InfoRow>
          <InfoRow label={t('orderDetail.note')}>{order.note || '—'}</InfoRow>
        </div>

        <div className="card p-5">
          <h3 className="mb-2 text-sm font-semibold text-ink">{t('orderDetail.cargo')}</h3>
          {order.cargoBatch ? (
            <>
              <InfoRow label={t('orderDetail.batch')}>
                <Link to={`/cargo/${order.cargoBatch.cargoId}`} className="text-brand-600">
                  {order.cargoBatch.cargoBatchCode}
                </Link>
              </InfoRow>
              <InfoRow label={t('col.status')}>{t(`status.cargo.${order.cargoBatch.status}`)}</InfoRow>
              <InfoRow label={t('orderDetail.route')}>
                {order.cargoBatch.origin} → {order.cargoBatch.destination}
              </InfoRow>
            </>
          ) : (
            <p className="text-sm text-ink2">{t('orderDetail.notInBatch')}</p>
          )}
        </div>
      </div>

      <div className="card mt-4">
        <h3 className="px-4 py-3 text-sm font-semibold text-ink">{t('orderDetail.products')}</h3>
        <Table>
          <THead>
            <tr>
              <Th>{t('orderForm.productName')}</Th>
              <Th>{t('orderForm.color')}</Th>
              <Th>{t('orderForm.size')}</Th>
              <Th>{t('orderForm.qty')}</Th>
              <Th>{t('orderDetail.unitPrice')}</Th>
              <Th>{t('orderDetail.subtotal')}</Th>
            </tr>
          </THead>
          <TBody>
            {order.items.map((it) => (
              <tr key={it.orderItemId}>
                <Td>{it.productName}</Td>
                <Td>{it.color || '—'}</Td>
                <Td>{it.size || '—'}</Td>
                <Td>{it.quantity}</Td>
                <Td>{money(it.unitPrice)}</Td>
                <Td className="font-medium">{money(it.subtotal)}</Td>
              </tr>
            ))}
            <tr className="bg-panel2 font-semibold">
              <Td colSpan={5} className="text-right">
                {t('orderDetail.total')}
              </Td>
              <Td>{money(order.totalAmount)}</Td>
            </tr>
          </TBody>
        </Table>
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">{t('orderDetail.vouchers')}</h3>
          <button className="btn-primary py-1.5" onClick={() => setVoucherOpen(true)}>
            {t('orderDetail.createVoucher')}
          </button>
        </div>
        {order.vouchers.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-ink2">{t('orderDetail.noVouchers')}</p>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t('voucher.no')}</Th>
                <Th>{t('voucher.date')}</Th>
                <Th>{t('voucher.total')}</Th>
              </tr>
            </THead>
            <TBody>
              {order.vouchers.map((v) => (
                <tr key={v.voucherId} className="hover:bg-panel2">
                  <Td>
                    <Link to={`/vouchers/${v.voucherId}`} className="font-semibold text-brand-600">
                      {v.voucherNo}
                    </Link>
                  </Td>
                  <Td className="text-ink2">{dateOnly(v.voucherDate)}</Td>
                  <Td className="font-medium">{money(v.totalAmount)}</Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <OrderForm open={editOpen} onClose={() => setEditOpen(false)} order={order} onSaved={reload} />

      <VoucherForm
        open={voucherOpen}
        onClose={() => setVoucherOpen(false)}
        prefill={{ orderId: order.orderId, customerName: order.customerName, items: order.items }}
        onSaved={(v) => navigate(`/vouchers/${v.voucherId}`)}
      />

      <Modal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title={t('orderDetail.updateOrderStatus')}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setStatusOpen(false)}>
              {t('common.cancel')}
            </button>
            <button
              className="btn-primary"
              onClick={() => patch({ status: newStatus }, t('toast.statusUpdated'))}
            >
              {t('common.save')}
            </button>
          </>
        }
      >
        <SelectInput
          label={t('col.status')}
          includeBlank={false}
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          options={ORDER_STATUSES.map((s) => ({ value: s, label: t(`status.order.${s}`) }))}
        />
      </Modal>
    </div>
  );
}
