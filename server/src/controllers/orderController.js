import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ApiError } from '../lib/asyncHandler.js';
import { parsePagination, paginated } from '../utils/pagination.js';
import { recalcOrderTotal, lineLabel } from '../utils/orderTotals.js';
import { sendExport } from '../utils/export.js';

// awaiting_payment -> confirmed: payment confirmed, product NOT bought yet.
// confirmed -> pending: product bought and in our hands in Bangkok. Then it ships.
// `confirmed` can only be set on a paid order: marking an awaiting_payment order paid
// confirms it, and un-marking paid sends it back to awaiting_payment.
export const ORDER_STATUS_FLOW = ['awaiting_payment', 'confirmed', 'pending', 'in_cargo', 'arrived', 'delivering', 'delivered'];

const NEEDS_PAYMENT = 'Payment must be confirmed (mark the order paid) before its status can be Confirmed';

// Blank strings from the form become null.
const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => v || null);

const itemSchema = z.object({
  productName: z.string().min(1),
  color: optionalText,
  size: optionalText,
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative().default(0),
  // Sent back unchanged when an order is edited, so lines that came from a voucher stay tied to it.
  voucherId: z.number().int().positive().nullable().optional(),
});

const orderCreateSchema = z.object({
  // Set when the order is created from a voucher: the voucher gets linked to the new order.
  voucherId: z.number().int().positive().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  status: z.enum(ORDER_STATUS_FLOW).optional(),
  paid: z.boolean().optional(),
  trackingNumber: z.string().optional().nullable(),
  cargoBatchId: z.number().int().positive().nullable().optional(),
  note: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
});

const orderUpdateSchema = orderCreateSchema.partial();

function buildWhere(q) {
  const where = {};
  if (q.status) where.status = { in: String(q.status).split(',') };
  if (q.paid === 'true') where.paid = true;
  if (q.paid === 'false') where.paid = false;
  if (q.cargoBatchId) where.cargoBatchId = Number(q.cargoBatchId);
  if (q.unassigned === 'true') where.cargoBatchId = null;
  if (q.dateFrom || q.dateTo) {
    where.createdDatetime = {};
    if (q.dateFrom) where.createdDatetime.gte = new Date(q.dateFrom);
    if (q.dateTo) {
      const to = new Date(q.dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdDatetime.lte = to;
    }
  }
  if (q.search) {
    const s = String(q.search).trim();
    where.OR = [
      { customerName: { contains: s, mode: 'insensitive' } },
      { customerPhone: { contains: s, mode: 'insensitive' } },
      { trackingNumber: { contains: s, mode: 'insensitive' } },
      ...(Number.isInteger(Number(s)) ? [{ orderId: Number(s) }] : []),
    ];
  }
  return where;
}

const mapListRow = (o) => ({
  orderId: o.orderId,
  customerName: o.customerName,
  customerPhone: o.customerPhone,
  customerAddress: o.customerAddress,
  status: o.status,
  paid: o.paid,
  totalAmount: Number(o.totalAmount),
  trackingNumber: o.trackingNumber,
  cargoBatch: o.cargoBatch,
  lineCount: o.items.length,
  itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
  createdDatetime: o.createdDatetime,
});

export const listOrders = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const where = buildWhere(req.query);
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdDatetime: 'desc' },
      include: {
        cargoBatch: { select: { cargoId: true, cargoBatchCode: true } },
        items: { select: { quantity: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  res.json(paginated(rows.map(mapListRow), total, page, pageSize));
});

function statusTimeline(current) {
  const idx = ORDER_STATUS_FLOW.indexOf(current);
  return ORDER_STATUS_FLOW.map((s, i) => ({ status: s, reached: i <= idx, current: i === idx }));
}

async function fullOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { orderId },
    include: {
      cargoBatch: true,
      items: { orderBy: { orderItemId: 'asc' } },
      vouchers: {
        orderBy: { voucherId: 'desc' },
        select: { voucherId: true, voucherNo: true, voucherDate: true, totalAmount: true },
      },
    },
  });
  if (!order) throw new ApiError(404, 'Order not found');
  return {
    ...order,
    vouchers: order.vouchers.map((v) => ({ ...v, totalAmount: Number(v.totalAmount) })),
    totalAmount: Number(order.totalAmount),
    items: order.items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.subtotal),
    })),
    cargoBatch: order.cargoBatch
      ? { ...order.cargoBatch, weight: Number(order.cargoBatch.weight), cargoRate: Number(order.cargoBatch.cargoRate), totalPrice: Number(order.cargoBatch.totalPrice) }
      : null,
    timeline: statusTimeline(order.status),
  };
}

export const getOrder = asyncHandler(async (req, res) => {
  res.json(await fullOrder(Number(req.params.id)));
});

const buildItems = (items, voucherIds = new Set()) =>
  items.map((i) => ({
    voucherId: i.voucherId && voucherIds.has(i.voucherId) ? i.voucherId : null,
    productName: i.productName,
    color: i.color ?? null,
    size: i.size ?? null,
    quantity: i.quantity,
    unitPrice: i.unitPrice ?? 0,
    subtotal: Number(((i.unitPrice ?? 0) * i.quantity).toFixed(2)),
  }));

