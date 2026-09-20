import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { TextInput, SelectInput } from '../../components/ui/Field.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { money } from '../../lib/format.js';
import { useProductSuggestions, ProductDatalist, findProduct } from '../../components/ProductSuggestions.jsx';

const blankItem = () => ({ productName: '', color: '', size: '', quantity: 1, unitPrice: '' });

function Labeled({ label, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-0.5 block text-xs text-ink2">{label}</span>
      {children}
    </label>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

// Products of an order -> voucher lines.
const linesFromOrder = (order) =>
  order.items.map((i) => ({
    productName: i.productName,
    color: i.color || '',
    size: i.size || '',
    quantity: i.quantity,
    unitPrice: i.unitPrice,
  }));

// `prefill` = { orderId, customerName, items } — used when creating a voucher from an order.
export function VoucherForm({ open, onClose, voucher, prefill, onSaved }) {
  const toast = useToast();
  const { t } = useI18n();
  const editing = !!voucher;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!open) return;
    const src = voucher || prefill;
    setForm({
      orderId: src?.orderId ? String(src.orderId) : '',
      customerName: src?.customerName || '',
      voucherDate: (voucher?.voucherDate || new Date().toISOString()).slice(0, 10) || today(),
      discountAmount: voucher?.discountAmount || '',
      items: src?.items?.length
        ? src.items.map((i) => ({
            productName: i.productName,
            color: i.color || '',
            size: i.size || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          }))
        : [blankItem()],
    });
    api
      .get('/orders', { params: { pageSize: 100 } })
      .then((r) => setOrders(r.data.data))
      .catch(() => setOrders([]));
    // `prefill` is only read when the form opens (so typing is never reset).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, voucher]);

  const products = useProductSuggestions(open);

  if (!open || !form) return null;

  const orderOptions = orders.map((o) => ({
    value: String(o.orderId),
    label: `#${o.orderId} · ${o.customerName} · ${money(o.totalAmount)}`,
  }));
  // An older order that is not in the latest 100 must still show as selected.
  if (form.orderId && !orderOptions.some((o) => o.value === form.orderId)) {
    orderOptions.unshift({ value: form.orderId, label: `#${form.orderId}` });
  }

  const isPristine = !form.customerName.trim() && form.items.every((it) => !it.productName.trim());

  const fillFromOrder = async (orderId) => {
    try {
      const { data: order } = await api.get(`/orders/${orderId}`);
      setForm((f) => ({ ...f, customerName: order.customerName, items: linesFromOrder(order) }));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const onPickOrder = (value) => {
    setForm((f) => ({ ...f, orderId: value }));
    // Only auto-fill an untouched form; otherwise the explicit button below does it.
    if (value && isPristine) fillFromOrder(value);
  };

  const setItem = (idx, patch) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));

  // Typing a known product name fills its price (only when the price is still empty).
  const onNameChange = (idx, name) => {
    const match = findProduct(products, name);
    const empty = form.items[idx].unitPrice === '' || form.items[idx].unitPrice == null;
    setItem(idx, match && empty ? { productName: name, unitPrice: match.price } : { productName: name });
  };

  const lineAmount = (it) => Number(it.quantity || 0) * Number(it.unitPrice || 0);
  const subtotal = form.items.reduce((s, it) => s + lineAmount(it), 0);
  const discount = Number(form.discountAmount) || 0;
  const total = subtotal - discount;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim()) return toast.error(t('voucher.errCustomer'));
    const items = form.items
      .map((it) => ({
        productName: it.productName.trim(),
        color: it.color.trim(),
        size: it.size.trim(),
        quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
        unitPrice: Number(it.unitPrice) || 0,
      }))
      .filter((it) => it.productName);
    if (!items.length) return toast.error(t('voucher.errProduct'));
    if (discount > subtotal) return toast.error(t('voucher.errDiscount'));

    const payload = {
      orderId: form.orderId ? Number(form.orderId) : null,
      customerName: form.customerName.trim(),
      voucherDate: new Date(form.voucherDate).toISOString(),
      discountAmount: discount,
      items,
    };
    setSaving(true);
    try {
      const { data } = editing
        ? await api.put(`/vouchers/${voucher.voucherId}`, payload)
        : await api.post('/vouchers', payload);
      toast.success(editing ? t('toast.voucherUpdated') : t('toast.voucherCreated'));
      onSaved?.(data, !editing);
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? t('vouchers.editTitle', { no: voucher.voucherNo }) : t('vouchers.newTitle')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <ProductDatalist id="product-suggestions" products={products} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label={t('voucher.customerName')}
            required
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          />
          <TextInput
            label={t('voucher.date')}
            type="date"
            value={form.voucherDate}
            onChange={(e) => setForm({ ...form, voucherDate: e.target.value })}
          />
          <div className="sm:col-span-2">
            <SelectInput
              label={t('voucher.linkedOrder')}
              includeBlank={t('voucher.noOrder')}
              value={form.orderId}
              onChange={(e) => onPickOrder(e.target.value)}
              options={orderOptions}
            />
            {form.orderId && (
              <button
                type="button"
                className="mt-1 text-xs font-medium text-brand-600"
                onClick={() => fillFromOrder(form.orderId)}
              >
                {t('voucher.fillFromOrder')}
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="label mb-0">{t('voucher.product')}</span>
            <button
              type="button"
              className="text-sm font-medium text-brand-600"
              onClick={() => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }))}
            >
              {t('voucher.addProduct')}
            </button>
          </div>
          <div className="space-y-2">
            {form.items.map((it, idx) => (
              <div key={idx} className="rounded-lg border border-edge bg-panel2 p-2.5">
                <div className="grid grid-cols-12 items-end gap-2">
                  <Labeled label={t('voucher.product')} className="col-span-12 sm:col-span-5">
                    <input
                      className="input"
                      list="product-suggestions"
                      value={it.productName}
                      onChange={(e) => onNameChange(idx, e.target.value)}
                    />
                  </Labeled>
                  <Labeled label={t('voucher.color')} className="col-span-6 sm:col-span-3">
                    <input
                      className="input"
                      value={it.color}
                      onChange={(e) => setItem(idx, { color: e.target.value })}
                    />
                  </Labeled>
                  <Labeled label={t('voucher.size')} className="col-span-5 sm:col-span-3">
                    <input
                      className="input"
                      value={it.size}
                      onChange={(e) => setItem(idx, { size: e.target.value })}
                    />
                  </Labeled>
                  <button
                    type="button"
                    className="col-span-1 pb-2 text-ink2 hover:text-rose-600"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        items: f.items.length > 1 ? f.items.filter((_, i) => i !== idx) : f.items,
                      }))
                    }
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-12 items-end gap-2">
                  <Labeled label={t('voucher.qty')} className="col-span-4 sm:col-span-3">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="input"
                      value={it.quantity}
                      onChange={(e) => setItem(idx, { quantity: e.target.value })}
                      onBlur={(e) =>
                        setItem(idx, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })
                      }
                    />
                  </Labeled>
                  <Labeled label={t('voucher.unitPrice')} className="col-span-8 sm:col-span-4">
                    <input
                      type="number"
                      min="0"
                      className="input"
                      value={it.unitPrice}
                      onChange={(e) => setItem(idx, { unitPrice: e.target.value })}
                    />
                  </Labeled>
                  <div className="col-span-12 pb-2 text-right text-sm sm:col-span-5">
                    <span className="mr-2 text-xs text-ink2">{t('voucher.amount')}</span>
                    <span className="font-semibold text-ink">{money(lineAmount(it))}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ml-auto max-w-xs space-y-2 border-t border-edge pt-3 text-sm">
          <div className="flex justify-between text-ink2">
            <span>{t('voucher.subtotal')}</span>
            <span className="font-medium text-ink">{money(subtotal)}</span>
          </div>
          <label className="flex items-center justify-between gap-3 text-ink2">
            <span>{t('voucher.discount')}</span>
            <input
              type="number"
              min="0"
              className="input w-36 text-right"
              value={form.discountAmount}
              onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
            />
          </label>
          <div className="flex justify-between border-t border-edge pt-2 text-base font-bold text-ink">
            <span>{t('voucher.total')}</span>
            <span className={total < 0 ? 'text-rose-600' : ''}>{money(total)}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
