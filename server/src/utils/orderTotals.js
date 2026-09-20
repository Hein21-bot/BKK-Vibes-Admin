import { prisma } from '../lib/prisma.js';

// Recompute an order's total_amount from its line items.
export async function recalcOrderTotal(orderId) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  const total = items.reduce((s, i) => s + Number(i.subtotal), 0);
  return prisma.order.update({
    where: { orderId },
    data: { totalAmount: Number(total.toFixed(2)) },
  });
}
