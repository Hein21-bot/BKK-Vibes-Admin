import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { api, apiErrorMessage, downloadFile } from '../../api/client.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { dateOnly } from '../../lib/format.js';

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink2">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

export default function ToBuy() {
  const toast = useToast();
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('product'); // 'product' | 'order'
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setError('');
    api
      .get('/orders/to-buy')
      .then((r) => {
        setData(r.data);
        setSelected([]);
      })
      .catch((e) => setError(apiErrorMessage(e)));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // After you have bought the items, the orders move on to Pending (Bangkok).
  const markBought = async () => {
    if (!confirm(t('toBuy.confirmBought', { n: selected.length }))) return;
    setBusy(true);
    try {
      const { data: r } = await api.patch('/orders/bulk', { orderIds: selected, status: 'pending' });
      toast.success(t('toBuy.boughtDone', { n: r.updated }));
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <PageLoader />;

  const { summary, products, orders } = data;
  const empty = summary.orderCount === 0;

  return (
    <div className="print:p-[14mm]">
      <PageHeader title={t('toBuy.title')} subtitle={t('toBuy.subtitle')}>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button className="btn-secondary" onClick={load}>
            ↻ {t('toBuy.refresh')}
          </button>
          <button className="btn-secondary" onClick={() => downloadFile('/orders/to-buy/export', { format: 'csv' }, 'to-buy.csv')}>
            {t('common.exportCsv')}
          </button>
          <button className="btn-secondary" onClick={() => downloadFile('/orders/to-buy/export', { format: 'xlsx' }, 'to-buy.xlsx')}>
            {t('common.exportExcel')}
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            🖨 {t('toBuy.print')}
          </button>
        </div>
      </PageHeader>

      <p className="mb-4 rounded-lg bg-panel2 px-3 py-2 text-xs text-ink2">{t('toBuy.onlyConfirmed')}</p>

      <div className="mb-4 grid grid-cols-3 gap-4">
        <Stat label={t('toBuy.orders')} value={summary.orderCount} />
        <Stat label={t('toBuy.products')} value={summary.productCount} />
        <Stat label={t('toBuy.units')} value={summary.totalUnits} />
      </div>

      {empty ? (
        <div className="card p-10 text-center text-ink2">🎉 {t('toBuy.empty')}</div>
      ) : (
        <>
          <div className="mb-3 inline-flex rounded-lg border border-edge bg-panel p-0.5 text-sm font-medium print:hidden">
            {['product', 'order'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={clsx(
                  'rounded-md px-3 py-1.5',
                  view === v ? 'bg-brand-600 text-white' : 'text-ink2 hover:text-ink',
                )}
              >
                {t(v === 'product' ? 'toBuy.byProduct' : 'toBuy.byOrder')}
              </button>
            ))}
          </div>

          {view === 'product' && (
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-edge bg-panel2 text-xs uppercase tracking-wide text-ink2">
                  <tr>
                    <th className="w-10 px-4 py-3">#</th>
                    <th className="px-4 py-3">{t('toBuy.product')}</th>
                    <th className="px-4 py-3">{t('orderForm.color')}</th>
                    <th className="px-4 py-3">{t('orderForm.size')}</th>
                    <th className="px-4 py-3 text-right">{t('toBuy.qtyToBuy')}</th>
                    <th className="px-4 py-3">{t('toBuy.forOrders')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {products.map((p, i) => (
                    <tr key={`${p.name}|${p.color}|${p.size}`} className="align-top">
                      <td className="px-4 py-3 text-ink2">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.imageUrl && <img src={p.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />}
                          <span className="font-medium text-ink">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">{p.color || '—'}</td>
                      <td className="px-4 py-3 font-medium text-ink">{p.size || '—'}</td>
                      <td className="px-4 py-3 text-right text-xl font-bold text-ink">{p.quantity}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {p.orders.map((o) => (
                            <Link
                              key={o.orderId}
                              to={`/orders/${o.orderId}`}
                              className="rounded-full bg-panel2 px-2.5 py-0.5 text-xs font-medium text-ink hover:text-brand-600"
                            >
                              #{o.orderId} {o.customerName} × {o.quantity}
                            </Link>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'order' && (
            <>
              {selected.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm dark:border-brand-500/30 dark:bg-brand-500/10 print:hidden">
                  <span className="font-medium text-brand-800 dark:text-brand-200">
                    {t('orders.selected', { n: selected.length })}
                  </span>
                  <button className="btn-primary py-1.5" onClick={markBought} disabled={busy}>
                    {t('toBuy.markBought')}
                  </button>
                </div>
              )}
              <div className="card overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-edge bg-panel2 text-xs uppercase tracking-wide text-ink2">
                    <tr>
                      <th className="w-10 px-4 py-3 print:hidden">
                        <input
                          type="checkbox"
                          checked={selected.length === orders.length}
                          onChange={() => setSelected(selected.length === orders.length ? [] : orders.map((o) => o.orderId))}
                        />
                      </th>
                      <th className="px-4 py-3">{t('col.order')}</th>
                      <th className="px-4 py-3">{t('col.customer')}</th>
                      <th className="px-4 py-3">{t('toBuy.itemsToBuy')}</th>
                      <th className="px-4 py-3">{t('col.created')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge">
                    {orders.map((o) => (
                      <tr key={o.orderId} className="align-top hover:bg-panel2">
                        <td className="px-4 py-3 print:hidden">
                          <input type="checkbox" checked={selected.includes(o.orderId)} onChange={() => toggle(o.orderId)} />
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/orders/${o.orderId}`} className="font-semibold text-brand-600">
                            #{o.orderId}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">{o.customerName}</td>
                        <td className="px-4 py-3">
                          <ul className="space-y-0.5">
                            {o.items.map((it, i) => (
                              <li key={i}>
                                {it.productName}
                                {(it.color || it.size) && (
                                  <span className="text-ink2"> ({[it.color, it.size].filter(Boolean).join(', ')})</span>
                                )}{' '}
                                <span className="font-semibold">× {it.quantity}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink2">{dateOnly(o.createdDatetime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
