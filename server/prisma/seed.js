import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { randomVoucherNo } from '../src/utils/voucherNo.js';

const prisma = new PrismaClient();

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

const NAMES = ['Aung Aung', 'Su Su Hlaing', 'Mya Thandar', 'Ko Ko Naing', 'Hla Hla Win', 'Zaw Min Tun', 'Ei Ei Phyo', 'Kyaw Swar'];
const PHONES = ['09 250 111 222', '09 795 333 444', '09 421 555 666', '09 966 777 888', '09 340 999 000'];
const ADDR = ['84th St, between 30-31, Mandalay', 'Chan Aye Thar Zan, Mandalay', 'Maha Aung Myay, Mandalay', 'Pyigyidagun, Mandalay', 'Amarapura, Mandalay'];
const PRODUCTS = [
  ['Wireless Earbuds', 45000],
  ['Phone Case', 8000],
  ['Power Bank 10000mAh', 32000],
  ['Cotton T-Shirt', 15000],
  ['Sneakers', 78000],
  ['Skincare Set', 55000],
  ['Handbag', 62000],
  ['Coffee Beans 1kg', 24000],
];

async function main() {
  console.log('Seeding…');

  for (const u of [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'staff', password: 'staff123', role: 'staff' },
  ]) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { username: u.username, role: u.role, passwordHash: await bcrypt.hash(u.password, 10) },
    });
  }

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cargoBatch.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.product.deleteMany();

  // Sample products
  await prisma.product.createMany({
    data: [
      { name: 'Uniqlo AIRism Tee', category: 'Clothing', price: 45000, stockQty: 0 },
      { name: 'Denim Jacket', category: 'Clothing', price: 80000, stockQty: 2 },
      { name: 'Sneakers', category: 'Footwear', price: 78000, stockQty: 3 },
      { name: 'Skincare Set', category: 'Beauty', price: 55000, stockQty: 12 },
    ],
  });
  await prisma.voucherItem.deleteMany();
  await prisma.voucher.deleteMany();

  // Sample shopping vouchers
  const sampleVouchers = [
    ['Daw Mya', 5000, [['Uniqlo AIRism Tee', 2, 45000, 'Black', 'M'], ['Denim Jacket', 1, 80000, 'Light Blue', 'L']]],
    ['Ko Aung', 0, [['Sneakers', 1, 78000, 'White', '42']]],
  ];
  for (let i = 0; i < sampleVouchers.length; i++) {
    const [customerName, discountAmount, lines] = sampleVouchers[i];
    const items = lines.map(([productName, quantity, unitPrice, color, size]) => ({
      productName,
      color,
      size,
      quantity,
      unitPrice,
      amount: quantity * unitPrice,
    }));
    const subtotal = items.reduce((s, it) => s + it.amount, 0);
    await prisma.voucher.create({
      data: {
        voucherNo: randomVoucherNo(),
        customerName,
        voucherDate: daysAgo(i * 3),
        subtotal,
        discountAmount,
        totalAmount: subtotal - discountAmount,
        createdBy: 'admin',
        items: { create: items },
      },
    });
  }

  // Expenses (transportation fee, cargo fee, …)
  const expenseData = [
    ['Cargo fee CB-2026-001', 'cargo', 210000, true],
    ['Cargo fee CB-2026-002', 'cargo', 280000, false],
    ['Truck rental Bangkok warehouse', 'transportation', 45000, true],
    ['Motorbike delivery fuel', 'transportation', 18000, true],
    ['Bubble wrap & boxes', 'packaging', 22000, true],
    ['Tape & labels', 'supplies', 8000, false],
    ['Warehouse rent (monthly)', 'rent', 150000, true],
    ['Staff salary', 'salary', 300000, false],
    ['Electricity bill', 'utilities', 26000, true],
    ['Phone top-up', 'other', 10000, true],
  ];
  for (let i = 0; i < expenseData.length; i++) {
    const [title, category, amount, paid] = expenseData[i];
    await prisma.expense.create({
      data: {
        title,
        category,
        amount,
        paid,
        expenseDate: daysAgo(Math.floor(Math.random() * 25)),
        note: '',
        createdBy: 'admin',
      },
    });
  }

  // Cargo batches: Bangkok -> Mandalay
  const batches = [];
  for (let i = 1; i <= 3; i++) {
    const status = ['completed', 'in_transit', 'pending'][i - 1];
    const weight = 40 + i * 20;
    const rate = 3500;
    batches.push(
      await prisma.cargoBatch.create({
        data: {
          cargoBatchCode: `CB-2026-${String(i).padStart(3, '0')}`,
          origin: 'Bangkok',
          destination: 'Mandalay',
          weight,
          cargoRate: rate,
          totalPrice: weight * rate,
          status,
          departureDate: status === 'pending' ? null : daysAgo(15 - i * 3),
          arrivalDate: status === 'completed' ? daysAgo(6) : null,
          createdBy: 'admin',
        },
      }),
    );
  }

  const orderStatuses = ['awaiting_payment', 'confirmed', 'pending', 'in_cargo', 'arrived', 'delivering', 'delivered'];

  for (let i = 0; i < 24; i++) {
    const status = pick(orderStatuses);
    // Orders that have not shipped yet are not in a batch.
    const notShipped = ['awaiting_payment', 'confirmed', 'pending'].includes(status);
    const batch = notShipped ? null : pick(batches);
    const itemCount = 1 + Math.floor(Math.random() * 2);
    const items = Array.from({ length: itemCount }, () => {
      const [name, price] = pick(PRODUCTS);
      const quantity = 1 + Math.floor(Math.random() * 3);
      return { productName: name, quantity, unitPrice: price, subtotal: price * quantity };
    });
    const total = items.reduce((s, it) => s + it.subtotal, 0);

    await prisma.order.create({
      data: {
        customerName: pick(NAMES),
        customerPhone: pick(PHONES),
        customerAddress: pick(ADDR),
        status,
        paid: status !== 'awaiting_payment',
        totalAmount: total,
        trackingNumber: batch ? `TRK${100000 + i}` : null,
        cargoBatchId: batch?.cargoId ?? null,
        note: pick(['', '', 'Call before delivery', 'Fragile']),
        createdBy: pick(['admin', 'staff']),
        createdDatetime: daysAgo(Math.floor(Math.random() * 20)),
        items: { create: items },
      },
    });
  }

  console.log('Seed complete.  Logins:  admin/admin123  •  staff/staff123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
