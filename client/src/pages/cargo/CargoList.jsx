import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage, downloadFile } from '../../api/client.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Table, THead, TBody, Th, Td, EmptyRow } from '../../components/ui/Table.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { SelectInput } from '../../components/ui/Field.jsx';
import { CargoForm } from './CargoForm.jsx';
import { CARGO_STATUSES } from '../../lib/constants.js';
import { baht, dateOnly } from '../../lib/format.js';

export default function CargoList() {
  const toast = useToast();
  const { t } = useI18n();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editBatch, setEditBatch] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/cargo', { params: { status, search, page, pageSize: 15 } })
      .then((r) => setResp(r.data))
      .catch((e) => toast.error(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [status, page]);

  const rows = resp?.data || [];

  return (
    <div>
      <PageHeader title={t('cargo.title')} subtitle={resp ? t('cargo.count', { n: resp.pagination.total }) : ''}>
        <button className="btn-secondary" onClick={() => downloadFile('/cargo/export', { format: 'csv' }, 'cargo.csv')}>
          {t('common.exportCsv')}
        </button>
        <button className="btn-secondary" onClick={() => downloadFile('/cargo/export', { format: 'xlsx' }, 'cargo.xlsx')}>
          {t('common.exportExcel')}
        </button>
        <button
          className="btn-primary"
          onClick={() => {
            setEditBatch(null);
            setFormOpen(true);
          }}
        >
          {t('cargo.new')}
        </button>
      </PageHeader>

      <form
        className="card mb-4 grid gap-3 p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
      >
        <label className="block">
          <span className="label">{t('common.search')}</span>
          <input
            className="input"
            placeholder={t('cargo.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <SelectInput
          label={t('col.status')}
          includeBlank={t('common.all')}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={CARGO_STATUSES.map((s) => ({ value: s, label: t(`status.cargo.${s}`) }))}
        />
        <div className="flex items-end">
          <button className="btn-primary">{t('common.search')}</button>
        </div>
      </form>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-7 w-7" />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t('col.batch')}</Th>
                <Th>{t('col.status')}</Th>
                <Th>{t('col.route')}</Th>
                <Th>{t('col.weight')}</Th>
                <Th>{t('col.rate')}</Th>
                <Th>{t('col.cargoCost')}</Th>
                <Th>{t('col.orders')}</Th>
                <Th>{t('col.departure')}</Th>
                <Th>{t('col.arrival')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {rows.length === 0 && <EmptyRow colSpan={10} />}
              {rows.map((c) => (
                <tr key={c.cargoId} className="hover:bg-panel2">
                  <Td>
                    <Link to={`/cargo/${c.cargoId}`} className="font-semibold text-brand-600">
                      {c.cargoBatchCode}
                    </Link>
                  </Td>
                  <Td>
                    <StatusBadge value={c.status} kind="cargo" />
                  </Td>
                  <Td className="text-ink2">
                    {c.origin} → {c.destination}
                  </Td>
                  <Td>{c.weight} kg</Td>
                  <Td>{baht(c.cargoRate)}</Td>
                  <Td className="font-medium">{baht(c.totalPrice)}</Td>
                  <Td>{c.orderCount}</Td>
                  <Td className="whitespace-nowrap text-ink2">{dateOnly(c.departureDate)}</Td>
                  <Td className="whitespace-nowrap text-ink2">{dateOnly(c.arrivalDate)}</Td>
                  <Td>
                    <button
                      className="text-sm text-brand-600"
                      onClick={() => {
                        setEditBatch(c);
                        setFormOpen(true);
                      }}
                    >
                      {t('common.edit')}
                    </button>
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
        <Pagination pagination={resp?.pagination} onChange={setPage} />
      </div>

      <CargoForm open={formOpen} onClose={() => setFormOpen(false)} batch={editBatch} onSaved={load} />
    </div>
  );
}
