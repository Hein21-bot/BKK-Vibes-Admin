import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/productController.js';

const r = Router();
r.use(authenticate);

r.get('/', c.listProducts);
r.get('/:id', c.getProduct);
r.post('/', c.createProduct);
r.put('/:id', c.updateProduct);
r.delete('/:id', c.deleteProduct);

export default r;
