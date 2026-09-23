import { DEFAULT_ASSUMPTIONS, DEFAULT_TIERS, DEFAULT_WEIGHT_PRESETS } from '../../lib/pricing/calc.js';
import { usePersistentState, clearPersistedPricing } from '../../hooks/usePersistentState.js';
import { PricingProvider, usePricingState, usePricingStore } from '../../lib/pricing/pricingStore.jsx';
import { api, apiErrorMessage } from '../../api/client.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import PriceCalculator from './PriceCalculator.jsx';
import BatchCalculator from './BatchCalculator.jsx';
import WeightReference from './WeightReference.jsx';
import MarketReference from './MarketReference.jsx';
import SettingsPanel from './SettingsPanel.jsx';

const TAB_IDS = ['price', 'batch', 'weights', 'market', 'settings'];

// Loads the calculator data from the database before showing anything, so the
// calculators always start from the saved values (never from the defaults by mistake).
export default function PricingPage() {
  return (
    <PricingProvider>
      <PricingGate />
    </PricingProvider>
  );
}

function PricingGate() {
  const { t } = useI18n();
  const { load, reload } = usePricingStore();

  if (load.status === 'loading') return <PageLoader />;
  if (load.status === 'error') {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="font-semibold text-rose-600">{t('pricing.loadError')}</p>
        <p className="mt-1 text-sm text-ink2">{load.error}</p>
        <button className="btn-primary mt-4" onClick={reload}>
          {t('pricing.retry')}
        </button>
      </div>
    );
  }
  return <PricingContent />;
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
  return (
    <span className="text-xs text-ink2">{saveState === 'saving' ? t('pricing.saving') : t('pricing.saved')}</span>
  );
}

function PricingContent() {
  const { t } = useI18n();
  const toast = useToast();
  // Which tab is open is a per-browser view preference, not shared data.
  const [tab, setTab] = usePersistentState('activeTab', 'price');
  const [assumptions, setAssumptions] = usePricingState('assumptions', DEFAULT_ASSUMPTIONS);
  const [tiers, setTiers] = usePricingState('tiers', DEFAULT_TIERS);
  const [presets, setPresets] = usePricingState('weightPresets', DEFAULT_WEIGHT_PRESETS);
  // Locked by default — these are sensitive pricing assumptions, editable from the Settings tab
  // or, once unlocked, directly from the Price Calculator (both edit the same saved values).
  const [locked, setLocked] = usePersistentState('settingsLocked', true);

  const shared = { assumptions, tiers, presets };

  const resetAll = async () => {
    if (!confirm(t('pricing.confirmReset'))) return;
    try {
      await api.delete('/pricing');
      clearPersistedPricing();
      location.reload();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader title={t('pricing.title')} subtitle={t('pricing.subtitle')}>
        <SaveStatus />
        <button className="btn-secondary" onClick={resetAll}>
          {t('pricing.resetAll')}
        </button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-edge">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-ink2 hover:text-ink'
            }`}
          >
            {t(`pricing.tab.${id}`)}
          </button>
        ))}
      </div>

      {/*
        Every tab stays mounted the whole time you're on this page — only the CSS visibility
        toggles. Each calculator keeps its own unsaved edits in its own React state (usePricingState),
        which only syncs from the database once, when the tab first mounts. If a tab unmounted on
        every switch (the old `tab === 'x' && <X/>` pattern), switching away and back before its
        600ms autosave had finished writing would remount it from the last-loaded snapshot and an
        edit could appear to "revert" — even though the save had gone through underneath.
      */}
      <div className={tab === 'price' ? '' : 'hidden'}>
        <PriceCalculator {...shared} setAssumptions={setAssumptions} locked={locked} />
      </div>
      <div className={tab === 'batch' ? '' : 'hidden'}>
        <BatchCalculator {...shared} />
      </div>
      <div className={tab === 'weights' ? '' : 'hidden'}>
        <WeightReference presets={presets} setPresets={setPresets} cargoRate={assumptions.cargoRate} />
      </div>
      <div className={tab === 'market' ? '' : 'hidden'}>
        <MarketReference />
      </div>
      <div className={tab === 'settings' ? '' : 'hidden'}>
        <SettingsPanel
          assumptions={assumptions}
          setAssumptions={setAssumptions}
          tiers={tiers}
          setTiers={setTiers}
          locked={locked}
          setLocked={setLocked}
        />
      </div>

      <p className="mt-6 text-xs text-ink2">{t('pricing.footer')}</p>
    </div>
  );
}
