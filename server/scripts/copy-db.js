// Copy the app's data from one PostgreSQL database to another (e.g. local -> Supabase).
//
//   SOURCE_DATABASE_URL="postgresql://…local…"  \
//   TARGET_DATABASE_URL="postgresql://…supabase…" \
//   node scripts/copy-db.js [--replace] [--with-users]
//
// - The TARGET must already have the tables:  DATABASE_URL="<target>" npx prisma db push
// - The SOURCE is only read, never changed.
// - Everything is copied in ONE transaction: if anything fails, the target is left untouched.
// - Row IDs are kept and the id counters are reset so new rows continue after the copied ones.
// - The `users` table (logins) is NOT copied unless you pass --with-users. On the target the app
//   creates the two logins from SEED_ADMIN_PASSWORD / SEED_STAFF_PASSWORD instead, so the local
//   demo passwords never end up on a public database.
// - If the target already holds data the script stops, unless you pass --replace, which empties
//   the copied tables on the TARGET first (never the source).
import { PrismaClient } from '@prisma/client';

const SOURCE = process.env.SOURCE_DATABASE_URL;
const TARGET = process.env.TARGET_DATABASE_URL;
const replace = process.argv.includes('--replace');
const withUsers = process.argv.includes('--with-users');

if (!SOURCE || !TARGET) {
  console.error('Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL (see the comment at the top of this file).');
  process.exit(1);
}

const describe = (u) => {
  const x = new URL(u);
  return `${x.hostname}:${x.port || 5432}${x.pathname}`; // never print the password
};
if (describe(SOURCE) === describe(TARGET)) {
  console.error('SOURCE and TARGET are the same database — refusing.');
  process.exit(1);
}

// Parents before children (foreign keys). `id` = serial column whose counter must be reset.
const TABLES = [
  { model: 'user', table: 'users', id: 'user_id', users: true },
  { model: 'cargoBatch', table: 'cargo_batches', id: 'cargo_id' },
  { model: 'product', table: 'products', id: 'product_id' },
  { model: 'order', table: 'orders', id: 'order_id' },
  { model: 'voucher', table: 'vouchers', id: 'voucher_id' },
  { model: 'voucherItem', table: 'voucher_items', id: 'voucher_item_id' },
  // after vouchers: order lines can point at the voucher they came from (order_items.voucher_id)
  { model: 'orderItem', table: 'order_items', id: 'order_item_id' },
  { model: 'expense', table: 'expenses', id: 'expense_id' },
  { model: 'pricingSetting', table: 'pricing_settings', id: null },
].filter((t) => withUsers || !t.users);

const src = new PrismaClient({ datasources: { db: { url: SOURCE } } });
const dst = new PrismaClient({ datasources: { db: { url: TARGET } } });
const CHUNK = 100;

async function main() {
  console.log(`From  ${describe(SOURCE)}\nTo    ${describe(TARGET)}\nCopying: ${TABLES.map((t) => t.table).join(', ')}${withUsers ? '' : '  (users skipped)'}\n`);

  // 1) the target must have the tables
  for (const t of TABLES) {
    try {
      await dst[t.model].count();
    } catch {
      throw new Error(`Table "${t.table}" is missing on the target. Create the tables first:\n  DATABASE_URL="<target url>" npx prisma db push`);
    }
  }

  // 2) don't mix into existing data
  const existing = {};
  for (const t of TABLES) existing[t.table] = await dst[t.model].count();
  const nonEmpty = Object.entries(existing).filter(([, n]) => n > 0);
  if (nonEmpty.length && !replace) {
    throw new Error(
      `The target already has data (${nonEmpty.map(([k, n]) => `${k}: ${n}`).join(', ')}).\n` +
        'Nothing was changed. Use --replace to empty those tables on the TARGET first, or point at an empty database.',
    );
  }

  // 3) read everything from the source
  const data = {};
  for (const t of TABLES) data[t.table] = await src[t.model].findMany();

  // 4) write it all in one transaction
  await dst.$transaction(
    async (tx) => {
      if (replace) {
        const names = [...TABLES].reverse().map((t) => `"${t.table}"`).join(', ');
        await tx.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
      }
      for (const t of TABLES) {
        const rows = data[t.table];
        for (let i = 0; i < rows.length; i += CHUNK) {
          await tx[t.model].createMany({ data: rows.slice(i, i + CHUNK) });
        }
        if (t.id && rows.length) {
          // continue numbering after the highest copied id
          await tx.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${t.table}"', '${t.id}'), (SELECT MAX("${t.id}") FROM "${t.table}"), true)`,
          );
        }
      }
    },
    { timeout: 120_000, maxWait: 20_000 },
  );

  // 5) verify
  console.log('table               source  target');
  let ok = true;
  for (const t of TABLES) {
    const a = await src[t.model].count();
    const b = await dst[t.model].count();
    if (a !== b) ok = false;
    console.log(`${t.table.padEnd(19)} ${String(a).padStart(6)}  ${String(b).padStart(6)}  ${a === b ? 'OK' : 'MISMATCH'}`);
  }
  if (!ok) throw new Error('Row counts differ — check the output above.');
  console.log('\nDone. The counts match.');
}

main()
  .catch((e) => {
    console.error('\n✖', e.message);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([src.$disconnect(), dst.$disconnect()]));
