import { useMemo } from 'react';
import { computeItem, presetWeight } from '../../lib/pricing/calc.js';
import { usePricingState } from '../../lib/pricing/pricingStore.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { fmtMMK, fmtPct } from '../../lib/pricing/format.js';
import { Section, IconButton } from './ui.jsx';

function newRow(a, category) {
  return {
    id: 'r' + Math.random().toString(36).slice(2, 9),
    item: '',
    category,
    qty: 1,
    buyPriceTHB: 200,
    weightKg: NaN,
    cargoRate: a.cargoRate,
    fx: a.fx,
    thLocalDelivery: 10,
    paymentFee: 0,
    packagingPlusOther: a.packaging,
    riskPct: a.riskPct,
    minProfit: a.minProfit,
    roundTo: a.roundTo,
    marketPriceMMK: NaN,
  };
}

const NUMERIC_COLS = [
  { key: 'qty', k: 'pricing.bc.qty', step: 1 },
  { key: 'buyPriceTHB', k: 'pricing.bc.buy', step: 10 },
  { key: 'weightKg', k: 'pricing.bc.weight', step: 0.05 },
  { key: 'cargoRate', k: 'pricing.bc.cargo', step: 10 },
  { key: 'fx', k: 'pricing.bc.fx', step: 1 },
  { key: 'thLocalDelivery', k: 'pricing.bc.delivery', step: 1 },
  { key: 'paymentFee', k: 'pricing.bc.payFee', step: 1 },
  { key: 'packagingPlusOther', k: 'pricing.bc.pkg', step: 50 },
  { key: 'riskPct', k: 'pricing.bc.risk', step: 0.5, pct: true },
  { key: 'minProfit', k: 'pricing.bc.minProfit', step: 500 },
  { key: 'roundTo', k: 'pricing.bc.round', step: 100 },
  { key: 'marketPriceMMK', k: 'pricing.bc.market', step: 500 },
];

