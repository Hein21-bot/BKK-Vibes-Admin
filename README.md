# BKK Vibes Admin — Order & Cargo Management (Bangkok → Mandalay)

A simple admin dashboard for a small import business:

1. **Take orders** — customer name, phone, Mandalay delivery address, and products
   typed in freely (no product catalogue needed).
2. **Ship in bulk** — group many orders into one **cargo batch** (Bangkok → Mandalay).
3. **Deliver one by one** — once the batch arrives in Mandalay, move each order
   through `arrived → delivering → delivered`.
4. **Price the goods** — a built-in preorder **Price Calculator** (LOW / NORMAL /
   PREMIUM selling prices from buy price, weight, cargo rate, FX and markup tiers).

## Tech Stack

| Layer     | Choice                                             |
|-----------|----------------------------------------------------|
| Frontend  | React 18 + Vite + Tailwind CSS + React Router + Recharts |
| Backend   | Node.js + Express                                  |
| Database  | PostgreSQL (via Prisma ORM)                        |
| Auth      | JWT + bcrypt, roles: `admin`, `staff`              |
| UI        | Light / dark theme + English / Myanmar (မြန်မာ) i18n, both toggled from the top bar and remembered per browser |

## Modules

| Page | What it does |
|------|--------------|
| **Login** | JWT login (`admin` / `staff`) |
| **Dashboard** | Today's orders, total orders, in-cargo, to-deliver, delivered, unpaid; orders-by-status chart; recent orders |
| **Orders** | List with filters (status, paid/unpaid, cargo batch, date range, search), create / edit (customer + products, each line with its own **color and size** + paid toggle), detail page with status **stepper**, bulk update (status / paid / assign to batch), CSV + Excel export |
| **To Buy** | Shopping list of what you still have to buy: only **Confirmed** orders (payment confirmed, not bought yet) are counted — Awaiting payment, Pending (Bangkok) and later statuses are left out. **By product** view adds the same product up across orders (case/spacing ignored) with which order and customer needs how many, and shows the catalogue photo when the name matches a product; **By order** view lists each order's items and can move selected orders to *Pending (Bangkok)* once bought. Print, CSV and Excel |
| **Cargo Batches** | List + create/edit (batch code **always auto-generated** as `CB-2026-001`, weight × rate = cost), detail page: add many unassigned orders at once, remove orders, bulk-update the status of orders in the batch, CSV + Excel export |
| **Products** | Product list with name, category, price, stock, active/inactive and a **photo**. Add / edit / delete, search, status filter, low stock (5 or fewer) shown in red. Photos are shrunk in the browser and stored in the database (free hosts such as Render have no permanent disk for uploaded files). Typing a product name in an order or voucher **suggests your products and fills the price** — optional, free text still works, and deleting a product never changes existing orders or vouchers |
| **Vouchers** | Customer-facing shopping voucher: customer name, date, multiple product lines (product / colour / size / qty / amount per qty), discount amount and total (computed server-side), voucher number auto-generated as a random code like `V-2026-K7M3QX`. Printable page laid out like a paper payment voucher (logo + shop details top-left, title and dotted Date / Voucher No. / Customer fields top-right, black-header grid padded with blank rows, subtotal / discount / total box, Terms & Conditions — preorder, full prepaid, no refund, waiting time 2–4 weeks — and Authorized By / Received By signature lines). **Print / Save PDF** uses the browser print dialog and always prints as black ink on white paper. Logo, shop name, address, phone and email are set from the **Shop details** button (saved in that browser only). A voucher can be **linked to an order**: the order page has a **Create voucher** button (pre-fills customer + products) and lists its vouchers, and the voucher page links back to the order — or, the other way round, its **+ Create order** button opens the order form pre-filled from the voucher and links the two when you save |
| **Expenses** | Simple business-cost log — transportation fee, cargo fee, packaging, supplies, salary, rent, utilities, other. Record title / category / amount / date / note, toggle **paid / unpaid** with one click, filter (category, paid, date range, search), running **total / paid / unpaid** summary, CSV + Excel export |
| **Price Calculator** | Thailand → Myanmar preorder pricing (ported from the standalone *uniqlo-calculator*). 5 tabs — Price Calculator (single item → LOW/NORMAL/PREMIUM prices + market comparison), Batch Calculator (many items, quantity-weighted totals), Weight Reference (category → preset weight), Market Reference (observed reseller listings), Assumptions & Tiers (cargo rate, FX, risk %, rounding, markup tiers; locked by default; JSON import/export). **Saved in the database** (`pricing_settings`, one JSON row per setting: assumptions, tiers, weight presets, market list and the two calculators' inputs), so every browser and device sees the same values. Edits are saved automatically a moment after you type (a *Saved to database* indicator shows it). Values an older version kept in a browser are moved into the database the first time that browser opens the page. Which tab is open and the settings lock stay per-browser. **Reset all** returns everything to the built-in defaults. |

**Order status flow:** `awaiting_payment` → `confirmed` → `pending` → `in_cargo` → `arrived` → `delivering` → `delivered`

- `awaiting_payment` — order taken, payment not confirmed yet (the default for a new unpaid order).
- `confirmed` — **payment is confirmed but the product is not bought yet**.
- `pending` (shown as *Pending (Bangkok)*) — **the product has been bought and is in our hands in Bangkok**, waiting for a cargo batch.

Marking an `awaiting_payment` order paid (the **Confirm payment** button, the paid checkbox, or a bulk update) confirms it automatically, un-marking paid sends it back, and an unpaid order cannot be set to `confirmed`. Removing an order from a cargo batch puts it back to `pending` (it is in hand in Bangkok).

**Cargo status flow:** `pending` → `in_transit` → `arrived` → `completed`

Setting a batch to `in_transit` moves its `pending` orders to `in_cargo`;
setting it to `arrived` moves them to `arrived`.

## Database tables

`users`, `cargo_batches`, `orders`, `order_items`, `expenses`, `vouchers`, `voucher_items`, `pricing_settings`, `products`. Orders store the
customer name/phone/address directly (snapshot); order items store a free-text
`product_name`; expenses are standalone rows (no relations).

After pulling schema changes run `npm run db:push` in `server/` (additive, keeps
existing data) then `npm run seed` for fresh demo data.

## Deploy for free

See **[DEPLOY.md](DEPLOY.md)** — everything on Render's free tier in one click (database + API + frontend via `render.yaml`),
or Render + a free Neon database for data that does not expire. `$0`/month.

## Getting started

> **This machine:** port `4000` is in use, so `server/.env` and `client/.env`
> are set to **port 4100**. Reset to `4000` after freeing it if you prefer.

```bash
# 1. Database
createdb cargo_admin

# 2. Backend
cd server
cp .env.example .env          # edit DATABASE_URL / JWT_SECRET
npm install
npm run db:push               # create tables from schema.prisma
npm run seed                  # demo users + orders + cargo batches
npm run dev                   # http://localhost:4100

# 3. Frontend  (separate terminal)
cd client
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

Or from the repo root: `npm run install:all`, then `npm run setup`, then
`npm run dev:server` / `npm run dev:client`.

## Seeded logins

| Username | Password   | Role  |
|----------|------------|-------|
| `admin`  | `admin123` | admin |
| `staff`  | `staff123` | staff |

Both roles can use every page. Amounts are shown in Myanmar Kyat (`Ks`).
