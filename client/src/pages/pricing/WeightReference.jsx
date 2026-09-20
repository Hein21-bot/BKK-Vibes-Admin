import { DEFAULT_WEIGHT_PRESETS } from '../../lib/pricing/calc.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { fmtTHB } from '../../lib/pricing/format.js';
import { Section, IconButton } from './ui.jsx';

export default function WeightReference({ presets, setPresets, cargoRate }) {
  const { t } = useI18n();
  const update = (i, patch) =>
    setPresets((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  return (
    <Section
      title={t('pricing.wr.title')}
      right={
        <div className="flex gap-2">
          <button
            className="btn-secondary py-1.5"
            onClick={() => setPresets((p) => [...p, { category: 'New Category', weightKg: 0.3 }])}
          >
            {t('pricing.wr.addRow')}
          </button>
          <button className="btn-secondary py-1.5" onClick={() => setPresets(DEFAULT_WEIGHT_PRESETS)}>
            {t('pricing.wr.resetDefaults')}
          </button>
        </div>
      }
    >
      <p className="mb-3 text-xs text-ink2">{t('pricing.wr.note')}</p>
      <div className="overflow-x-auto rounded-lg border border-edge">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel2 text-xs uppercase tracking-wide text-ink2">
            <tr>
              <th className="px-3 py-2">{t('pricing.wr.category')}</th>
              <th className="px-3 py-2">{t('pricing.wr.presetWeight')}</th>
              <th className="px-3 py-2">{t('pricing.wr.cargoAt', { rate: cargoRate })}</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {presets.map((row, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5">
                  <input
                    className="input-tight"
                    value={row.category}
                    onChange={(e) => update(i, { category: e.target.value })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    className="input-tight font-mono"
                    type="number"
                    step={0.05}
                    min={0}
                    value={Number.isFinite(row.weightKg) ? row.weightKg : ''}
                    onChange={(e) =>
                      update(i, { weightKg: e.target.value === '' ? NaN : Number(e.target.value) })
                    }
                  />
                </td>
                <td className="px-3 py-1.5 font-mono text-ink2">{fmtTHB(row.weightKg * cargoRate)}</td>
                <td className="px-1">
                  <IconButton
                    title={t('common.delete')}
                    onClick={() => setPresets((p) => p.filter((_, idx) => idx !== i))}
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
