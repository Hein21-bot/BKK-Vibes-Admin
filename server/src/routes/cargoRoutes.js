import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/cargoController.js';
import * as profit from '../controllers/cargoProfitController.js';

const r = Router();
r.use(authenticate);

r.get('/', c.listCargo);
r.get('/export', c.exportCargo);
r.get('/profit', profit.listProfit); // before /:id
r.put('/:id/costs', profit.updateCosts);
r.get('/:id', c.getCargo);
r.post('/', c.createCargo);
r.put('/:id', c.updateCargo);
r.delete('/:id', c.deleteCargo);
r.post('/:id/orders', c.addOrdersToCargo);
r.delete('/:id/orders', c.removeOrdersFromCargo);

export default r;
