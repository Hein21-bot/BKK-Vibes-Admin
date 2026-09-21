import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ApiError } from '../lib/asyncHandler.js';
import { parsePagination, paginated } from '../utils/pagination.js';
import { randomVoucherNo } from '../utils/voucherNo.js';
import { syncVoucherToOrder, detachVoucherFromOrder } from '../utils/voucherSync.js';
import { recalcOrderTotal } from '../utils/orderTotals.js';

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
  unitPrice: z.number().nonnegative(),
});

const voucherSchema = z.object({
  orderId: z.number().int().positive().nullable().optional(),
  customerName: z.string().min(1),
  voucherDate: z.string().optional(),
  discountAmount: z.number().nonnegative().optional(),
  // On create only: also make an order (awaiting payment) with the same customer and products, linked to this voucher.
  createOrder: z.boolean().optional(),
  items: z.array(itemSchema).min(1),
});

async function assertOrderExists(orderId) {
  if (orderId == null) return;
  const order = await prisma.order.findUnique({ where: { orderId }, select: { orderId: true } });
  if (!order) throw new ApiError(400, `Order #${orderId} does not exist`);
}

const round2 = (n) => Number(n.toFixed(2));

// Server is the source of truth for the arithmetic.
function computeTotals(items, discountAmount = 0) {
  const lines = items.map((i) => ({
    productName: i.productName,
    color: i.color ?? null,
    size: i.size ?? null,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    amount: round2(i.quantity * i.unitPrice),
  }));
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  if (discountAmount > subtotal) {
    throw new ApiError(400, 'Discount cannot be greater than the subtotal');
  }
  return { lines, subtotal, discountAmount, totalAmount: round2(subtotal - discountAmount) };
}

const serialize = (v) => ({
  ...v,
  subtotal: Number(v.subtotal),
  discountAmount: Number(v.discountAmount),
  totalAmount: Number(v.totalAmount),
  items: v.items?.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), amount: Number(i.amount) })),
});

export const listVouchers = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const where = {};
  if (req.query.orderId) where.orderId = Number(req.query.orderId);
  if (req.query.search) {
    const s = String(req.query.search).trim();
    where.OR = [
      { voucherNo: { contains: s, mode: 'insensitive' } },
      { customerName: { contains: s, mode: 'insensitive' } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      skip,
      take,
      orderBy: [{ voucherDate: 'desc' }, { voucherId: 'desc' }],
      include: { _count: { select: { items: true } }, order: { select: { orderId: true } } },
    }),
    prisma.voucher.count({ where }),
  ]);
  res.json(
    paginated(
      rows.map(({ _count, ...v }) => ({ ...serialize(v), itemCount: _count.items })),
      total,
      page,
      pageSize,
    ),
  );
});

export const getVoucher = asyncHandler(async (req, res) => {
  const voucher = await prisma.voucher.findUnique({
    where: { voucherId: Number(req.params.id) },
    include: {
      items: { orderBy: { voucherItemId: 'asc' } },
      order: { select: { orderId: true, customerName: true } },
    },
  });
  if (!voucher) throw new ApiError(404, 'Voucher not found');
  res.json(serialize(voucher));
});

export const createVoucher = asyncHandler(async (req, res) => {
  const body = voucherSchema.parse(req.body);
  const { lines, subtotal, discountAmount, totalAmount } = computeTotals(body.items, body.discountAmount ?? 0);
  await assertOrderExists(body.orderId);

  // voucher_no is random and unique; on the (very unlikely) clash, pick another.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const made = await prisma.$transaction(
        async (tx) => {
          const created = await tx.voucher.create({
            data: {
              voucherNo: randomVoucherNo(),
              orderId: body.orderId ?? null,
              customerName: body.customerName,
              voucherDate: body.voucherDate ? new Date(body.voucherDate) : new Date(),
              subtotal,
              discountAmount,
              totalAmount,
              createdBy: req.user.username,
              items: { create: lines },
            },
            include: { items: { orderBy: { voucherItemId: 'asc' } } },
          });
          if (body.orderId) {
            await syncVoucherToOrder(tx, created.voucherId, body.orderId, lines);
            return { voucher: created, orderId: body.orderId, orderCreated: false };
          }
          if (body.createOrder) {
            const order = await tx.order.create({
              data: {
                customerName: body.customerName,
                status: 'awaiting_payment',
                paid: false,
                createdBy: req.user.username,
                items: {
                  create: lines.map((l) => ({
                    voucherId: created.voucherId,
                    productName: l.productName,
                    color: l.color,
                    size: l.size,
                    quantity: l.quantity,
                    unitPrice: l.unitPrice,
                    subtotal: l.amount,
                  })),
                },
              },
            });
            await tx.voucher.update({ where: { voucherId: created.voucherId }, data: { orderId: order.orderId } });
            await recalcOrderTotal(order.orderId, tx);
            return { voucher: { ...created, orderId: order.orderId }, orderId: order.orderId, orderCreated: true };
          }
          return { voucher: created, orderId: null, orderCreated: false };
        },
        { timeout: 20_000 },
      );
      return res
        .status(201)
        .json({ ...serialize(made.voucher), orderSynced: made.orderId, orderCreated: made.orderCreated });
    } catch (e) {
      if (e.code !== 'P2002' || attempt === 4) throw e;
    }
  }
});

export const updateVoucher = asyncHandler(async (req, res) => {
  const voucherId = Number(req.params.id);
  const body = voucherSchema.parse(req.body);
  const current = await prisma.voucher.findUniqueOrThrow({ where: { voucherId } });
  await assertOrderExists(body.orderId);
  // undefined keeps the current link, null clears it.
  const orderId = body.orderId !== undefined ? body.orderId : current.orderId;
  const { lines, subtotal, discountAmount, totalAmount } = computeTotals(body.items, body.discountAmount ?? 0);

  const voucher = await prisma.$transaction(async (tx) => {
    await tx.voucherItem.deleteMany({ where: { voucherId } });
    const updated = await tx.voucher.update({
      where: { voucherId },
      data: {
        // null clears the link; leaving orderId out keeps the current one.
        ...(body.orderId !== undefined ? { orderId: body.orderId } : {}),
        customerName: body.customerName,
        ...(body.voucherDate ? { voucherDate: new Date(body.voucherDate) } : {}),
        subtotal,
        discountAmount,
        totalAmount,
        items: { create: lines },
      },
      include: { items: { orderBy: { voucherItemId: 'asc' } } },
    });
    // Keep the order's product lines in step with this voucher.
    if (current.orderId && current.orderId !== orderId) await detachVoucherFromOrder(tx, voucherId, current.orderId);
    if (orderId) await syncVoucherToOrder(tx, voucherId, orderId, lines);
    return updated;
  }, { timeout: 20_000 });
  res.json({ ...serialize(voucher), orderSynced: orderId ?? null });
});

export const deleteVoucher = asyncHandler(async (req, res) => {
  const voucherId = Number(req.params.id);
  await prisma.voucher.delete({ where: { voucherId } });
  res.json({ id: voucherId, deleted: true });
});
