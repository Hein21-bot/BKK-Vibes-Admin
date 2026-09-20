import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { money } from '../lib/format.js';

// Active products, loaded when a form opens. Used only for optional name suggestions:
// order and voucher lines still accept any free text.
export function useProductSuggestions(open) {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    if (!open) return;
    api
      .get('/products', { params: { status: 'active', pageSize: 100 } })
      .then((r) => setProducts(r.data.data))
      .catch(() => setProducts([]));
  }, [open]);
  return products;
}

export function ProductDatalist({ id, products }) {
  return (
    <datalist id={id}>
      {products.map((p) => (
        <option key={p.productId} value={p.name} label={money(p.price)} />
      ))}
    </datalist>
  );
}

export const findProduct = (products, name) => {
  const n = String(name || '').trim().toLowerCase();
  return n ? products.find((p) => p.name.trim().toLowerCase() === n) : undefined;
};
