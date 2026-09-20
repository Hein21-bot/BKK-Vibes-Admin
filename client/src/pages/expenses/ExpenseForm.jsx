import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { TextInput, SelectInput, TextArea } from '../../components/ui/Field.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { EXPENSE_CATEGORIES } from '../../lib/constants.js';

const today = () => new Date().toISOString().slice(0, 10);

export function ExpenseForm({ open, onClose, expense, onSaved }) {
  const toast = useToast();
  const { t } = useI18n();
  const editing = !!expense;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: expense?.title || '',
      category: expense?.category || 'transportation',
      amount: expense?.amount ?? '',
      expenseDate: (expense?.expenseDate || new Date().toISOString()).slice(0, 10) || today(),
      paid: expense?.paid || false,
      note: expense?.note || '',
    });
  }, [open, expense]);

  if (!open || !form) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error(t('expenses.errTitle'));
    if (form.amount === '' || Number(form.amount) < 0) return toast.error(t('expenses.errAmount'));

    const payload = {
      title: form.title.trim(),
      category: form.category,
      amount: Number(form.amount),
      expenseDate: new Date(form.expenseDate).toISOString(),
      paid: form.paid,
      note: form.note || null,
    };
    setSaving(true);
    try {
      if (editing) await api.put(`/expenses/${expense.expenseId}`, payload);
      else await api.post('/expenses', payload);
      toast.success(editing ? t('toast.expenseUpdated') : t('toast.expenseCreated'));
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
      title={editing ? t('expenses.editTitle') : t('expenses.newTitle')}
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
          label={t('expenses.title_field')}
          className="sm:col-span-2"
          required
          placeholder={t('expenses.titlePlaceholder')}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <SelectInput
          label={t('expenses.category')}
          includeBlank={false}
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: t(`cat.${c}`) }))}
        />
        <TextInput
          label={t('expenses.amount')}
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <TextInput
          label={t('expenses.date')}
          type="date"
          value={form.expenseDate}
          onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
        />
        <label className="flex items-end gap-2 pb-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={form.paid}
            onChange={(e) => setForm({ ...form, paid: e.target.checked })}
          />
          {t('expenses.markPaid')}
        </label>
        <TextArea
          label={t('expenses.note')}
          className="sm:col-span-2"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </form>
    </Modal>
  );
}
