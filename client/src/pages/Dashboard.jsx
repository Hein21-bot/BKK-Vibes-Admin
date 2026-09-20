import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { PageLoader } from '../components/ui/Spinner.jsx';
import { StatusBadge, PaidBadge } from '../components/ui/Badge.jsx';
import { Table, THead, TBody, Th, Td } from '../components/ui/Table.jsx';
import { money, dateTime } from '../lib/format.js';

function Stat({ label, value, hint, accent = 'text-ink' }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink2">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink2">{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useI18n();
  const { data, loading, error } = useApi('/dashboard/summary', null, []);

  if (loading) return <PageLoader />;
  if (error) return <p className="text-rose-600">{error}</p>;

  const chartData = data.orderStatusSummary.map((s) => ({
    name: t(`status.order.${s.status}`),
    count: s.count,
  }));

  return (
    <div>
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label={t('dashboard.todayOrders')} value={data.todayOrderCount} />
        <Stat label={t('dashboard.totalOrders')} value={data.totalOrderCount} />
        <Stat label={t('dashboard.inCargo')} value={data.inCargoCount} accent="text-indigo-500" hint={t('dashboard.inCargoHint')} />
        <Stat label={t('dashboard.toDeliver')} value={data.toDeliverCount} accent="text-amber-500" hint={t('dashboard.toDeliverHint')} />
        <Stat label={t('dashboard.delivered')} value={data.deliveredCount} accent="text-emerald-500" />
        <Stat label={t('dashboard.unpaid')} value={data.unpaidCount} accent="text-rose-500" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-ink">{t('dashboard.ordersByStatus')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / 0.25)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  background: 'rgb(var(--c-panel))',
                  border: '1px solid rgb(var(--c-edge))',
                  borderRadius: 8,
                  color: 'rgb(var(--c-ink))',
                }}
              />
              <Bar dataKey="count" fill="#3366ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card flex flex-col justify-center gap-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink2">{t('dashboard.activeCargo')}</p>
            <p className="mt-1 text-3xl font-bold text-ink">{data.activeCargoCount}</p>
            <p className="text-xs text-ink2">{t('dashboard.activeCargoHint')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink2">{t('dashboard.collected')}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-500">{money(data.paidRevenue)}</p>
          </div>
          <Link to="/cargo" className="btn-secondary w-full">
            {t('dashboard.goToCargo')}
          </Link>
        </div>
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">{t('dashboard.recentOrders')}</h3>
          <Link to="/orders" className="text-sm font-medium text-brand-600 hover:underline">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        <Table>
          <THead>
            <tr>
              <Th>{t('col.order')}</Th>
              <Th>{t('col.customer')}</Th>
              <Th>{t('col.status')}</Th>
              <Th>{t('col.paid')}</Th>
              <Th>{t('col.total')}</Th>
              <Th>{t('col.cargo')}</Th>
              <Th>{t('col.created')}</Th>
            </tr>
          </THead>
          <TBody>
            {data.recentOrders.map((o) => (
              <tr key={o.orderId} className="hover:bg-panel2">
                <Td>
                  <Link to={`/orders/${o.orderId}`} className="font-semibold text-brand-600">
                    #{o.orderId}
                  </Link>
                </Td>
                <Td>{o.customerName}</Td>
                <Td>
                  <StatusBadge value={o.status} />
                </Td>
                <Td>
                  <PaidBadge paid={o.paid} />
                </Td>
                <Td>{money(o.totalAmount)}</Td>
                <Td>{o.cargoBatchCode || '—'}</Td>
                <Td className="text-ink2">{dateTime(o.createdDatetime)}</Td>
              </tr>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
