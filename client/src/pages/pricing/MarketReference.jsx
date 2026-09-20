import {
  DEFAULT_MARKET_REF,
  MARKET_REF_CARGO,
  MARKET_REF_FX,
  marketRefLandedCost,
  marketRefMarkup,
} from '../../lib/pricing/marketReference.js';
import { usePricingState } from '../../lib/pricing/pricingStore.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { fmtMMK, fmtPct } from '../../lib/pricing/format.js';
import { Section, IconButton } from './ui.jsx';

export default function MarketReference() {
  const { t } = useI18n();
  const [items, setItems] = usePricingState('marketRef', DEFAULT_MARKET_REF);

  const update = (i, patch) =>
    setItems((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const num = (v) => (v === '' ? NaN : Number(v));

  return (
    <Section
      title={t('pricing.mr.title')}
      right={
        <div className="flex gap-2">
          <button
            className="btn-secondary py-1.5"
            onClick={() =>
              setItems((p) => [
                ...p,
                { item: 'New item', buyPriceTHB: 0, estWeightKg: 0.3, resellerPriceMMK: 0 },
              ])
            }
          >
            {t('pricing.mr.addItem')}
          </button>
          <button className="btn-secondary py-1.5" onClick={() => setItems(DEFAULT_MARKET_REF)}>
            {t('pricing.wr.resetDefaults')}
          </button>
        </div>
      }
    >
      <p className="mb-3 text-xs text-ink2">
        {t('pricing.mr.note', { cargo: MARKET_REF_CARGO, fx: MARKET_REF_FX })}
      </p>
      <div className="overflow-x-auto rounded-lg border border-edge">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel2 text-xs uppercase tracking-wide text-ink2">
            <tr>
              <th className="px-3 py-2">{t('pricing.mr.item')}</th>
              <th className="px-3 py-2">{t('pricing.mr.buy')}</th>
              <th className="px-3 py-2">{t('pricing.mr.estWeight')}</th>
              <th className="px-3 py-2">{t('pricing.mr.estLanded')}</th>
              <th className="px-3 py-2">{t('pricing.mr.resellerPrice')}</th>
              <th className="px-3 py-2">{t('pricing.mr.approxMarkup')}</th>
              <th className="px-3 py-2">{t('pricing.mr.notes')}</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {items.map((row, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5">
                  <input className="input-tight" value={row.item} onChange={(e) => update(i, { item: e.target.value })} />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    className="input-tight font-mono"
                    type="number"
                    value={Number.isFinite(row.buyPriceTHB) ? row.buyPriceTHB : ''}
                    onChange={(e) => update(i, { buyPriceTHB: num(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    className="input-tight font-mono"
                    type="number"
                    step={0.05}
                    value={Number.isFinite(row.estWeightKg) ? row.estWeightKg : ''}
                    onChange={(e) => update(i, { estWeightKg: num(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-1.5 font-mono text-ink2">
                  {fmtMMK(marketRefLandedCost(row.buyPriceTHB, row.estWeightKg))}
                </td>
                <td className="px-3 py-1.5">
                  <input
                    className="input-tight font-mono"
                    type="number"
                    step={500}
                    value={Number.isFinite(row.resellerPriceMMK) ? row.resellerPriceMMK : ''}
                    onChange={(e) => update(i, { resellerPriceMMK: num(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-1.5 font-mono">{fmtPct(marketRefMarkup(row))}</td>
                <td className="px-3 py-1.5">
                  <input
                    className="input-tight"
                    value={row.notes ?? ''}
                    onChange={(e) => update(i, { notes: e.target.value })}
                  />
                </td>
                <td className="px-1">
                  <IconButton
                    title={t('common.delete')}
                    onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
