import { useMemo } from 'react';
import { computeItem, presetWeight } from '../../lib/pricing/calc.js';
import { usePricingState } from '../../lib/pricing/pricingStore.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { fmtMMK, fmtPct, fmtTHB } from '../../lib/pricing/format.js';
import { NumField, Section, SelectField, StatRow, TextField } from './ui.jsx';

const TIER_USE = { LOW: 'pricing.tier.lowUse', NORMAL: 'pricing.tier.normalUse', PREMIUM: 'pricing.tier.premiumUse' };

export default function PriceCalculator({ assumptions, tiers, presets }) {
  const { t } = useI18n();
  const firstCat = presets[0]?.category ?? 'T-shirt';
  // Only the fields for this one test item are kept here. Cost assumptions (cargo rate, fx, risk, …)
  // always come live from the Assumptions & Tiers tab below, so a change there is reflected here
  // immediately — there is no separate copy of them to fall out of sync.
  const initial = {
    product: 'Example: AIRism T-Shirt',
    category: firstCat,
    buyPriceTHB: 990,
    weightKg: presetWeight(firstCat, presets),
    weightAuto: true,
    marketPriceMMK: NaN,
  };

  const [s, setS] = usePricingState('priceCalc', initial);
  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));

  const effectiveWeight = s.weightAuto ? presetWeight(s.category, presets) : s.weightKg;

  const result = useMemo(
    () =>
      computeItem(
        {
          buyPriceTHB: s.buyPriceTHB,
          weightKg: effectiveWeight,
          marketPriceMMK: Number.isNaN(s.marketPriceMMK) ? null : s.marketPriceMMK,
        },
        assumptions,
        tiers,
      ),
    [s.buyPriceTHB, s.marketPriceMMK, effectiveWeight, assumptions, tiers],
  );

  const categories = [...new Set([...presets.map((p) => p.category), s.category])];
  const verdictLabel = (v) =>
    v === 'At / Below Market' ? t('pricing.verdict.atBelow') : v === 'Above Market' ? t('pricing.verdict.above') : '—';

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title={t('pricing.inputs')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={t('pricing.f.product')} value={s.product} onChange={(v) => set('product', v)} />
          <SelectField label={t('pricing.f.category')} value={s.category} options={categories} onChange={(v) => set('category', v)} />
          <NumField label={t('pricing.f.buyPrice')} unit="THB" value={s.buyPriceTHB} step={10} min={0} onChange={(v) => set('buyPriceTHB', v)} />

          <label className="block sm:col-span-2">
            <span className="label">
              {t('pricing.f.weight')} <span className="text-ink2">kg</span>
            </span>
            <div className="flex items-center gap-3">
              <input
                className="input"
                type="number"
                step={0.05}
                min={0}
                disabled={s.weightAuto}
                value={s.weightAuto ? effectiveWeight : Number.isFinite(s.weightKg) ? s.weightKg : ''}
                onChange={(e) => set('weightKg', e.target.value === '' ? NaN : Number(e.target.value))}
              />
              <label className="flex shrink-0 items-center gap-1.5 text-sm text-ink2">
                <input
                  type="checkbox"
                  checked={s.weightAuto}
                  onChange={(e) => {
                    const auto = e.target.checked;
                    setS((p) => ({
                      ...p,
                      weightAuto: auto,
                      weightKg: auto ? p.weightKg : presetWeight(p.category, presets),
                    }));
                  }}
                />
                {t('pricing.f.auto')}
              </label>
            </div>
            <span className="mt-1 block text-xs text-ink2">{t('pricing.f.weightHint')}</span>
          </label>

          <NumField
            label={t('pricing.f.marketPrice')}
            unit="MMK"
            value={s.marketPriceMMK}
            step={500}
            placeholder={t('pricing.f.marketPricePh')}
            onChange={(v) => set('marketPriceMMK', v)}
          />
        </div>
      </Section>

      <div className="lg:col-span-2">
        <Section title={t('pricing.assumptionsUsed')}>
          <p className="mb-3 text-xs text-ink2">{t('pricing.assumptionsUsedHint')}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NumField label={t('pricing.f.cargoRate')} unit="THB/kg" value={assumptions.cargoRate} disabled onChange={() => {}} />
            <NumField label={t('pricing.f.fx')} unit="MMK/THB" value={assumptions.fx} disabled onChange={() => {}} />
            <NumField label={t('pricing.f.thDelivery')} unit="THB" value={assumptions.thLocalDelivery} disabled onChange={() => {}} />
            <NumField label={t('pricing.f.payFee')} unit="THB" value={assumptions.paymentFee} disabled onChange={() => {}} />
            <NumField label={t('pricing.f.packaging')} unit="MMK" value={assumptions.packaging} disabled onChange={() => {}} />
            <NumField label={t('pricing.f.otherCost')} unit="MMK" value={assumptions.otherCost} disabled onChange={() => {}} />
            <NumField label={t('pricing.f.risk')} unit="%" value={+(assumptions.riskPct * 100).toFixed(4)} disabled onChange={() => {}} />
            <NumField label={t('pricing.f.minProfit')} unit="MMK / item" value={assumptions.minProfit} disabled onChange={() => {}} />
            <NumField label={t('pricing.f.rounding')} unit="MMK" value={assumptions.roundTo} disabled onChange={() => {}} />
          </div>
        </Section>
      </div>

      <div className="space-y-4">
        <Section title={t('pricing.calculation')}>
          <div>
            <StatRow label={t('pricing.s.cargoCost')} value={fmtTHB(result.cargoCostTHB)} />
            <StatRow label={t('pricing.s.thTotal')} value={fmtTHB(result.thTotalCostTHB)} />
            <StatRow label={t('pricing.s.baseCost')} value={fmtMMK(result.baseCostMMK)} />
            <StatRow label={t('pricing.s.subtotal')} value={fmtMMK(result.subtotalLandedMMK)} />
            <StatRow label={t('pricing.s.risk', { p: fmtPct(assumptions.riskPct) })} value={fmtMMK(result.riskAllowanceMMK)} />
            <StatRow label={t('pricing.s.trueLanded')} value={fmtMMK(result.trueLandedCostMMK)} strong />
            <StatRow label={t('pricing.s.autoMarkup')} value={fmtPct(result.baseMarkup)} />
          </div>
        </Section>

        <Section title={t('pricing.recommendedPrices')}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-edge text-xs uppercase tracking-wide text-ink2">
                <tr>
                  <th className="py-2 pr-3">{t('pricing.t.pricing')}</th>
                  <th className="px-2 py-2">{t('pricing.t.markup')}</th>
                  <th className="px-2 py-2">{t('pricing.t.sellingPrice')}</th>
                  <th className="px-2 py-2">{t('pricing.t.profit')}</th>
                  <th className="px-2 py-2">{t('pricing.t.margin')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {['LOW', 'NORMAL', 'PREMIUM'].map((k) => {
                  const r = result.rows[k];
                  return (
                    <tr key={k} className={k === 'NORMAL' ? 'bg-brand-50/60 dark:bg-brand-500/10' : ''}>
                      <td className="py-2 pr-3">
                        <strong>{k}</strong>
                        <div className="text-xs text-ink2">{t(TIER_USE[k])}</div>
                      </td>
                      <td className="px-2 py-2 font-mono">{fmtPct(r.markup)}</td>
                      <td className="px-2 py-2 font-mono font-bold">{fmtMMK(r.sellingPrice)}</td>
                      <td className="px-2 py-2 font-mono">{fmtMMK(r.profit)}</td>
                      <td className="px-2 py-2 font-mono">{fmtPct(r.grossMargin)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {result.marketComparison.marketPriceMMK != null && (
          <Section title={t('pricing.marketComparison')}>
            <div>
              <StatRow label={t('pricing.mc.marketPrice')} value={fmtMMK(result.marketComparison.marketPriceMMK)} />
              <StatRow label={t('pricing.mc.myNormal')} value={fmtMMK(result.rows.NORMAL.sellingPrice)} />
              <StatRow label={t('pricing.mc.difference')} value={fmtMMK(result.marketComparison.normalVsMarketMMK ?? NaN)} />
              <StatRow label={t('pricing.mc.verdict')} value={verdictLabel(result.marketComparison.verdict)} strong />
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
