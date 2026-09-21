import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { api, apiErrorMessage } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Table, THead, TBody, Th, Td, EmptyRow } from '../../components/ui/Table.jsx';
import { NumField } from '../pricing/ui.jsx';
import { money, baht } from '../../lib/format.js';

const pct = (n) => (n == null ? '—' : `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`);
const profitColor = (n) => (n > 0 ? 'text-emerald-600 dark:text-emerald-400' : n < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-ink');

function Stat({ label, value, tone }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink2">{label}</p>
      <p className={clsx('mt-1 text-xl font-bold', tone || 'text-ink')}>{value}</p>
    </div>
  );
}

export default function BatchProfit() {
  const { t } = useI18n();
  const { data, loading, error, reload } = useApi('/cargo/profit', null, []);
  const [editRow, setEditRow] = useState(null);

  if (loading && !data) return <PageLoader />;
  if (error) return <p className="text-rose-600">{error}</p>;

  const { rows, totals, defaultFx } = data;

  return (
    <div>
      <PageHeader title={t('profit.title')} subtitle={t('profit.subtitle')} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t('profit.revenue')} value={money(totals.revenue)} />
        <Stat label={t('profit.totalCost')} value={money(totals.costMmk)} />
        <Stat label={t('profit.profit')} value={money(totals.profit)} tone={profitColor(totals.profit)} />
        <Stat label={t('profit.margin')} value={pct(totals.marginPct)} tone={profitColor(totals.profit)} />
      </div>

      {totals.missingCount > 0 && (
        <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-ink">
          ⚠️ {t('profit.missingWarn', { n: totals.missingCount })}
        </p>
      )}

      <div className="card">
        <Table>
          <THead>
            <tr>
              <Th>{t('col.batch')}</Th>
              <Th>{t('col.status')}</Th>
              <Th>{t('col.orders')}</Th>
              <Th>{t('profit.revenue')}</Th>
              <Th>{t('profit.productCost')}</Th>
              <Th>{t('profit.cargoFee')}</Th>
              <Th>{t('profit.fx')}</Th>
              <Th>{t('profit.totalCost')}</Th>
              <Th>{t('profit.profit')}</Th>
              <Th>{t('profit.margin')}</Th>
              <Th />
            </tr>
          </THead>
          <TBody>
            {rows.length === 0 && <EmptyRow colSpan={11} />}
            {rows.map((r) => (
              <tr key={r.cargoId} className="hover:bg-panel2">
                <Td>
                  <Link to={`/cargo/${r.cargoId}`} className="font-semibold text-brand-600">
                    {r.cargoBatchCode}
                  </Link>
                </Td>
                <Td>
                  <StatusBadge value={r.status} kind="cargo" />
                </Td>
                <Td>
                  {r.orderCount}
                  {r.unpaidCount > 0 && (
                    <span className="ml-1 text-xs text-amber-600" title={t('profit.unpaidHint', { n: r.unpaidCount })}>
                      ({t('profit.unpaid', { n: r.unpaidCount })})
                    </span>
                  )}
                </Td>
                <Td className="whitespace-nowrap">{money(r.revenue)}</Td>
                <Td className="whitespace-nowrap">
                  {r.costMissing ? <span className="text-amber-600">⚠️ {t('profit.enterCost')}</span> : baht(r.productCostThb)}
                </Td>
                <Td className="whitespace-nowrap">{baht(r.cargoFeeThb)}</Td>
                <Td className="whitespace-nowrap text-ink2">
                  {r.fxUsed.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                  {r.fxRate == null && <span className="ml-1 text-xs">({t('profit.default')})</span>}
                </Td>
                <Td className="whitespace-nowrap">{money(r.costMmk)}</Td>
                <Td className={clsx('whitespace-nowrap font-bold', profitColor(r.profit))}>{money(r.profit)}</Td>
                <Td className={clsx('whitespace-nowrap', profitColor(r.profit))}>{pct(r.marginPct)}</Td>
                <Td>
                  <button className="text-sm text-brand-600" onClick={() => setEditRow(r)}>
                    {t('common.edit')}
                  </button>
                </Td>
              </tr>
            ))}
          </TBody>
        </Table>
      </div>

      <p className="mt-3 text-xs text-ink2">{t('profit.formula')}</p>

      <CostModal
        row={editRow}
        defaultFx={defaultFx}
        onClose={() => setEditRow(null)}
        onSaved={() => {
          setEditRow(null);
          reload();
        }}
      />
    </div>
  );
}

function CostModal({ row, defaultFx, onClose, onSaved }) {
  const { t } = useI18n();
  const toast = useToast();
  const [product, setProduct] = useState(NaN);
  const [fx, setFx] = useState(NaN);
  const [saving, setSaving] = useState(false);
  const [seen, setSeen] = useState(null);

  // Load the row's values each time the modal opens for a (different) batch.
  if (row && seen !== row.cargoId) {
    setSeen(row.cargoId);
    setProduct(row.productCostThb || NaN);
    setFx(row.fxRate ?? NaN);
  }
  if (!row) return null;

  const productThb = Number.isFinite(product) ? product : 0;
  const fxUsed = Number.isFinite(fx) && fx > 0 ? fx : defaultFx;
  const costMmk = (productThb + row.cargoFeeThb) * fxUsed;
  const profit = row.revenue - costMmk;

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/cargo/${row.cargoId}/costs`, {
        productCostThb: productThb,
        fxRate: Number.isFinite(fx) && fx > 0 ? fx : null,
      });
      toast.success(t('profit.saved'));
      setSeen(null);
      onSaved();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    setSeen(null);
    onClose();
  };

  return (
    <Modal
      open
      onClose={close}
      title={t('profit.editTitle', { code: row.cargoBatchCode })}
      footer={
        <>
          <button className="btn-secondary" onClick={close}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <NumField label={t('profit.productCostField')} unit="THB" step="any" min={0} value={product} onChange={setProduct} hint={t('profit.productCostHint')} />
        <NumField
          label={t('profit.fxField')}
          step="any"
          min={0}
          value={fx}
          onChange={setFx}
          placeholder={String(defaultFx)}
          hint={t('profit.fxHint', { fx: defaultFx })}
        />
        <div className="space-y-1 rounded-lg bg-panel2 p-3 text-sm text-ink">
          <p>
            {t('profit.revenue')}: <span className="font-semibold">{money(row.revenue)}</span>
          </p>
          <p>
            {t('profit.totalCost')}: ({baht(productThb)} + {baht(row.cargoFeeThb)}) × {fxUsed} ={' '}
            <span className="font-semibold">{money(costMmk)}</span>
          </p>
          <p>
            {t('profit.profit')}: <span className={clsx('text-base font-bold', profitColor(profit))}>{money(profit)}</span>
          </p>
        </div>
      </div>
    </Modal>
  );
}
