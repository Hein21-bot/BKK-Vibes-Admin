import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const ORDER_STATUSES = ['awaiting_payment', 'confirmed', 'pending', 'in_cargo', 'arrived', 'delivering', 'delivered'];

export const summary = asyncHandler(async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    todayOrders,
    totalOrders,
    statusGroups,
    unpaidCount,
    activeCargo,
    revenueAgg,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count({ where: { createdDatetime: { gte: startOfDay } } }),
    prisma.order.count(),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.count({ where: { paid: false } }),
    prisma.cargoBatch.count({ where: { status: { in: ['pending', 'in_transit'] } } }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { paid: true } }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdDatetime: 'desc' },
      include: { cargoBatch: { select: { cargoBatchCode: true } } },
    }),
  ]);

  const statusMap = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]));
  const byStatus = ORDER_STATUSES.map((s) => ({ status: s, count: statusMap[s] || 0 }));

  res.json({
    todayOrderCount: todayOrders,
    totalOrderCount: totalOrders,
    inCargoCount: statusMap.in_cargo || 0,
    toDeliverCount: (statusMap.arrived || 0) + (statusMap.delivering || 0),
    deliveredCount: statusMap.delivered || 0,
    unpaidCount,
    activeCargoCount: activeCargo,
    paidRevenue: Number(revenueAgg._sum.totalAmount || 0),
    orderStatusSummary: byStatus,
    recentOrders: recentOrders.map((o) => ({
      orderId: o.orderId,
      customerName: o.customerName,
      status: o.status,
      paid: o.paid,
      totalAmount: Number(o.totalAmount),
      cargoBatchCode: o.cargoBatch?.cargoBatchCode || null,
      createdDatetime: o.createdDatetime,
    })),
  });
});
