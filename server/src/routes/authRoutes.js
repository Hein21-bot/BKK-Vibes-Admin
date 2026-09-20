import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/authController.js';

const r = Router();
r.post('/login', c.login);
r.get('/me', authenticate, c.me);
export default r;
