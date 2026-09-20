import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { asyncHandler, ApiError } from '../lib/asyncHandler.js';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const publicUser = (u) => ({ userId: u.userId, username: u.username, role: u.role });

export const login = asyncHandler(async (req, res) => {
  const { username, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid username or password');
  }
  await prisma.user.update({ where: { userId: user.userId }, data: { lastLogin: new Date() } });
  const token = signToken({ userId: user.userId, username: user.username, role: user.role });
  res.json({ token, user: publicUser(user) });
});

export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { userId: req.user.userId } });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user: publicUser(user) });
});
