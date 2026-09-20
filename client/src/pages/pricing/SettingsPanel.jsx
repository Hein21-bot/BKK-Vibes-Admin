import { DEFAULT_ASSUMPTIONS, DEFAULT_TIERS } from '../../lib/pricing/calc.js';
import { fmtMMK } from '../../lib/pricing/format.js';
import { usePersistentState } from '../../hooks/usePersistentState.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { NumField, PctField, Section, IconButton } from './ui.jsx';

export default function SettingsPanel({ assumptions, setAssumptions, tiers, setTiers }) {
  const { t } = useI18n();
  // Locked by default — this tab holds sensitive pricing assumptions.
  const [locked, setLocked] = usePersistentState('settingsLocked', true);
  const ro = locked;

  const setA = (k, v) => setAssumptions((p) => ({ ...p, [k]: v }));
  const updateTier = (i, patch) => setTiers((p) => p.map((tr, idx) => (idx === i ? { ...tr, ...patch } : tr)));

  return (
    <div className="space-y-4">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
          locked
            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
        }`}
      >
        <span>{locked ? t('pricing.sp.lockedMsg') : t('pricing.sp.unlockedMsg')}</span>
        <button className={locked ? 'btn-primary py-1.5' : 'btn-secondary py-1.5'} onClick={() => setLocked((v) => !v)}>
          {locked ? t('pricing.sp.unlock') : t('pricing.sp.lock')}
        </button>
      </div>

      <Section
        title={t('pricing.sp.defaultsTitle')}
        right={
          !ro && (
            <button className="btn-secondary py-1.5" onClick={() => setAssumptions(DEFAULT_ASSUMPTIONS)}>
              {t('pricing.sp.resetDefaults')}
            </button>
          )
        }
      >
        <p className="mb-3 text-xs text-ink2">{t('pricing.sp.defaultsNote')}</p>
        <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3" disabled={ro}>
          <NumField label={t('pricing.f.cargoRate')} unit="THB/kg" step={10} value={assumptions.cargoRate} onChange={(v) => setA('cargoRate', v)} disabled={ro} />
          <NumField label={t('pricing.f.fx')} unit="MMK/THB" step={1} value={assumptions.fx} onChange={(v) => setA('fx', v)} disabled={ro} />
          <NumField label={t('pricing.f.thDelivery')} unit="THB" value={assumptions.thLocalDelivery} onChange={(v) => setA('thLocalDelivery', v)} disabled={ro} />
          <NumField label={t('pricing.f.payFee')} unit="THB" value={assumptions.paymentFee} onChange={(v) => setA('paymentFee', v)} disabled={ro} />
          <NumField label={t('pricing.f.packaging')} unit="MMK" step={50} value={assumptions.packaging} onChange={(v) => setA('packaging', v)} disabled={ro} />
          <NumField label={t('pricing.f.otherCost')} unit="MMK" step={50} value={assumptions.otherCost} onChange={(v) => setA('otherCost', v)} disabled={ro} />
          <PctField label={t('pricing.f.risk')} value={assumptions.riskPct} onChange={(v) => setA('riskPct', v)} disabled={ro} />
          <NumField label={t('pricing.f.minProfit')} unit="MMK / item" step={500} value={assumptions.minProfit} onChange={(v) => setA('minProfit', v)} disabled={ro} />
          <NumField label={t('pricing.f.rounding')} unit="MMK" step={100} value={assumptions.roundTo} onChange={(v) => setA('roundTo', v)} disabled={ro} />
          <PctField label={t('pricing.sp.lowDelta')} value={assumptions.lowDelta} onChange={(v) => setA('lowDelta', v)} hint={t('pricing.sp.lowHint')} disabled={ro} />
          <PctField label={t('pricing.sp.lowFloor')} value={assumptions.lowFloor} onChange={(v) => setA('lowFloor', v)} disabled={ro} />
          <PctField label={t('pricing.sp.premiumDelta')} value={assumptions.premiumDelta} onChange={(v) => setA('premiumDelta', v)} disabled={ro} />
        </fieldset>
      </Section>

      <Section
        title={t('pricing.sp.tiersTitle')}
        right={
          !ro && (
            <div className="flex gap-2">
              <button
                className="btn-secondary py-1.5"
                onClick={() =>
                  setTiers((p) => [
                    ...p,
                    { id: 't' + Math.random().toString(36).slice(2, 7), label: 'New tier', min: 0, max: 0, markup: 0.1, notes: '' },
                  ])
                }
              >
                {t('pricing.sp.addTier')}
              </button>
              <button className="btn-secondary py-1.5" onClick={() => setTiers(DEFAULT_TIERS)}>
                {t('pricing.sp.resetDefaults')}
              </button>
            </div>
          )
        }
      >
        <p className="mb-3 text-xs text-ink2">
          {t('pricing.sp.tiersNote')} {fmtMMK(45000)}.
        </p>
        <fieldset disabled={ro} className="min-w-0">
          <div className="overflow-x-auto rounded-lg border border-edge">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel2 text-xs uppercase tracking-wide text-ink2">
                <tr>
                  <th className="px-3 py-2">{t('pricing.sp.label')}</th>
                  <th className="px-3 py-2">{t('pricing.sp.min')}</th>
                  <th className="px-3 py-2">{t('pricing.sp.max')}</th>
                  <th className="px-3 py-2">{t('pricing.sp.markupPct')}</th>
                  <th className="px-3 py-2">{t('pricing.sp.notes')}</th>
                  {!ro && <th />}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {tiers.map((tr, i) => (
                  <tr key={tr.id}>
                    <td className="px-3 py-1.5">
                      <input className="input-tight" value={tr.label} disabled={ro} onChange={(e) => updateTier(i, { label: e.target.value })} />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        className="input-tight font-mono"
                        type="number"
                        disabled={ro}
                        value={Number.isFinite(tr.min) ? tr.min : ''}
                        onChange={(e) => updateTier(i, { min: e.target.value === '' ? NaN : Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        className="input-tight font-mono"
                        type="number"
                        disabled={ro}
                        value={Number.isFinite(tr.max) ? tr.max : ''}
                        onChange={(e) => updateTier(i, { max: e.target.value === '' ? NaN : Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        className="input-tight font-mono"
                        type="number"
                        step={0.5}
                        disabled={ro}
                        value={Number.isFinite(tr.markup) ? +(tr.markup * 100).toFixed(4) : ''}
                        onChange={(e) => updateTier(i, { markup: e.target.value === '' ? NaN : Number(e.target.value) / 100 })}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input className="input-tight" value={tr.notes ?? ''} disabled={ro} onChange={(e) => updateTier(i, { notes: e.target.value })} />
                    </td>
                    {!ro && (
                      <td className="px-1">
                        <IconButton title={t('common.delete')} onClick={() => setTiers((p) => p.filter((_, idx) => idx !== i))} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>
      </Section>

      <Section title={t('pricing.sp.importExport')}>
        <p className="mb-3 text-xs text-ink2">
          {t('pricing.sp.ieNote')}
          {ro ? t('pricing.sp.ieNoteRo') : t('pricing.sp.ieNoteRw')}
        </p>
        <ImportExport
          assumptions={assumptions}
          tiers={tiers}
          setAssumptions={setAssumptions}
          setTiers={setTiers}
          readOnly={ro}
          t={t}
        />
      </Section>
    </div>
  );
}

function ImportExport({ assumptions, tiers, setAssumptions, setTiers, readOnly, t }) {
  const text = JSON.stringify({ assumptions, tiers }, null, 2);
  return (
    <label className="block">
      <span className="label">{t('pricing.sp.settingsJson')}</span>
      <textarea
        className="input min-h-[180px] font-mono text-xs"
        rows={8}
        defaultValue={text}
        key={text}
        readOnly={readOnly}
        onBlur={(e) => {
          if (readOnly) return;
          try {
            const parsed = JSON.parse(e.target.value);
            if (parsed.assumptions) setAssumptions(parsed.assumptions);
            if (Array.isArray(parsed.tiers)) setTiers(parsed.tiers);
          } catch {
            alert(t('pricing.sp.invalidJson'));
          }
        }}
      />
    </label>
  );
}
