import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ApiError } from '../lib/asyncHandler.js';

// Which settings exist and what shape each must have.
const SHAPES = {
  assumptions: 'object',
  priceCalc: 'object',
  tiers: 'array',
  weightPresets: 'array',
  marketRef: 'array',
  batchRows: 'array',
  exchange: 'object', // THB <-> MMK converter rates
};

const bodySchema = z.object({ value: z.any() });

// GET /api/pricing -> { settings: { assumptions: {...}, tiers: [...], ... } }
export const getAll = asyncHandler(async (_req, res) => {
  const rows = await prisma.pricingSetting.findMany();
  res.json({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
});

// PUT /api/pricing/:key  { value }
export const putOne = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const shape = SHAPES[key];
  if (!shape) throw new ApiError(404, `Unknown pricing setting "${key}"`);

  const { value } = bodySchema.parse(req.body);
  const ok = shape === 'array' ? Array.isArray(value) : value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!ok) throw new ApiError(400, `"${key}" must be ${shape === 'array' ? 'an array' : 'an object'}`);

  const row = await prisma.pricingSetting.upsert({
    where: { key },
    create: { key, value, updatedBy: req.user.username },
    update: { value, updatedBy: req.user.username },
  });
  res.json({ key: row.key, updatedDatetime: row.updatedDatetime });
});

// DELETE /api/pricing -> back to the built-in defaults
export const resetAll = asyncHandler(async (_req, res) => {
  const r = await prisma.pricingSetting.deleteMany();
  res.json({ reset: r.count });
});
