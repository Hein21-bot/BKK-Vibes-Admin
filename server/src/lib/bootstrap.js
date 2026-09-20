import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

const isProd = process.env.NODE_ENV === 'production';

// Make sure the two login accounts exist (so a fresh deploy is usable without running the
// full seed). Existing users are never modified.
//
// Locally the demo passwords (admin123 / staff123) are used. In production they are NOT:
// the password must come from SEED_ADMIN_PASSWORD / SEED_STAFF_PASSWORD, otherwise that
// account is not created, so a public server never ships with a publicly known password.
export async function ensureUsers() {
  const accounts = [
    { username: 'admin', role: 'admin', env: 'SEED_ADMIN_PASSWORD', demo: 'admin123' },
    { username: 'staff', role: 'staff', env: 'SEED_STAFF_PASSWORD', demo: 'staff123' },
  ];
  const ready = [];
  for (const a of accounts) {
    const password = process.env[a.env] || (isProd ? '' : a.demo);
    if (!password) {
      const exists = await prisma.user.findUnique({ where: { username: a.username } });
      if (!exists) console.error(`!! "${a.username}" was NOT created: set ${a.env} and restart the service.`);
      else ready.push(a.username);
      continue;
    }
    await prisma.user.upsert({
      where: { username: a.username },
      update: {},
      create: { username: a.username, role: a.role, passwordHash: await bcrypt.hash(password, 10) },
    });
    ready.push(a.username);
  }
  console.log(`Login accounts ready: ${ready.join(' / ') || 'none'}`);
}
