import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/orderController.js';

const r = Router();
r.use(authenticate);

r.get('/', c.listOrders);
r.get('/export', c.exportOrders);
r.get('/to-buy', c.getToBuy);
r.get('/to-buy/export', c.exportToBuy);
r.get('/:id', c.getOrder);
r.post('/', c.createOrder);
r.patch('/bulk', c.bulkUpdateOrders);
r.put('/:id', c.updateOrder);
r.delete('/:id', c.deleteOrder);

export default r;
