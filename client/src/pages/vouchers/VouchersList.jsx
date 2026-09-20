import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Table, THead, TBody, Th, Td, EmptyRow } from '../../components/ui/Table.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { VoucherForm } from './VoucherForm.jsx';
import { money, dateOnly } from '../../lib/format.js';

export default function VouchersList() {
  const toast = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/vouchers', { params: { search: applied, page, pageSize: 15 } })
      .then((r) => setResp(r.data))
      .catch((e) => toast.error(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [applied, page]);

  // Editing needs the line items, which the list does not include.
  const openEdit = async (row) => {
    try {
      const { data } = await api.get(`/vouchers/${row.voucherId}`);
      setEditRow(data);
      setFormOpen(true);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const remove = async (row) => {
    if (!confirm(t('vouchers.confirmDelete', { no: row.voucherNo }))) return;
    try {
      await api.delete(`/vouchers/${row.voucherId}`);
      toast.success(t('toast.voucherDeleted'));
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const rows = resp?.data || [];

  return (
    <div>
      <PageHeader
        title={t('vouchers.title')}
        subtitle={resp ? t('vouchers.count', { n: resp.pagination.total }) : t('vouchers.subtitle')}
      >
        <button
          className="btn-primary"
          onClick={() => {
            setEditRow(null);
            setFormOpen(true);
          }}
        >
          {t('vouchers.new')}
        </button>
      </PageHeader>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setApplied(search);
        }}
      >
        <input
          className="input max-w-sm"
          placeholder={t('vouchers.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-primary">{t('common.search')}</button>
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
                <Th>{t('voucher.no')}</Th>
                <Th>{t('voucher.date')}</Th>
                <Th>{t('voucher.customerName')}</Th>
                <Th>{t('voucher.orderCol')}</Th>
                <Th>{t('voucher.product')}</Th>
                <Th>{t('voucher.discount')}</Th>
                <Th>{t('voucher.total')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {rows.length === 0 && <EmptyRow colSpan={8} />}
              {rows.map((v) => (
                <tr key={v.voucherId} className="hover:bg-panel2">
                  <Td>
                    <Link to={`/vouchers/${v.voucherId}`} className="font-semibold text-brand-600">
                      {v.voucherNo}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap text-ink2">{dateOnly(v.voucherDate)}</Td>
                  <Td className="font-medium text-ink">{v.customerName}</Td>
                  <Td>
                    {v.order ? (
                      <Link to={`/orders/${v.order.orderId}`} className="text-brand-600">
                        #{v.order.orderId}
                      </Link>
                    ) : (
                      <span className="text-ink2">—</span>
                    )}
                  </Td>
                  <Td>{v.itemCount}</Td>
                  <Td>{v.discountAmount ? money(v.discountAmount) : '—'}</Td>
                  <Td className="font-medium">{money(v.totalAmount)}</Td>
                  <Td>
                    <div className="flex gap-3">
                      <Link to={`/vouchers/${v.voucherId}`} className="text-sm text-brand-600">
                        {t('vouchers.view')}
                      </Link>
                      <button className="text-sm text-brand-600" onClick={() => openEdit(v)}>
                        {t('common.edit')}
                      </button>
                      <button className="text-sm text-rose-600" onClick={() => remove(v)}>
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

      <VoucherForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        voucher={editRow}
        onSaved={(data, isNew) => (isNew ? navigate(`/vouchers/${data.voucherId}`) : load())}
      />
    </div>
  );
}
