import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/pricingController.js';

const r = Router();
r.use(authenticate);

r.get('/', c.getAll);
r.put('/:key', c.putOne);
r.delete('/', c.resetAll);

export default r;
