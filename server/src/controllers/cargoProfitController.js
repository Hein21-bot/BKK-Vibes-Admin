import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ApiError } from '../lib/asyncHandler.js';

// Same default as the Price Calculator (DEFAULT_ASSUMPTIONS.fx): MMK per 1 THB.
const FALLBACK_FX = 133;

const num = (v) => Number(v ?? 0);
const round2 = (n) => Number(n.toFixed(2));

async function defaultFx() {
  const row = await prisma.pricingSetting.findUnique({ where: { key: 'assumptions' } });
  const fx = Number(row?.value?.fx);
  return Number.isFinite(fx) && fx > 0 ? fx : FALLBACK_FX;
}

// Profit of one batch:
//   revenue   = sum of its orders' totals (MMK)
//   cost      = (product cost THB + cargo fee THB) x fx + linked expenses (already MMK)
//   profit    = revenue - cost
function profitRow(b, fallbackFx) {
  const revenue = b.orders.reduce((s, o) => s + num(o.totalAmount), 0);
  const unpaid = b.orders.filter((o) => !o.paid);
  const expenses = b.expenses ?? [];
  const expensesMmk = expenses.reduce((s, e) => s + num(e.amount), 0);
  const unpaidExpenses = expenses.filter((e) => !e.paid);
  const productCostThb = num(b.productCostThb);
  const cargoFeeThb = num(b.totalPrice);
  const fxUsed = b.fxRate != null ? num(b.fxRate) : fallbackFx;
  const costThb = productCostThb + cargoFeeThb;
  const costMmk = costThb * fxUsed + expensesMmk;
  const profit = revenue - costMmk;
  return {
    cargoId: b.cargoId,
    cargoBatchCode: b.cargoBatchCode,
    status: b.status,
    weight: num(b.weight),
    orderCount: b.orders.length,
    unpaidCount: unpaid.length,
    revenue: round2(revenue),
    productCostThb,
    cargoFeeThb,
    fxRate: b.fxRate != null ? num(b.fxRate) : null, // null = using the default
    fxUsed,
    expenseCount: expenses.length,
    expensesMmk: round2(expensesMmk),
    unpaidExpenseCount: unpaidExpenses.length,
    costThb: round2(costThb),
    costMmk: round2(costMmk),
    profit: round2(profit),
    marginPct: revenue > 0 ? round2((profit / revenue) * 100) : null,
    // Without a product cost the profit is only "revenue minus cargo fee" and looks better than it is.
    costMissing: productCostThb === 0 && b.orders.length > 0,
  };
}

const expensesInclude = { expenses: { select: { amount: true, paid: true } } };

// GET /api/cargo/profit
export const listProfit = asyncHandler(async (_req, res) => {
  const fallbackFx = await defaultFx();
  const batches = await prisma.cargoBatch.findMany({
    orderBy: { createdDatetime: 'desc' },
    include: { orders: { select: { totalAmount: true, paid: true } }, ...expensesInclude },
  });
  const rows = batches.map((b) => profitRow(b, fallbackFx));
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const costMmk = rows.reduce((s, r) => s + r.costMmk, 0);
  const profit = revenue - costMmk;
  res.json({
    defaultFx: fallbackFx,
    rows,
    totals: {
      revenue: round2(revenue),
      costMmk: round2(costMmk),
      profit: round2(profit),
      marginPct: revenue > 0 ? round2((profit / revenue) * 100) : null,
      missingCount: rows.filter((r) => r.costMissing).length,
    },
  });
});

const costsSchema = z.object({
  productCostThb: z.number().nonnegative(),
  fxRate: z.number().positive().nullable().optional(),
});

// PUT /api/cargo/:id/costs  { productCostThb, fxRate | null }
export const updateCosts = asyncHandler(async (req, res) => {
  const cargoId = Number(req.params.id);
  const body = costsSchema.parse(req.body);
  const exists = await prisma.cargoBatch.findUnique({ where: { cargoId }, select: { cargoId: true } });
  if (!exists) throw new ApiError(404, 'Cargo batch not found');
  const batch = await prisma.cargoBatch.update({
    where: { cargoId },
    data: { productCostThb: body.productCostThb, fxRate: body.fxRate ?? null },
    include: { orders: { select: { totalAmount: true, paid: true } }, ...expensesInclude },
  });
  res.json(profitRow(batch, await defaultFx()));
});
