import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal.jsx';
import { TextInput, TextArea } from '../../components/ui/Field.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { DEFAULT_LOGO } from '../../hooks/useShopProfile.js';

// The logo is shown in a circle, so centre-crop it to a square and downscale it
// (keeps it small enough for localStorage).
function fileToLogo(file, size = 300) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const out = Math.min(size, side);
      const canvas = document.createElement('canvas');
      canvas.width = out;
      canvas.height = out;
      canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, out, out);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Invalid image'));
    };
    img.src = url;
  });
}

export function ShopProfileModal({ open, onClose, profile, onSave }) {
  const toast = useToast();
  const { t } = useI18n();
  const fileRef = useRef();
  const [form, setForm] = useState(profile);

  useEffect(() => {
    if (open) setForm(profile);
  }, [open, profile]);

  if (!open) return null;

  const pickLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setForm((f) => ({ ...f, logo: '' }));
      const logo = await fileToLogo(file);
      setForm((f) => ({ ...f, logo }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const submit = (e) => {
    e?.preventDefault();
    if (onSave(form)) {
      toast.success(t('shop.saved'));
      onClose();
    } else {
      toast.error(t('shop.saveFailed'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('shop.details')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={submit}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs text-ink2">{t('shop.detailsHint')}</p>

        <div>
          <span className="label">{t('shop.logo')}</span>
          <div className="flex items-center gap-3">
            <img
              src={form.logo || DEFAULT_LOGO}
              alt=""
              className="h-24 w-24 shrink-0 rounded-full border border-edge object-cover"
            />
            <div className="flex flex-col gap-1.5">
              <button type="button" className="btn-secondary py-1.5" onClick={() => fileRef.current?.click()}>
                {t('shop.chooseLogo')}
              </button>
              {form.logo ? (
                <button
                  type="button"
                  className="text-left text-xs text-brand-600"
                  onClick={() => setForm({ ...form, logo: '' })}
                >
                  {t('shop.removeLogo')}
                </button>
              ) : (
                <span className="text-xs text-ink2">{t('shop.usingDefault')}</span>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickLogo} />
          </div>
        </div>

        <TextInput
          label={t('shop.name')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <TextArea
          label={t('shop.address')}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label={t('shop.phone')}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <TextInput
            label={t('shop.email')}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
}
