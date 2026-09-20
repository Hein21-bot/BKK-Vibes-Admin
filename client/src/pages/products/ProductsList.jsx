import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../api/client.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Table, THead, TBody, Th, Td, EmptyRow } from '../../components/ui/Table.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { SelectInput } from '../../components/ui/Field.jsx';
import { ProductForm } from './ProductForm.jsx';
import { PRODUCT_STATUSES, PRODUCT_STATUS_COLORS } from '../../lib/constants.js';
import { money } from '../../lib/format.js';

const LOW_STOCK = 5;

export default function ProductsList() {
  const toast = useToast();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/products', { params: { search: applied, status, page, pageSize: 15 } })
      .then((r) => setResp(r.data))
      .catch((e) => toast.error(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [applied, status, page]);

  const remove = async (p) => {
    if (!confirm(t('products.confirmDelete', { name: p.name }))) return;
    try {
      await api.delete(`/products/${p.productId}`);
      toast.success(t('toast.productDeleted'));
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const rows = resp?.data || [];

  return (
    <div>
      <PageHeader
        title={t('products.title')}
        subtitle={resp ? t('products.count', { n: resp.pagination.total }) : t('products.subtitle')}
      >
        <button
          className="btn-primary"
          onClick={() => {
            setEditRow(null);
            setFormOpen(true);
          }}
        >
          {t('products.new')}
        </button>
      </PageHeader>

      <form
        className="card mb-4 grid gap-3 p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setApplied(search);
        }}
      >
        <label className="block">
          <span className="label">{t('common.search')}</span>
          <input
            className="input"
            placeholder={t('products.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <SelectInput
          label={t('products.status')}
          includeBlank={t('common.all')}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={PRODUCT_STATUSES.map((s) => ({ value: s, label: t(`productStatus.${s}`) }))}
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
                <Th>{t('products.name')}</Th>
                <Th>{t('products.category')}</Th>
                <Th>{t('products.price')}</Th>
                <Th>{t('products.stock')}</Th>
                <Th>{t('products.status')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {rows.length === 0 && <EmptyRow colSpan={6} />}
              {rows.map((p) => (
                <tr key={p.productId} className="hover:bg-panel2">
                  <Td>
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-panel2 text-lg">
                          🛍️
                        </span>
                      )}
                      <span className="font-medium text-ink">{p.name}</span>
                    </div>
                  </Td>
                  <Td>{p.category || '—'}</Td>
                  <Td className="font-medium">{money(p.price)}</Td>
                  <Td>
                    <span className={p.stockQty <= LOW_STOCK ? 'font-semibold text-rose-600' : ''}>{p.stockQty}</span>
                  </Td>
                  <Td>
                    <Badge className={PRODUCT_STATUS_COLORS[p.status]}>{t(`productStatus.${p.status}`)}</Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-3">
                      <button
                        className="text-sm text-brand-600"
                        onClick={() => {
                          setEditRow(p);
                          setFormOpen(true);
                        }}
                      >
                        {t('common.edit')}
                      </button>
                      <button className="text-sm text-rose-600" onClick={() => remove(p)}>
                        {t('common.delete')}
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
        <Pagination pagination={resp?.pagination} onChange={setPage} />
      </div>

      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editRow}
        categories={resp?.categories}
        onSaved={load}
      />
    </div>
  );
}
