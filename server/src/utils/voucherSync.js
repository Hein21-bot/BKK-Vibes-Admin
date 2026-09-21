import { lineLabel, recalcOrderTotal } from './orderTotals.js';

const norm = (s) => String(s ?? '').trim().toLowerCase();

// A hand-typed order line "is" a voucher line when the label matches, or the name, qty and price match.
const sameLine = (o, l) =>
  norm(lineLabel(o.productName, o.color, o.size)) === norm(lineLabel(l.productName, l.color, l.size)) ||
  (norm(o.productName) === norm(l.productName) && o.quantity === l.quantity && Number(o.unitPrice) === l.unitPrice);

// Make the order's lines match the voucher's lines. Lines tagged with this voucher are replaced by the voucher's
// current lines; lines typed by hand (no voucher) are left alone. `tx` is a Prisma transaction client.
export async function syncVoucherToOrder(tx, voucherId, orderId, lines) {
  const tagged = await tx.orderItem.count({ where: { orderId, voucherId } });
  if (tagged === 0) {
    // First time this voucher meets this order: lines already on the order that are the same products
    // (e.g. the order was created from the voucher earlier) are taken over instead of duplicated.
    const loose = await tx.orderItem.findMany({ where: { orderId, voucherId: null } });
    const taken = new Set();
    for (const l of lines) {
      const match = loose.find((o) => !taken.has(o.orderItemId) && sameLine(o, l));
      if (match) taken.add(match.orderItemId);
    }
    if (taken.size) await tx.orderItem.deleteMany({ where: { orderItemId: { in: [...taken] } } });
  } else {
    await tx.orderItem.deleteMany({ where: { orderId, voucherId } });
  }
  await tx.orderItem.createMany({
    data: lines.map((l) => ({
      orderId,
      voucherId,
      productName: l.productName,
      color: l.color ?? null,
      size: l.size ?? null,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      subtotal: l.amount,
    })),
  });
  await recalcOrderTotal(orderId, tx);
}

// The voucher is no longer linked to the order: its lines stay on the order, as ordinary lines.
export async function detachVoucherFromOrder(tx, voucherId, orderId) {
  await tx.orderItem.updateMany({ where: { orderId, voucherId }, data: { voucherId: null } });
}
