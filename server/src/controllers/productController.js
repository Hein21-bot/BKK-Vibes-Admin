import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ApiError } from '../lib/asyncHandler.js';
import { parsePagination, paginated } from '../utils/pagination.js';

const MAX_IMAGE_CHARS = 400_000; // the client shrinks images to ~40 KB; this is a safety net

const imageSchema = z
  .string()
  .refine((v) => v.startsWith('data:image/'), 'Image must be an image data URL')
  .refine((v) => v.length <= MAX_IMAGE_CHARS, 'Image is too large')
  .nullable();

const productSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().optional().nullable(),
  price: z.coerce.number().nonnegative(),
  stockQty: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  imageUrl: imageSchema.optional(),
});

const serialize = (p) => ({ ...p, price: Number(p.price) });

export const listProducts = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.category) where.category = req.query.category;
  if (req.query.search) {
    where.OR = [
      { name: { contains: String(req.query.search), mode: 'insensitive' } },
      { category: { contains: String(req.query.search), mode: 'insensitive' } },
    ];
  }
  const [rows, total, categories] = await Promise.all([
    prisma.product.findMany({ where, skip, take, orderBy: { productId: 'desc' } }),
    prisma.product.count({ where }),
    prisma.product.findMany({ distinct: ['category'], select: { category: true }, where: { category: { not: null } } }),
  ]);
  res.json({
    ...paginated(rows.map(serialize), total, page, pageSize),
    categories: categories.map((c) => c.category).filter(Boolean).sort(),
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({ where: { productId: Number(req.params.id) } });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(serialize(product));
});

export const createProduct = asyncHandler(async (req, res) => {
  const body = productSchema.parse(req.body);
  const product = await prisma.product.create({
    data: {
      name: body.name,
      category: body.category || null,
      price: body.price,
      stockQty: body.stockQty ?? 0,
      status: body.status ?? 'active',
      imageUrl: body.imageUrl ?? null,
    },
  });
  res.status(201).json({ ...serialize(product), id: product.productId });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const body = productSchema.partial().parse(req.body);
  const data = {};
  for (const k of ['name', 'price', 'stockQty', 'status', 'imageUrl']) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.category !== undefined) data.category = body.category || null;
  const product = await prisma.product.update({ where: { productId }, data });
  res.json({ ...serialize(product), id: product.productId });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  await prisma.product.delete({ where: { productId } });
  res.json({ id: productId, deleted: true });
});
