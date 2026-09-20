import { useEffect, useRef, useState } from 'react';
import { api, apiErrorMessage } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { TextInput, SelectInput } from '../../components/ui/Field.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { resizeImage } from '../../lib/imageResize.js';
import { PRODUCT_STATUSES } from '../../lib/constants.js';

export function ProductForm({ open, onClose, product, categories = [], onSaved }) {
  const toast = useToast();
  const { t } = useI18n();
  const editing = !!product;
  const fileRef = useRef();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: product?.name || '',
      category: product?.category || '',
      price: product?.price ?? '',
      stockQty: product?.stockQty ?? 0,
      status: product?.status || 'active',
      imageUrl: product?.imageUrl || '',
    });
  }, [open, product]);

  if (!open || !form) return null;

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setForm((f) => ({ ...f, imageUrl: '' }));
      const imageUrl = await resizeImage(file);
      setForm((f) => ({ ...f, imageUrl }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) return toast.error(t('products.errName'));
    if (form.price === '' || Number(form.price) < 0) return toast.error(t('products.errPrice'));
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      price: Number(form.price),
      stockQty: Math.max(0, Math.floor(Number(form.stockQty) || 0)),
      status: form.status,
      imageUrl: form.imageUrl || null,
    };
    setSaving(true);
    try {
      if (editing) await api.put(`/products/${product.productId}`, payload);
      else await api.post('/products', payload);
      toast.success(editing ? t('toast.productUpdated') : t('toast.productCreated'));
      onSaved?.();
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
      title={editing ? t('products.editTitle') : t('products.newTitle')}
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
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <TextInput
          label={t('products.name')}
          className="sm:col-span-2"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div>
          <TextInput
            label={t('products.category')}
            list="product-categories"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <datalist id="product-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <SelectInput
          label={t('products.status')}
          includeBlank={false}
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          options={PRODUCT_STATUSES.map((s) => ({ value: s, label: t(`productStatus.${s}`) }))}
        />
        <TextInput
          label={t('products.price')}
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <TextInput
          label={t('products.stock')}
          type="number"
          min="0"
          step="1"
          value={form.stockQty}
          onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
        />
        <div className="sm:col-span-2">
          <span className="label">{t('products.image')}</span>
          <div className="flex items-center gap-3">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-edge bg-panel2 text-2xl">
              {form.imageUrl ? <img src={form.imageUrl} alt="" className="h-full w-full object-cover" /> : '🛍️'}
            </div>
            <div className="flex flex-col items-start gap-1.5">
              <button type="button" className="btn-secondary py-1.5" onClick={() => fileRef.current?.click()}>
                {t('products.chooseImage')}
              </button>
              {form.imageUrl && (
                <button
                  type="button"
                  className="text-xs text-rose-600"
                  onClick={() => setForm({ ...form, imageUrl: '' })}
                >
                  {t('products.removeImage')}
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
