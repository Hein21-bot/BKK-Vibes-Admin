import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/cargoController.js';

const r = Router();
r.use(authenticate);

r.get('/', c.listCargo);
r.get('/export', c.exportCargo);
r.get('/:id', c.getCargo);
r.post('/', c.createCargo);
r.put('/:id', c.updateCargo);
r.delete('/:id', c.deleteCargo);
r.post('/:id/orders', c.addOrdersToCargo);
r.delete('/:id/orders', c.removeOrdersFromCargo);

export default r;
