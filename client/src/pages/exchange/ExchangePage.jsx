import { useState } from 'react';
import { PricingProvider, usePricingState, usePricingStore } from '../../lib/pricing/pricingStore.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { NumField, PctField } from '../pricing/ui.jsx';

// Both rates are quoted against the same currency (e.g. how many kyat and how many baht one US dollar buys):
//   mid  = mmkRate ÷ thbRate                    (kyat per 1 baht)
//   buy  = mid × (1 − margin)   baht -> kyat    (you buy baht, paying this many kyat per baht)
//   sell = mid × (1 + margin)   kyat -> baht    (you sell baht, asking this many kyat per baht)
// margin = 0 gives the plain mid rate in both directions.
const DEFAULT_RATES = { mmkRate: 4370, thbRate: 33.31, margin: 0.0076 };
const QUICK_THB = [100, 500, 1000, 5000, 10000, 50000];

const fmt = (n, max = 2) => (Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: max }) : '—');

function computeRates(r) {
  const ok = r.mmkRate > 0 && r.thbRate > 0 && Number.isFinite(r.margin) && r.margin >= 0 && r.margin < 1;
  const mid = ok ? r.mmkRate / r.thbRate : NaN;
  const buy = mid * (1 - r.margin);
  const sell = mid * (1 + r.margin);
  return { ok, mid, buy, sell, spread: sell - buy, spreadPct: (sell - buy) / mid };
}

// Loads the saved rates from the database first, so the page never starts from the defaults by mistake.
export default function ExchangePage() {
  return (
    <PricingProvider>
      <Gate />
    </PricingProvider>
  );
}

function Gate() {
  const { t } = useI18n();
  const { load, reload } = usePricingStore();
  if (load.status === 'loading') return <PageLoader />;
  if (load.status === 'error') {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="font-semibold text-rose-600 dark:text-rose-400">{t('exchange.loadError')}</p>
        <p className="mt-1 text-sm text-ink2">{load.error}</p>
        <button className="btn-primary mt-4" onClick={reload}>
          {t('pricing.retry')}
        </button>
      </div>
    );
  }
  return <Content />;
}

function SaveStatus() {
  const { t } = useI18n();
  const { saveState, retry } = usePricingStore();
  if (saveState === 'idle') return null;
  if (saveState === 'error') {
    return (
      <button onClick={retry} className="text-xs font-medium text-rose-600">
        {t('pricing.saveError')}
      </button>
    );
  }
  return <span className="text-xs text-ink2">{saveState === 'saving' ? t('pricing.saving') : t('pricing.saved')}</span>;
}

