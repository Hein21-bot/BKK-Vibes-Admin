import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/expenseController.js';

const r = Router();
r.use(authenticate);

r.get('/', c.listExpenses);
r.get('/export', c.exportExpenses);
r.post('/', c.createExpense);
r.put('/:id', c.updateExpense);
r.delete('/:id', c.deleteExpense);

export default r;
