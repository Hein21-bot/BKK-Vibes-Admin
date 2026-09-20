import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useShopProfile, DEFAULT_LOGO } from '../../hooks/useShopProfile.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { VoucherForm } from './VoucherForm.jsx';
import { ShopProfileModal } from './ShopProfileModal.jsx';
import { OrderForm } from '../orders/OrderForm.jsx';
import { money, dateOnly } from '../../lib/format.js';


const TERMS = ['voucher.terms.preorder', 'voucher.terms.prepaid', 'voucher.terms.noRefund', 'voucher.terms.waiting'];

// Blank ruled rows are added so the printed grid always looks like a form.
const MIN_ROWS = 8;

const cell = 'border border-black px-2 py-1.5';

// Label + dotted-underline value, like the fields on the paper template.
function Field({ label, children }) {
  return (
    <tr>
      <td className="w-2/5 whitespace-nowrap py-0.5 pr-2 text-right">{label}:</td>
      <td className="border-b border-dotted border-slate-600 px-1 py-0.5 font-medium">{children || ' '}</td>
    </tr>
  );
}

export default function VoucherView() {
  const { id } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: v, loading, error, reload } = useApi(`/vouchers/${id}`, null, [id]);
  const [profile, saveProfile] = useShopProfile();
  const [editOpen, setEditOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);

  // The page title becomes the default file name when saving as PDF.
  useEffect(() => {
    if (!v) return;
    const previous = document.title;
    document.title = `${v.voucherNo} - ${v.customerName}`;
    return () => {
      document.title = previous;
    };
  }, [v]);

  if (loading) return <PageLoader />;
  if (error) return <p className="text-rose-600">{error}</p>;

  const blankRows = Math.max(0, MIN_ROWS - v.items.length);

  return (
    <div>
      <div className="print:hidden">
        <PageHeader title={v.voucherNo} subtitle={v.customerName}>
          <Link to="/vouchers" className="btn-secondary">
            {t('common.back')}
          </Link>
          {v.order ? (
            <Link to={`/orders/${v.order.orderId}`} className="btn-secondary">
              🧾 {t('voucher.openOrder', { id: v.order.orderId })}
            </Link>
          ) : (
            <button className="btn-secondary" onClick={() => setOrderOpen(true)}>
              {t('voucher.createOrder')}
            </button>
          )}
          <button className="btn-secondary" onClick={() => setShopOpen(true)}>
            {t('shop.details')}
          </button>
          <button className="btn-secondary" onClick={() => setEditOpen(true)}>
            {t('common.edit')}
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            🖨 {t('voucher.print')}
          </button>
        </PageHeader>
      </div>

      {/* Always a white "paper" sheet with black ink, in light and dark mode and on paper. */}
      <article className="voucher mx-auto w-full max-w-[860px] bg-white p-8 text-slate-900 shadow-sm ring-1 ring-slate-200 print:max-w-none print:p-[14mm] print:shadow-none print:ring-0">
        <header className="flex items-start justify-between gap-6">
          <div className="flex w-[52%] items-center gap-4 text-sm leading-relaxed">
            <img
              src={profile.logo || DEFAULT_LOGO}
              alt=""
              className="h-24 w-24 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0">
              {profile.name && <p className="text-base font-bold">{profile.name}</p>}
              {profile.address && <p className="whitespace-pre-line">{profile.address}</p>}
              {profile.phone && (
                <p>
                  <b>{t('shop.tel')}</b> {profile.phone}
                </p>
              )}
              {profile.email && (
                <p>
                  <b>{t('shop.emailShort')}</b> {profile.email}
                </p>
              )}
            </div>
          </div>

          <div className="w-[46%]">
            <h2 className="font-serif text-2xl font-bold uppercase tracking-wide">{t('voucher.title')}</h2>
            <table className="mt-2 w-full text-sm">
              <tbody>
                <Field label={t('voucher.date')}>{dateOnly(v.voucherDate)}</Field>
                <Field label={t('voucher.no')}>{v.voucherNo}</Field>
                <Field label={t('voucher.customerName')}>{v.customerName}</Field>
              </tbody>
            </table>
          </div>
        </header>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className={`${cell} w-12 text-left font-semibold`}>{t('voucher.serial')}</th>
              <th className={`${cell} text-left font-semibold`}>{t('voucher.product')}</th>
              <th className={`${cell} w-24 text-left font-semibold`}>{t('voucher.color')}</th>
              <th className={`${cell} w-20 text-left font-semibold`}>{t('voucher.size')}</th>
              <th className={`${cell} w-16 text-right font-semibold`}>{t('voucher.qty')}</th>
              <th className={`${cell} w-32 text-right font-semibold`}>{t('voucher.unitPrice')}</th>
              <th className={`${cell} w-32 text-right font-semibold`}>{t('voucher.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {v.items.map((it, i) => (
              <tr key={it.voucherItemId}>
                <td className={cell}>{i + 1}</td>
                <td className={cell}>{it.productName}</td>
                <td className={cell}>{it.color}</td>
                <td className={cell}>{it.size}</td>
                <td className={`${cell} text-right`}>{it.quantity}</td>
                <td className={`${cell} text-right`}>{money(it.unitPrice)}</td>
                <td className={`${cell} text-right`}>{money(it.amount)}</td>
              </tr>
            ))}
            {Array.from({ length: blankRows }).map((_, i) => (
              <tr key={`blank-${i}`} className="h-8">
                {[0, 1, 2, 3, 4, 5, 6].map((c) => (
                  <td key={c} className={cell} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex items-start justify-between gap-6">
          <div className="w-1/2 text-xs leading-relaxed">
            <h3 className="text-sm font-bold">{t('voucher.terms')}</h3>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {TERMS.map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
          </div>

          <table className="w-1/2 border-collapse text-sm">
            <tbody>
              <tr>
                <td className="py-1 pr-3 text-right">{t('voucher.subtotal')}:</td>
                <td className={`${cell} w-36 text-right`}>{money(v.subtotal)}</td>
              </tr>
              <tr>
                <td className="py-1 pr-3 text-right">{t('voucher.discount')}:</td>
                <td className={`${cell} w-36 text-right`}>{v.discountAmount ? `− ${money(v.discountAmount)}` : money(0)}</td>
              </tr>
              <tr className="font-bold">
                <td className="py-1 pr-3 text-right">{t('voucher.total')}:</td>
                <td className={`${cell} w-36 text-right text-base`}>{money(v.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer className="mt-16 flex justify-between px-6 text-sm">
          <div className="w-56 border-t border-black pt-1 text-center">{t('voucher.authorizedBy')}</div>
          <div className="w-56 border-t border-black pt-1 text-center">{t('voucher.receivedBy')}</div>
        </footer>
      </article>

      <OrderForm
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        prefill={{
          voucherId: v.voucherId,
          customerName: v.customerName,
          note: [`Voucher ${v.voucherNo}`, v.discountAmount ? `discount ${money(v.discountAmount)}` : '']
            .filter(Boolean)
            .join(' · '),
          items: v.items.map((it) => ({
            productName: it.productName,
            color: it.color,
            size: it.size,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
        }}
        onSaved={(order) => navigate(`/orders/${order.orderId}`)}
      />

      <VoucherForm open={editOpen} onClose={() => setEditOpen(false)} voucher={v} onSaved={reload} />
      <ShopProfileModal open={shopOpen} onClose={() => setShopOpen(false)} profile={profile} onSave={saveProfile} />
    </div>
  );
}