function Content() {
  const { t } = useI18n();
  const [saved, setRates] = usePricingState('exchange', DEFAULT_RATES);
  // Rates saved before the margin existed have no margin: keep the default one.
  const rates = { ...DEFAULT_RATES, ...saved };
  const { ok, mid, buy, sell, spread, spreadPct } = computeRates(rates);
  // Two independent converters, one per direction.
  const [thbIn, setThbIn] = useState(1000);
  const [mmkIn, setMmkIn] = useState(100000);
  const mmkOut = ok && Number.isFinite(thbIn) ? thbIn * buy : NaN; // baht -> kyat at the buy rate
  const thbOut = ok && Number.isFinite(mmkIn) ? mmkIn / sell : NaN; // kyat -> baht at the sell rate

  return (
    <div>
      <PageHeader title={t('exchange.title')} subtitle={t('exchange.subtitle')}>
        <SaveStatus />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4 p-4">
          <h2 className="font-semibold text-ink">{t('exchange.converter')}</h2>

          <div className="space-y-2 rounded-lg border border-edge p-3">
            <p className="text-sm font-semibold text-ink">
              {t('exchange.thbToMmk')} <span className="font-normal text-ink2">· {t('exchange.buyShort')}</span>
            </p>
            <NumField label={t('exchange.thb')} unit="THB" step="any" min={0} value={thbIn} onChange={setThbIn} />
            {ok ? (
              <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-ink">
                {fmt(thbIn)} THB × {fmt(buy, 4)} ={' '}
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmt(mmkOut)} MMK</span>
              </p>
            ) : (
              <p className="text-sm text-rose-600">{t('exchange.errRates')}</p>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-edge p-3">
            <p className="text-sm font-semibold text-ink">
              {t('exchange.mmkToThb')} <span className="font-normal text-ink2">· {t('exchange.sellShort')}</span>
            </p>
            <NumField label={t('exchange.mmk')} unit="MMK" step="any" min={0} value={mmkIn} onChange={setMmkIn} />
            {ok ? (
              <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-ink">
                {fmt(mmkIn)} MMK ÷ {fmt(sell, 4)} ={' '}
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{fmt(thbOut)} THB</span>
              </p>
            ) : (
              <p className="text-sm text-rose-600">{t('exchange.errRates')}</p>
            )}
          </div>
        </div>

        <div className="card space-y-4 p-4">
          <h2 className="font-semibold text-ink">{t('exchange.rates')}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <NumField
              label={t('exchange.mmkRate')}
              step="any"
              min={0}
              value={rates.mmkRate}
              onChange={(v) => setRates({ ...rates, mmkRate: v })}
            />
            <NumField
              label={t('exchange.thbRate')}
              step="any"
              min={0}
              value={rates.thbRate}
              onChange={(v) => setRates({ ...rates, thbRate: v })}
            />
            <PctField
              label={t('exchange.margin')}
              step={0.01}
              value={rates.margin}
              onChange={(v) => setRates({ ...rates, margin: v })}
            />
          </div>
          <p className="text-xs text-ink2">{t('exchange.rateHint')}</p>
          {ok && (
            <div className="space-y-1 rounded-lg bg-panel2 p-3 text-sm text-ink">
              <p>
                {t('exchange.mid')}: {fmt(rates.mmkRate)} ÷ {fmt(rates.thbRate, 4)} = <span className="font-semibold">{fmt(mid, 4)} MMK</span>
              </p>
              <p>
                {t('exchange.buy')}: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(buy, 2)} MMK</span>
              </p>
              <p>
                {t('exchange.sell')}: <span className="font-semibold text-rose-600 dark:text-rose-400">{fmt(sell, 2)} MMK</span>
              </p>
              <p className="text-ink2">
                {t('exchange.spread')}: {fmt(spread, 2)} MMK ({fmt(spreadPct * 100, 2)}%)
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="card mt-4 space-y-2 p-4 text-sm text-ink">
        <h2 className="font-semibold">{t('exchange.formulas')}</h2>
        <p>
          {t('exchange.mid')}: <code className="rounded bg-panel2 px-1.5 py-0.5">{t('exchange.mid')} = {fmt(rates.mmkRate)} ÷ {fmt(rates.thbRate, 4)}</code>
        </p>
        <p>
          {t('exchange.thbToMmk')}: <code className="rounded bg-panel2 px-1.5 py-0.5">MMK = THB × {t('exchange.mid')} × (1 − {fmt(rates.margin * 100, 2)}%)</code>
        </p>
        <p>
          {t('exchange.mmkToThb')}: <code className="rounded bg-panel2 px-1.5 py-0.5">THB = MMK ÷ ({t('exchange.mid')} × (1 + {fmt(rates.margin * 100, 2)}%))</code>
        </p>
      </div>

      {ok && (
        <div className="card mt-4 overflow-x-auto p-4">
          <h2 className="mb-2 font-semibold text-ink">{t('exchange.quick')}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-ink2">
                <th className="py-1 pr-4">THB</th>
                <th className="py-1 pr-4">{t('exchange.buyCol')}</th>
                <th className="py-1 pr-4">{t('exchange.sellCol')}</th>
                <th className="py-1">{t('exchange.spreadCol')}</th>
              </tr>
            </thead>
            <tbody>
              {QUICK_THB.map((b) => (
                <tr key={b} className="border-t border-edge">
                  <td className="py-1.5 pr-4 font-medium text-ink">{fmt(b)}</td>
                  <td className="py-1.5 pr-4 text-ink">{fmt(b * buy)}</td>
                  <td className="py-1.5 pr-4 text-ink">{fmt(b * sell)}</td>
                  <td className="py-1.5 text-ink">{fmt(b * spread)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