export const createOrder = asyncHandler(async (req, res) => {
  const body = orderCreateSchema.parse(req.body);

  const paid = body.paid ?? false;
  let status = body.status ?? (paid ? 'confirmed' : 'awaiting_payment');
  if (status === 'confirmed' && !paid) throw new ApiError(400, NEEDS_PAYMENT);

  if (body.voucherId) {
    const voucher = await prisma.voucher.findUnique({ where: { voucherId: body.voucherId } });
    if (!voucher) throw new ApiError(404, 'Voucher not found');
    if (voucher.orderId) {
      throw new ApiError(409, `Voucher ${voucher.voucherNo} is already linked to order #${voucher.orderId}`);
    }
  }

  // Order + link are saved together: if the voucher was linked meanwhile, nothing is created.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        customerName: body.customerName,
        customerPhone: body.customerPhone ?? null,
        customerAddress: body.customerAddress ?? null,
        status,
        paid,
        trackingNumber: body.trackingNumber ?? null,
        cargoBatchId: body.cargoBatchId ?? null,
        note: body.note ?? null,
        createdBy: req.user.username,
        // Lines of an order made from a voucher stay tied to it, so editing the voucher later updates them.
        items: { create: buildItems(body.items).map((i) => ({ ...i, voucherId: body.voucherId ?? null })) },
      },
    });
    if (body.voucherId) {
      const linked = await tx.voucher.updateMany({
        where: { voucherId: body.voucherId, orderId: null },
        data: { orderId: created.orderId },
      });
      if (linked.count === 0) throw new ApiError(409, 'This voucher is already linked to an order');
    }
    return created;
  });

  await recalcOrderTotal(order.orderId);
  res.status(201).json({ ...(await fullOrder(order.orderId)), id: order.orderId });
});

export const updateOrder = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  const body = orderUpdateSchema.parse(req.body);
  const current = await prisma.order.findUniqueOrThrow({ where: { orderId } });

  const data = {};
  for (const k of ['customerName', 'customerPhone', 'customerAddress', 'status', 'paid', 'trackingNumber', 'note']) {
    if (body[k] !== undefined) data[k] = body[k];
  }

  // Payment <-> confirmation rules.
  const paid = body.paid ?? current.paid;
  if (body.status === 'confirmed' && !paid) throw new ApiError(400, NEEDS_PAYMENT);
  if (body.status === undefined && body.paid !== undefined && body.paid !== current.paid) {
    if (body.paid && current.status === 'awaiting_payment') data.status = 'confirmed';
    if (!body.paid && current.status === 'confirmed') data.status = 'awaiting_payment';
  }
  if (body.cargoBatchId !== undefined) data.cargoBatchId = body.cargoBatchId;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { orderId }, data });
    if (body.items) {
      // Only vouchers really linked to this order may keep their lines tied to them.
      const linked = await tx.voucher.findMany({ where: { orderId }, select: { voucherId: true } });
      const ids = new Set(linked.map((v) => v.voucherId));
      await tx.orderItem.deleteMany({ where: { orderId } });
      await tx.orderItem.createMany({ data: buildItems(body.items, ids).map((i) => ({ ...i, orderId })) });
    }
  });
  await recalcOrderTotal(orderId);
  res.json({ ...(await fullOrder(orderId)), id: orderId });
});

export const deleteOrder = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  await prisma.order.delete({ where: { orderId } });
  res.json({ id: orderId, deleted: true });
});

const bulkSchema = z.object({
  orderIds: z.array(z.number().int().positive()).min(1),
  status: z.enum(ORDER_STATUS_FLOW).optional(),
  paid: z.boolean().optional(),
  cargoBatchId: z.number().int().positive().nullable().optional(),
});

export const bulkUpdateOrders = asyncHandler(async (req, res) => {
  const body = bulkSchema.parse(req.body);
  const ids = body.orderIds;
  const data = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.paid !== undefined) data.paid = body.paid;
  if (body.cargoBatchId !== undefined) data.cargoBatchId = body.cargoBatchId;
  if (!Object.keys(data).length) throw new ApiError(400, 'Nothing to update');

  // Only paid orders can be set to Confirmed.
  if (body.status === 'confirmed' && body.paid !== true) {
    const unpaid = body.paid === false ? ids.length : await prisma.order.count({ where: { orderId: { in: ids }, paid: false } });
    if (unpaid > 0) throw new ApiError(400, `${NEEDS_PAYMENT} (${unpaid} selected order(s) are unpaid)`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({ where: { orderId: { in: ids } }, data });
    if (body.status === undefined && body.paid === true) {
      await tx.order.updateMany({ where: { orderId: { in: ids }, status: 'awaiting_payment' }, data: { status: 'confirmed' } });
    }
    if (body.status === undefined && body.paid === false) {
      await tx.order.updateMany({ where: { orderId: { in: ids }, status: 'confirmed' }, data: { status: 'awaiting_payment' } });
    }
    return result.count;
  });
  res.json({ updated });
});

