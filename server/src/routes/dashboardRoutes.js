import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { summary } from '../controllers/dashboardController.js';

const r = Router();
r.get('/summary', authenticate, summary);
export default r;
