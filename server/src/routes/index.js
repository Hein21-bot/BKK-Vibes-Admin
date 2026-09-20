import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import orderRoutes from './orderRoutes.js';
import cargoRoutes from './cargoRoutes.js';
import expenseRoutes from './expenseRoutes.js';
import voucherRoutes from './voucherRoutes.js';
import pricingRoutes from './pricingRoutes.js';
import productRoutes from './productRoutes.js';

const api = Router();

// Health check + keep-alive target. Runs a trivial query so pinging this
// endpoint also keeps the (Neon) database warm. Always 200 so a slow/cold
// database does not make the platform restart the service.
api.get('/health', async (_req, res) => {
  let db = 'error';
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'ok';
  } catch {
    /* keep db = 'error' */
  }
  res.json({ status: 'ok', db, time: new Date().toISOString() });
});

api.use('/auth', authRoutes);
api.use('/dashboard', dashboardRoutes);
api.use('/orders', orderRoutes);
api.use('/cargo', cargoRoutes);
api.use('/expenses', expenseRoutes);
api.use('/vouchers', voucherRoutes);
api.use('/pricing', pricingRoutes);
api.use('/products', productRoutes);

export default api;
