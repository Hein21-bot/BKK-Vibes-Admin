import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { TextInput, TextArea } from '../../components/ui/Field.jsx';
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

// `prefill` = { voucherId, customerName, note, items } — used when creating an order from a voucher.
export function OrderForm({ open, onClose, order, prefill, onSaved }) {
  const toast = useToast();
  const { t } = useI18n();
  const editing = !!order;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!open) return;
    const src = order || prefill;
    setForm({
      customerName: src?.customerName || '',
      customerPhone: order?.customerPhone || '',
      customerAddress: order?.customerAddress || '',
      paid: order?.paid || false,
      note: src?.note || '',
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
    // `prefill` is only read when the form opens (so typing is never reset).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order]);

  const products = useProductSuggestions(open);

  if (!open || !form) return null;

  const setItem = (idx, patch) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));

  // Typing a known product name fills its price (only when the price is still empty).
  const onNameChange = (idx, name) => {
    const match = findProduct(products, name);
    const empty = form.items[idx].unitPrice === '' || form.items[idx].unitPrice == null;
    setItem(idx, match && empty ? { productName: name, unitPrice: match.price } : { productName: name });
  };

  const total = form.items.reduce(
    (s, it) => s + Number(it.unitPrice || 0) * Number(it.quantity || 0),
    0,
  );

  const submit = async (e) => {
    e.preventDefault();
    const items = form.items
      .map((it) => ({
        productName: it.productName.trim(),
        color: it.color.trim(),
        size: it.size.trim(),
        quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
        unitPrice: Number(it.unitPrice) || 0,
      }))
      .filter((it) => it.productName);
    if (!items.length) return toast.error(t('orderForm.errAddProduct'));
    if (!form.customerName.trim()) return toast.error(t('orderForm.errCustomer'));

    const payload = {
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone || null,
      customerAddress: form.customerAddress || null,
      paid: form.paid,
      note: form.note || null,
      items,
      ...(!editing && prefill?.voucherId ? { voucherId: prefill.voucherId } : {}),
    };
    setSaving(true);
    try {
      const { data } = editing
        ? await api.put(`/orders/${order.orderId}`, payload)
        : await api.post('/orders', payload);
      toast.success(editing ? t('toast.orderUpdated') : t('toast.orderCreated'));
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
      title={editing ? t('orderForm.editOrder', { id: order.orderId }) : t('orderForm.newOrder')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving
              ? t('common.saving')
              : editing
                ? t('orderForm.saveChanges')
                : t('orderForm.createOrder')}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <ProductDatalist id="product-suggestions" products={products} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label={t('orderForm.customerName')}
            required
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          />
          <TextInput
            label={t('orderForm.phone')}
            value={form.customerPhone}
            onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
          />
          <TextArea
            label={t('orderForm.address')}
            className="sm:col-span-2"
            value={form.customerAddress}
            onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="label mb-0">{t('orderForm.products')}</span>
            <button
              type="button"
              className="text-sm font-medium text-brand-600"
              onClick={() => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }))}
            >
              {t('orderForm.addProduct')}
            </button>
          </div>
          <div className="space-y-2">
            {form.items.map((it, idx) => (
              <div key={idx} className="rounded-lg border border-edge bg-panel2 p-2.5">
                <div className="grid grid-cols-12 items-end gap-2">
                  <Labeled label={t('orderForm.productName')} className="col-span-12 sm:col-span-5">
                    <input
                      className="input"
                      list="product-suggestions"
                      value={it.productName}
                      onChange={(e) => onNameChange(idx, e.target.value)}
                    />
                  </Labeled>
                  <Labeled label={t('orderForm.color')} className="col-span-6 sm:col-span-3">
                    <input
                      className="input"
                      value={it.color}
                      onChange={(e) => setItem(idx, { color: e.target.value })}
                    />
                  </Labeled>
                  <Labeled label={t('orderForm.size')} className="col-span-5 sm:col-span-3">
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
                  <Labeled label={t('orderForm.qty')} className="col-span-4 sm:col-span-3">
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
                  <Labeled label={t('orderForm.price')} className="col-span-8 sm:col-span-4">
                    <input
                      type="number"
                      min="0"
                      className="input"
                      value={it.unitPrice}
                      onChange={(e) => setItem(idx, { unitPrice: e.target.value })}
                    />
                  </Labeled>
                  <div className="col-span-12 pb-2 text-right text-sm font-semibold text-ink sm:col-span-5">
                    {money(Number(it.unitPrice || 0) * Number(it.quantity || 0))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-sm font-semibold text-ink">
            {t('orderForm.total', { v: money(total) })}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={form.paid}
            onChange={(e) => setForm({ ...form, paid: e.target.checked })}
          />
          {t('orderForm.paymentReceived')}
        </label>

        <TextArea
          label={t('orderForm.note')}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </form>
    </Modal>
  );
}