export default function BatchCalculator({ assumptions, tiers, presets }) {
  const { t } = useI18n();
  const firstCat = presets[0]?.category ?? 'T-shirt';
  const [rows, setRows] = usePricingState('batchRows', [
    newRow(assumptions, firstCat),
    newRow(assumptions, firstCat),
    newRow(assumptions, firstCat),
  ]);

  const update = (id, patch) => setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const computed = useMemo(
    () =>
      rows.map((r) => {
        const weight = Number.isNaN(r.weightKg) ? presetWeight(r.category, presets) : r.weightKg;
        const res = computeItem(
          {
            buyPriceTHB: r.buyPriceTHB,
            weightKg: weight,
            marketPriceMMK: Number.isNaN(r.marketPriceMMK) ? null : r.marketPriceMMK,
            overrides: {
              cargoRate: r.cargoRate,
              fx: r.fx,
              thLocalDelivery: r.thLocalDelivery,
              paymentFee: r.paymentFee,
              packaging: r.packagingPlusOther,
              otherCost: 0,
              riskPct: r.riskPct,
              minProfit: r.minProfit,
              roundTo: r.roundTo,
            },
          },
          assumptions,
          tiers,
        );
        return { r, weight, res };
      }),
    [rows, presets, assumptions, tiers],
  );

  const totals = computed.reduce(
    (acc, { r, res }) => {
      const q = Number.isFinite(r.qty) ? r.qty : 0;
      acc.qty += q;
      acc.landed += res.trueLandedCostMMK * q;
      acc.normal += res.rows.NORMAL.sellingPrice * q;
      acc.profit += res.rows.NORMAL.profit * q;
      return acc;
    },
    { qty: 0, landed: 0, normal: 0, profit: 0 },
  );

  const categories = [...new Set(presets.map((p) => p.category))];

  return (
    <Section
      title={t('pricing.batch.title')}
      right={
        <div className="flex gap-2">
          <button className="btn-secondary py-1.5" onClick={() => setRows((p) => [...p, newRow(assumptions, firstCat)])}>
            {t('pricing.batch.addItem')}
          </button>
          <button
            className="btn-secondary py-1.5"
            onClick={() => {
              if (confirm(t('pricing.batch.confirmClear'))) setRows([newRow(assumptions, firstCat)]);
            }}
          >
            {t('pricing.batch.clear')}
          </button>
        </div>
      }
    >
      <p className="mb-3 text-xs text-ink2">{t('pricing.batch.note')}</p>

      <div className="overflow-x-auto rounded-lg border border-edge">
        <table className="w-full text-left text-xs">
          <thead className="bg-panel2 text-[11px] uppercase tracking-wide text-ink2">
            <tr>
              <th className="sticky left-0 z-10 bg-panel2 px-2 py-2">{t('pricing.bc.item')}</th>
              <th className="px-2 py-2">{t('pricing.bc.category')}</th>
              {NUMERIC_COLS.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-2 py-2">
                  {t(c.k)}
                </th>
              ))}
              <th className="px-2 py-2">{t('pricing.bc.landed')}</th>
              <th className="px-2 py-2">{t('pricing.bc.markup')}</th>
              <th className="px-2 py-2">LOW</th>
              <th className="px-2 py-2">NORMAL</th>
              <th className="px-2 py-2">PREMIUM</th>
              <th className="px-2 py-2">{t('pricing.bc.profit')}</th>
              <th className="px-2 py-2">{t('pricing.bc.margin')}</th>
              <th className="px-2 py-2">{t('pricing.bc.vsMkt')}</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {computed.map(({ r, res }) => (
              <tr key={r.id}>
                <td className="sticky left-0 z-10 bg-panel px-2 py-1.5">
                  <input
                    className="input-tight"
                    value={r.item}
                    placeholder={t('pricing.bc.item')}
                    onChange={(e) => update(r.id, { item: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    className="input-tight"
                    value={r.category}
                    onChange={(e) => update(r.id, { category: e.target.value })}
                  >
                    {[...new Set([...categories, r.category])].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                {NUMERIC_COLS.map((c) => {
                  const raw = r[c.key];
                  const shown = c.pct
                    ? Number.isFinite(raw)
                      ? +(raw * 100).toFixed(4)
                      : ''
                    : Number.isFinite(raw)
                      ? raw
                      : '';
                  return (
                    <td key={c.key} className="px-2 py-1.5">
                      <input
                        className="input-tight font-mono"
                        type="number"
                        step={c.step}
                        placeholder={c.key === 'weightKg' ? t('pricing.f.auto') : undefined}
                        value={shown}
                        onChange={(e) => {
                          const v = e.target.value === '' ? NaN : Number(e.target.value);
                          update(r.id, { [c.key]: c.pct && Number.isFinite(v) ? v / 100 : v });
                        }}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 font-mono">{fmtMMK(res.trueLandedCostMMK)}</td>
                <td className="px-2 py-1.5 font-mono">{fmtPct(res.baseMarkup)}</td>
                <td className="px-2 py-1.5 font-mono">{fmtMMK(res.rows.LOW.sellingPrice)}</td>
                <td className="px-2 py-1.5 font-mono font-bold">{fmtMMK(res.rows.NORMAL.sellingPrice)}</td>
                <td className="px-2 py-1.5 font-mono">{fmtMMK(res.rows.PREMIUM.sellingPrice)}</td>
                <td className="px-2 py-1.5 font-mono">{fmtMMK(res.rows.NORMAL.profit)}</td>
                <td className="px-2 py-1.5 font-mono">{fmtPct(res.rows.NORMAL.grossMargin)}</td>
                <td
                  className={`px-2 py-1.5 font-mono ${
                    res.marketComparison.verdict === 'Above Market'
                      ? 'text-rose-600'
                      : res.marketComparison.verdict
                        ? 'text-emerald-600'
                        : 'text-ink2'
                  }`}
                >
                  {res.marketComparison.verdict
                    ? res.marketComparison.verdict === 'Above Market'
                      ? t('pricing.bc.above')
                      : t('pricing.bc.atBelow')
                    : '—'}
                </td>
                <td className="px-1">
                  <IconButton title={t('common.delete')} onClick={() => setRows((p) => p.filter((x) => x.id !== r.id))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [t('pricing.batch.totalItems'), totals.qty],
          [t('pricing.batch.totalLanded'), fmtMMK(totals.landed)],
          [t('pricing.batch.totalRevenue'), fmtMMK(totals.normal)],
          [t('pricing.batch.totalProfit'), fmtMMK(totals.profit)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-edge bg-panel2 p-3">
            <span className="block text-xs text-ink2">{label}</span>
            <strong className="text-base text-ink">{value}</strong>
          </div>
        ))}
      </div>
    </Section>
  );
}
