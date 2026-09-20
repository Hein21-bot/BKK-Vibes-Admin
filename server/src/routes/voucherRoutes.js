import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/voucherController.js';

const r = Router();
r.use(authenticate);

r.get('/', c.listVouchers);
r.get('/:id', c.getVoucher);
r.post('/', c.createVoucher);
r.put('/:id', c.updateVoucher);
r.delete('/:id', c.deleteVoucher);

export default r;
