// Back up / restore the whole database as ONE json file (no pg_dump needed).
//
//   npm run backup                              -> backups/backup-YYYY-MM-DD_HHMM.json   (uses DATABASE_URL from .env)
//   npm run backup:restore -- <file> [--replace] -> load a backup into DATABASE_URL
//
// - Backup only READS the database.
// - Restore stops if the database already has data, unless you pass --replace, which empties the
//   app's tables first. Everything is written in one transaction (all or nothing).
// - The file holds customer data and login hashes: keep it private. backups/ is git-ignored.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

// Parents before children (foreign keys). `id` = serial column whose counter is reset on restore.
const TABLES = [
  { model: 'user', table: 'users', id: 'user_id' },
  { model: 'cargoBatch', table: 'cargo_batches', id: 'cargo_id' },
  { model: 'product', table: 'products', id: 'product_id' },
  { model: 'order', table: 'orders', id: 'order_id' },
  { model: 'orderItem', table: 'order_items', id: 'order_item_id' },
  { model: 'voucher', table: 'vouchers', id: 'voucher_id' },
  { model: 'voucherItem', table: 'voucher_items', id: 'voucher_item_id' },
  { model: 'expense', table: 'expenses', id: 'expense_id' },
  { model: 'pricingSetting', table: 'pricing_settings', id: null },
];

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backups');
const [mode = 'backup', ...rest] = process.argv.slice(2);
const replace = rest.includes('--replace');
const file = rest.find((a) => !a.startsWith('--'));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (server/.env).');
  process.exit(1);
}
const u = new URL(process.env.DATABASE_URL);
const where = `${u.hostname}:${u.port || 5432}${u.pathname}`; // never print the password
const prisma = new PrismaClient();
const CHUNK = 100;

async function backup() {
  const data = {};
  for (const t of TABLES) data[t.table] = await prisma[t.model].findMany();
  fs.mkdirSync(dir, { recursive: true });
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const name = `backup-${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}.json`;
  const out = path.join(dir, name);
  fs.writeFileSync(out, JSON.stringify({ createdAt: d.toISOString(), source: where, tables: data }));
  console.log(`Backed up ${where}\n`);
  for (const t of TABLES) console.log(`  ${t.table.padEnd(18)} ${String(data[t.table].length).padStart(5)} rows`);
  console.log(`\nSaved: ${out}  (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
}

async function restore() {
  if (!file) throw new Error('Give the backup file:  npm run backup:restore -- backups/backup-….json [--replace]');
  const backupFile = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const data = backupFile.tables;
  if (!data) throw new Error('This does not look like a backup made by `npm run backup`.');
  console.log(`Restoring ${file}\n   (made ${backupFile.createdAt} from ${backupFile.source})\ninto ${where}\n`);

  const existing = {};
  for (const t of TABLES) {
    try {
      existing[t.table] = await prisma[t.model].count();
    } catch {
      throw new Error(`Table "${t.table}" is missing. Create the tables first:  npx prisma db push`);
    }
  }
  const nonEmpty = Object.entries(existing).filter(([, n]) => n > 0);
  if (nonEmpty.length && !replace) {
    throw new Error(
      `The database already has data (${nonEmpty.map(([k, n]) => `${k}: ${n}`).join(', ')}).\n` +
        'Nothing was changed. Use --replace to empty those tables first, or point DATABASE_URL at an empty database.',
    );
  }

  await prisma.$transaction(
    async (tx) => {
      if (replace) {
        const names = [...TABLES].reverse().map((t) => `"${t.table}"`).join(', ');
        await tx.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
      }
      for (const t of TABLES) {
        const rows = data[t.table] || [];
        for (let i = 0; i < rows.length; i += CHUNK) {
          await tx[t.model].createMany({ data: rows.slice(i, i + CHUNK) });
        }
        if (t.id && rows.length) {
          await tx.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${t.table}"', '${t.id}'), (SELECT MAX("${t.id}") FROM "${t.table}"), true)`,
          );
        }
      }
    },
    { timeout: 120_000, maxWait: 20_000 },
  );

  console.log('table               backup  database');
  let ok = true;
  for (const t of TABLES) {
    const a = (data[t.table] || []).length;
    const b = await prisma[t.model].count();
    if (a !== b) ok = false;
    console.log(`${t.table.padEnd(19)} ${String(a).padStart(6)}  ${String(b).padStart(8)}  ${a === b ? 'OK' : 'MISMATCH'}`);
  }
  if (!ok) throw new Error('Row counts differ — check the output above.');
  console.log('\nDone. The counts match.');
}

(mode === 'restore' ? restore() : backup())
  .catch((e) => {
    console.error('\n✖', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
