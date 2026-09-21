import { prisma } from '../lib/prisma.js';

// "Denim Jacket" + colour "Black" + size "M" -> "Denim Jacket (Black, M)".
export const lineLabel = (name, color, size) => {
  const extra = [color, size].filter(Boolean).join(', ');
  return extra ? `${String(name).trim()} (${extra})` : String(name).trim();
};

// Recompute an order's total_amount from its line items. Pass a transaction client as `db` to stay inside it.
export async function recalcOrderTotal(orderId, db = prisma) {
  const items = await db.orderItem.findMany({ where: { orderId } });
  const total = items.reduce((s, i) => s + Number(i.subtotal), 0);
  return db.order.update({
    where: { orderId },
    data: { totalAmount: Number(total.toFixed(2)) },
  });
}
