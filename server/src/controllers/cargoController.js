import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ApiError } from '../lib/asyncHandler.js';
import { parsePagination, paginated } from '../utils/pagination.js';
import { sendExport } from '../utils/export.js';

const CARGO_STATUS = ['pending', 'in_transit', 'arrived', 'completed'];

const cargoSchema = z.object({
  cargoBatchCode: z.string().min(1).optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  weight: z.number().nonnegative().optional(),
  cargoRate: z.number().nonnegative().optional(),
  status: z.enum(CARGO_STATUS).optional(),
  note: z.string().optional().nullable(),
  departureDate: z.string().datetime().optional().nullable(),
  arrivalDate: z.string().datetime().optional().nullable(),
});

async function nextBatchCode() {
  const year = new Date().getFullYear();
  const prefix = `CB-${year}-`;
  const last = await prisma.cargoBatch.findFirst({
    where: { cargoBatchCode: { startsWith: prefix } },
    orderBy: { cargoBatchCode: 'desc' },
  });
  const n = last ? parseInt(last.cargoBatchCode.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(n).padStart(3, '0')}`;
}

const num = (v) => Number(v ?? 0);
const serialize = (c) => ({
  ...c,
  weight: num(c.weight),
  cargoRate: num(c.cargoRate),
  totalPrice: num(c.totalPrice),
  productCostThb: num(c.productCostThb),
  fxRate: c.fxRate == null ? null : num(c.fxRate),
});

export const listCargo = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const where = {};
  if (req.query.status) where.status = { in: String(req.query.status).split(',') };
  if (req.query.search) {
    where.OR = [
      { cargoBatchCode: { contains: req.query.search, mode: 'insensitive' } },
      { origin: { contains: req.query.search, mode: 'insensitive' } },
      { destination: { contains: req.query.search, mode: 'insensitive' } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.cargoBatch.findMany({
      where,
      skip,
      take,
      orderBy: { createdDatetime: 'desc' },
      include: { _count: { select: { orders: true } } },
    }),
    prisma.cargoBatch.count({ where }),
  ]);
  res.json(
    paginated(
      rows.map((c) => ({ ...serialize(c), orderCount: c._count.orders })),
      total,
      page,
      pageSize,
    ),
  );
});

export const getCargo = asyncHandler(async (req, res) => {
  const cargoId = Number(req.params.id);
  const cargo = await prisma.cargoBatch.findUnique({
    where: { cargoId },
    include: {
      orders: {
        orderBy: { orderId: 'asc' },
        include: { items: { select: { quantity: true } } },
      },
      expenses: { orderBy: { expenseDate: 'desc' } },
    },
  });
  if (!cargo) throw new ApiError(404, 'Cargo batch not found');
  res.json({
    ...serialize(cargo),
    orders: cargo.orders.map((o) => ({
      orderId: o.orderId,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      status: o.status,
      paid: o.paid,
      totalAmount: Number(o.totalAmount),
      trackingNumber: o.trackingNumber,
      units: o.items.reduce((s, i) => s + i.quantity, 0),
    })),
    expenses: cargo.expenses.map((e) => ({
      expenseId: e.expenseId,
      title: e.title,
      category: e.category,
      amount: Number(e.amount),
      expenseDate: e.expenseDate,
      paid: e.paid,
      note: e.note,
    })),
  });
});

const computeTotal = (weight, rate) => Number((num(weight) * num(rate)).toFixed(2));

export const createCargo = asyncHandler(async (req, res) => {
  const body = cargoSchema.parse(req.body);
  const cargo = await prisma.cargoBatch.create({
    data: {
      cargoBatchCode: body.cargoBatchCode || (await nextBatchCode()),
      origin: body.origin || 'Bangkok',
      destination: body.destination || 'Mandalay',
      weight: body.weight ?? 0,
      cargoRate: body.cargoRate ?? 0,
      totalPrice: computeTotal(body.weight, body.cargoRate),
      status: body.status ?? 'pending',
      note: body.note ?? null,
      departureDate: body.departureDate ? new Date(body.departureDate) : null,
      arrivalDate: body.arrivalDate ? new Date(body.arrivalDate) : null,
      createdBy: req.user.username,
    },
  });
  res.status(201).json({ ...serialize(cargo), id: cargo.cargoId });
});

export const updateCargo = asyncHandler(async (req, res) => {
  const cargoId = Number(req.params.id);
  const body = cargoSchema.parse(req.body);
  const current = await prisma.cargoBatch.findUniqueOrThrow({ where: { cargoId } });

  const data = {};
  for (const k of ['cargoBatchCode', 'origin', 'destination', 'weight', 'cargoRate', 'status', 'note']) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.weight !== undefined || body.cargoRate !== undefined) {
    data.totalPrice = computeTotal(body.weight ?? current.weight, body.cargoRate ?? current.cargoRate);
  }
  if (body.departureDate !== undefined) data.departureDate = body.departureDate ? new Date(body.departureDate) : null;
  if (body.arrivalDate !== undefined) data.arrivalDate = body.arrivalDate ? new Date(body.arrivalDate) : null;

  const cargo = await prisma.cargoBatch.update({ where: { cargoId }, data });

  // Keep linked orders roughly in step with the batch.
  if (body.status === 'in_transit') {
    await prisma.order.updateMany({
      where: { cargoBatchId: cargoId, status: { in: ['awaiting_payment', 'confirmed', 'pending'] } },
      data: { status: 'in_cargo' },
    });
  } else if (body.status === 'arrived') {
    await prisma.order.updateMany({
      where: { cargoBatchId: cargoId, status: { in: ['awaiting_payment', 'confirmed', 'pending', 'in_cargo'] } },
      data: { status: 'arrived' },
    });
  }
  res.json({ ...serialize(cargo), id: cargo.cargoId });
});

export const deleteCargo = asyncHandler(async (req, res) => {
  const cargoId = Number(req.params.id);
  await prisma.cargoBatch.delete({ where: { cargoId } });
  res.json({ id: cargoId, deleted: true });
});

// Attach / detach orders to a batch (bulk).
const linkSchema = z.object({ orderIds: z.array(z.number().int().positive()).min(1) });

export const addOrdersToCargo = asyncHandler(async (req, res) => {
  const cargoId = Number(req.params.id);
  const { orderIds } = linkSchema.parse(req.body);
  await prisma.cargoBatch.findUniqueOrThrow({ where: { cargoId } });
  const r = await prisma.order.updateMany({
    where: { orderId: { in: orderIds } },
    data: { cargoBatchId: cargoId, status: 'in_cargo' },
  });
  res.json({ added: r.count });
});

export const removeOrdersFromCargo = asyncHandler(async (req, res) => {
  const { orderIds } = linkSchema.parse(req.body);
  // An order that was loaded for cargo is physically in our hands in Bangkok, so taking it
  // out of the batch puts it back to "pending" (Bangkok).
  const r = await prisma.order.updateMany({
    where: { orderId: { in: orderIds }, cargoBatchId: Number(req.params.id) },
    data: { cargoBatchId: null, status: 'pending' },
  });
  res.json({ removed: r.count });
});

// Attach / detach expenses to a batch (bulk) — same shape as orders above. An expense linked to a
// batch counts toward that batch's cost on the Batch Profit page.
const expenseLinkSchema = z.object({ expenseIds: z.array(z.number().int().positive()).min(1) });

export const addExpensesToCargo = asyncHandler(async (req, res) => {
  const cargoId = Number(req.params.id);
  const { expenseIds } = expenseLinkSchema.parse(req.body);
  await prisma.cargoBatch.findUniqueOrThrow({ where: { cargoId } });
  const r = await prisma.expense.updateMany({
    where: { expenseId: { in: expenseIds } },
    data: { cargoBatchId: cargoId },
  });
  res.json({ added: r.count });
});

export const removeExpensesFromCargo = asyncHandler(async (req, res) => {
  const { expenseIds } = expenseLinkSchema.parse(req.body);
  const r = await prisma.expense.updateMany({
    where: { expenseId: { in: expenseIds }, cargoBatchId: Number(req.params.id) },
    data: { cargoBatchId: null },
  });
  res.json({ removed: r.count });
});

export const exportCargo = asyncHandler(async (req, res) => {
  const rows = await prisma.cargoBatch.findMany({
    orderBy: { createdDatetime: 'desc' },
    include: { _count: { select: { orders: true } } },
  });
  await sendExport(res, {
    format: req.query.format === 'xlsx' ? 'xlsx' : 'csv',
    filename: `cargo-batches-${new Date().toISOString().slice(0, 10)}`,
    columns: [
      { key: 'cargoBatchCode', header: 'Batch Code' },
      { key: 'status', header: 'Status' },
      { key: 'origin', header: 'Origin' },
      { key: 'destination', header: 'Destination' },
      { key: 'weight', header: 'Weight (kg)' },
      { key: 'cargoRate', header: 'Rate (THB per kg)' },
      { key: 'totalPrice', header: 'Total Price (THB)' },
      { key: 'orderCount', header: 'Orders' },
      { key: 'departureDate', header: 'Departure' },
      { key: 'arrivalDate', header: 'Arrival' },
    ],
    rows: rows.map((c) => ({
      cargoBatchCode: c.cargoBatchCode,
      status: c.status,
      origin: c.origin,
      destination: c.destination,
      weight: num(c.weight),
      cargoRate: num(c.cargoRate),
      totalPrice: num(c.totalPrice),
      orderCount: c._count.orders,
      departureDate: c.departureDate?.toISOString() || '',
      arrivalDate: c.arrivalDate?.toISOString() || '',
    })),
  });
});