export const exportOrders = asyncHandler(async (req, res) => {
  const rows = await prisma.order.findMany({
    where: buildWhere(req.query),
    orderBy: { createdDatetime: 'desc' },
    include: { cargoBatch: { select: { cargoBatchCode: true } }, items: true },
  });
  await sendExport(res, {
    format: req.query.format === 'xlsx' ? 'xlsx' : 'csv',
    filename: `orders-${new Date().toISOString().slice(0, 10)}`,
    columns: [
      { key: 'orderId', header: 'Order ID' },
      { key: 'customerName', header: 'Customer' },
      { key: 'customerPhone', header: 'Phone' },
      { key: 'customerAddress', header: 'Address' },
      { key: 'products', header: 'Products' },
      { key: 'units', header: 'Units' },
      { key: 'totalAmount', header: 'Total' },
      { key: 'paid', header: 'Paid' },
      { key: 'status', header: 'Status' },
      { key: 'trackingNumber', header: 'Tracking #' },
      { key: 'cargoBatch', header: 'Cargo Batch' },
      { key: 'createdDatetime', header: 'Created' },
    ],
    rows: rows.map((o) => ({
      orderId: o.orderId,
      customerName: o.customerName,
      customerPhone: o.customerPhone || '',
      customerAddress: o.customerAddress || '',
      products: o.items.map((i) => `${lineLabel(i.productName, i.color, i.size)} x${i.quantity}`).join('; '),
      units: o.items.reduce((s, i) => s + i.quantity, 0),
      totalAmount: Number(o.totalAmount),
      paid: o.paid ? 'yes' : 'no',
      status: o.status,
      trackingNumber: o.trackingNumber || '',
      cargoBatch: o.cargoBatch?.cargoBatchCode || '',
      createdDatetime: o.createdDatetime.toISOString(),
    })),
  });
});

// ---------- Shopping list: what still has to be bought ----------
// Only `confirmed` orders (payment confirmed, product NOT bought yet). Awaiting payment,
// Pending (Bangkok, already bought) and every later status are left out.
const normName = (n) => String(n).trim().replace(/\s+/g, ' ').toLowerCase();

async function buildToBuy() {
  const [orders, catalogue] = await Promise.all([
    prisma.order.findMany({
      where: { status: 'confirmed' },
      orderBy: { createdDatetime: 'asc' },
      include: { items: { orderBy: { orderItemId: 'asc' } } },
    }),
    prisma.product.findMany({ where: { imageUrl: { not: null } }, select: { name: true, imageUrl: true } }),
  ]);
  const images = new Map(catalogue.map((p) => [normName(p.name), p.imageUrl]));

  const groups = new Map();
  for (const o of orders) {
    for (const it of o.items) {
      // Group on the full label, so an older order whose name already says "Jeans (Blue, L)"
      // adds up with a newer one that has name "Jeans", colour "Blue", size "L".
      const key = normName(lineLabel(it.productName, it.color, it.size));
      if (!groups.has(key)) {
        groups.set(key, {
          name: it.productName.trim(),
          color: it.color ?? null,
          size: it.size ?? null,
          quantity: 0,
          orders: [],
          imageUrl: images.get(normName(it.productName)) ?? images.get(key) ?? null,
        });
      }
      const g = groups.get(key);
      g.quantity += it.quantity;
      g.orders.push({ orderId: o.orderId, customerName: o.customerName, quantity: it.quantity });
    }
  }
  const products = [...groups.values()]
    .sort((a, b) => lineLabel(a.name, a.color, a.size).localeCompare(lineLabel(b.name, b.color, b.size)))
    .map((g) => ({ ...g, orderCount: new Set(g.orders.map((x) => x.orderId)).size }));

  return {
    summary: {
      orderCount: orders.length,
      productCount: products.length,
      totalUnits: products.reduce((s, p) => s + p.quantity, 0),
    },
    products,
    orders: orders.map((o) => ({
      orderId: o.orderId,
      customerName: o.customerName,
      note: o.note,
      createdDatetime: o.createdDatetime,
      items: o.items.map((i) => ({ productName: i.productName, color: i.color, size: i.size, quantity: i.quantity })),
    })),
  };
}

export const getToBuy = asyncHandler(async (_req, res) => {
  res.json(await buildToBuy());
});

export const exportToBuy = asyncHandler(async (req, res) => {
  const { products } = await buildToBuy();
  await sendExport(res, {
    format: req.query.format === 'xlsx' ? 'xlsx' : 'csv',
    filename: `to-buy-${new Date().toISOString().slice(0, 10)}`,
    columns: [
      { key: 'name', header: 'Product' },
      { key: 'color', header: 'Color' },
      { key: 'size', header: 'Size' },
      { key: 'quantity', header: 'Qty to buy' },
      { key: 'orders', header: 'Needed for orders' },
    ],
    rows: products.map((p) => ({
      name: p.name,
      color: p.color || '',
      size: p.size || '',
      quantity: p.quantity,
      orders: p.orders.map((o) => `#${o.orderId} ${o.customerName} x${o.quantity}`).join('; '),
    })),
  });
});
