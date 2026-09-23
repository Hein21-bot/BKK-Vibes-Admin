import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { parsePagination, paginated } from '../utils/pagination.js';
import { sendExport } from '../utils/export.js';

const CATEGORIES = [
  'transportation',
  'cargo',
  'packaging',
  'supplies',
  'salary',
  'rent',
  'utilities',
  'other',
];

const expenseSchema = z.object({
  title: z.string().min(1),
  category: z.enum(CATEGORIES).optional(),
  amount: z.coerce.number().nonnegative(),
  expenseDate: z.string().optional(),
  paid: z.boolean().optional(),
  note: z.string().optional().nullable(),
});

function buildWhere(q) {
  const where = {};
  if (q.category) where.category = { in: String(q.category).split(',') };
  if (q.paid === 'true') where.paid = true;
  if (q.paid === 'false') where.paid = false;
  if (q.unassigned === 'true') where.cargoBatchId = null;
  if (q.cargoBatchId) where.cargoBatchId = Number(q.cargoBatchId);
  if (q.dateFrom || q.dateTo) {
    where.expenseDate = {};
    if (q.dateFrom) where.expenseDate.gte = new Date(q.dateFrom);
    if (q.dateTo) {
      const to = new Date(q.dateTo);
      to.setHours(23, 59, 59, 999);
      where.expenseDate.lte = to;
    }
  }
  if (q.search) {
    const s = String(q.search).trim();
    where.OR = [
      { title: { contains: s, mode: 'insensitive' } },
      { note: { contains: s, mode: 'insensitive' } },
    ];
  }
  return where;
}

const serialize = (e) => ({
  ...e,
  amount: Number(e.amount),
  cargoBatchCode: e.cargoBatch?.cargoBatchCode ?? null,
  cargoBatch: undefined,
});

export const listExpenses = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const where = buildWhere(req.query);
  const [rows, total, totals, paidAgg] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take,
      orderBy: { expenseDate: 'desc' },
      include: { cargoBatch: { select: { cargoBatchCode: true } } },
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ _sum: { amount: true }, where }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { ...where, paid: true } }),
  ]);

  const totalAmount = Number(totals._sum.amount || 0);
  const paidAmount = Number(paidAgg._sum.amount || 0);

  res.json({
    ...paginated(rows.map(serialize), total, page, pageSize),
    summary: { totalAmount, paidAmount, unpaidAmount: totalAmount - paidAmount },
  });
});

export const createExpense = asyncHandler(async (req, res) => {
  const body = expenseSchema.parse(req.body);
  const expense = await prisma.expense.create({
    data: {
      title: body.title,
      category: body.category ?? 'other',
      amount: body.amount,
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
      paid: body.paid ?? false,
      note: body.note ?? null,
      createdBy: req.user.username,
    },
  });
  res.status(201).json({ ...serialize(expense), id: expense.expenseId });
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expenseId = Number(req.params.id);
  const body = expenseSchema.partial().parse(req.body);
  const data = {};
  for (const k of ['title', 'category', 'amount', 'paid', 'note']) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.expenseDate !== undefined) data.expenseDate = new Date(body.expenseDate);
  const expense = await prisma.expense.update({ where: { expenseId }, data });
  res.json({ ...serialize(expense), id: expense.expenseId });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const expenseId = Number(req.params.id);
  await prisma.expense.delete({ where: { expenseId } });
  res.json({ id: expenseId, deleted: true });
});

export const exportExpenses = asyncHandler(async (req, res) => {
  const rows = await prisma.expense.findMany({
    where: buildWhere(req.query),
    orderBy: { expenseDate: 'desc' },
    include: { cargoBatch: { select: { cargoBatchCode: true } } },
  });
  await sendExport(res, {
    format: req.query.format === 'xlsx' ? 'xlsx' : 'csv',
    filename: `expenses-${new Date().toISOString().slice(0, 10)}`,
    columns: [
      { key: 'expenseId', header: 'ID' },
      { key: 'expenseDate', header: 'Date' },
      { key: 'title', header: 'Title' },
      { key: 'category', header: 'Category' },
      { key: 'amount', header: 'Amount' },
      { key: 'paid', header: 'Paid' },
      { key: 'cargoBatchCode', header: 'Cargo Batch' },
      { key: 'note', header: 'Note' },
    ],
    rows: rows.map((e) => ({
      expenseId: e.expenseId,
      expenseDate: e.expenseDate.toISOString(),
      title: e.title,
      category: e.category,
      cargoBatchCode: e.cargoBatch?.cargoBatchCode || '',
      amount: Number(e.amount),
      paid: e.paid ? 'yes' : 'no',
      note: e.note || '',
    })),
  });
});
