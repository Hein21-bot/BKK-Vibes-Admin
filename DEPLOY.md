# Deploying for free

Two ways. Both cost $0.

| | **A — everything on Render** | **B — Render API + Neon database (+ Cloudflare frontend)** |
|---|---|---|
| Database | Render PostgreSQL (free) | Neon PostgreSQL (free) |
| API | Render web service (free) | Render web service (free) |
| Frontend | Render static site (free) | Render static site *or* Cloudflare Pages (free) |
| Setup | One click (Blueprint) | A few more steps |
| **Data lifetime** | ⚠️ **Free Render database expires ~30 days after creation** | ✅ Neon's free database does not expire |

> Free-tier limits change. Check Render's and Neon's pricing pages before relying on any number below.

There is also **C — Supabase database + Render API** (below): a free Postgres that does not expire like Render's,
which you can test from your own computer before deploying.

**Recommendation:** try **A** first to see it working (5 minutes). If you will keep real data, move the database to Neon
(**B**) before the 30 days are up — see [Keeping your data](#keeping-your-data).

Both need the code on GitHub first.

---

## 0. Put the code on GitHub

```bash
cd cargo-admin
git add -A
git commit -m "Cargo Admin"
git branch -M main
git remote add origin https://github.com/<you>/cargo-admin.git
git push -u origin main
```

`.env` files are git-ignored, so your local secrets are **not** uploaded.

---

## A. Everything on Render

The repo's [`render.yaml`](render.yaml) describes the database, the API and the frontend, so Render creates all three.

1. Sign up at **render.com** (log in with GitHub) and allow it to read your `cargo-admin` repo.
2. **New +** → **Blueprint** → choose the repo → Render shows *1 database + 2 services*.
3. It asks for three values:

   | Variable | What to enter |
   |---|---|
   | `SEED_ADMIN_PASSWORD` | the password you want for the **admin** login — make it strong |
   | `SEED_STAFF_PASSWORD` | the password for the **staff** login |
   | `VITE_API_BASE_URL` | `https://cargo-admin-api.onrender.com` (a guess — you fix it in step 6 if needed) |

   (In production the app **does not** create the demo `admin123` / `staff123` accounts. Without these two
   passwords no login exists.)
4. **Apply**. Wait for the database, then the API build (~3–5 min) and the frontend build (~2 min).
5. Check the API: open `https://<your-api>.onrender.com/api/health` → you should see `{"status":"ok","db":"ok",...}`.
6. **Fix the API address if it differs.** Render shows the API's real address at the top of the `cargo-admin-api`
   page. If the name was already taken it adds a suffix (e.g. `cargo-admin-api-x7k2.onrender.com`). If it differs from
   what you typed, open **cargo-admin-web → Environment**, correct `VITE_API_BASE_URL`, then **Manual Deploy →
   Deploy latest commit** (the address is baked in when the frontend is built).
7. Open the **cargo-admin-web** address and log in as `admin` with the password you chose. Done.

**What the build does automatically:** installs packages, creates/updates all tables (`prisma db push`, safe and
additive), then starts the API. The first request after a quiet period takes ~30–60 s (free instances sleep).

---

## B. Render API + Neon database (+ Cloudflare frontend)

1. **Database** — neon.tech → create a project → copy the **connection string**
   (`postgresql://…neon.tech/neondb?sslmode=require`).
2. In `render.yaml`, delete the whole `databases:` block and replace the API's `DATABASE_URL` entry with
   ```yaml
      - key: DATABASE_URL
        sync: false
   ```
   then follow **A** but paste the Neon string when Render asks for `DATABASE_URL`.
3. **Frontend on Cloudflare Pages instead of Render** (optional): dash.cloudflare.com → Workers & Pages → Create → Pages →
   Connect to Git → Root directory `client`, build command `npm install && npm run build`, output `dist`, and set
   `VITE_API_BASE_URL` to the Render API address. `client/public/_redirects` already handles page refreshes there.

---

## C. Supabase database (+ Render API)

Use this to test against a free cloud database from your own computer first, then deploy the API to Render with the
same database. Everything here was rehearsed locally (copy, numbering, lock-down); only the Supabase screens themselves
could not be tried, so tell me if a step differs.

### 1. Get the connection string (use the *Session pooler*)
Supabase dashboard → the green **Connect** button (top) → **Session pooler** → copy the URI:

```
postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
```

- Replace `[YOUR-PASSWORD]` with your **database password** (forgotten? Project Settings → Database → Reset password).
  Use letters and numbers only, or URL-encode symbols (`@`→`%40`, `#`→`%23`, `/`→`%2F`, `:`→`%3A`, `?`→`%3F`).
- Add `?sslmode=require&connection_limit=5` at the end.
- **Why the Session pooler:** the *Direct connection* is IPv6-only on the free plan, which many home networks and hosts do
  not have. The Session pooler works everywhere and supports everything the app needs, including creating tables. Do not
  use the *Transaction pooler* (port 6543) for this app.

> Supabase's Connect dialog also shows a two-line Prisma template (`DATABASE_URL` on port 6543 with `?pgbouncer=true`, plus
> `DIRECT_URL`). You do **not** need it: this app uses one variable, `DATABASE_URL`, set to the port-5432 Session pooler string.
> In Render's Environment page paste the value **without quotes** and do not set `PORT` (Render provides it).

Below, `<SUPABASE_URL>` means that finished string.

### 2. Create the tables
```bash
cd server
DATABASE_URL="<SUPABASE_URL>" npx prisma db push
```
The Supabase **Table Editor** now shows 9 tables (empty).

### 3. Upload your data from your computer
```bash
cd server
SOURCE_DATABASE_URL="postgresql://heinminhtet@localhost:5432/cargo_admin?schema=public" \
TARGET_DATABASE_URL="<SUPABASE_URL>" \
npm run db:copy
```
(The first address is your local database — the one in `server/.env` today.) It prints a table of row counts for both sides
and says **"Done. The counts match."**

What the script guarantees:
- Your local database is only **read**, never changed.
- It is **all-or-nothing** (one transaction): if anything fails, the target stays as it was.
- IDs are kept and the counters continue after the highest one, so new orders/vouchers do not clash.
- It stops if the target already has data — add `--replace` to empty the copied tables **on the target** first.
- **Logins are not copied.** The local demo passwords (`admin123`) must not end up on a public database. Instead the app
  creates the two logins from `SEED_ADMIN_PASSWORD` / `SEED_STAFF_PASSWORD` (step 5).

### 4. Lock the tables (recommended)
Supabase publishes every table in the `public` schema as a web API. The app doesn't use that, so switch it off:
Supabase → **SQL Editor** → New query → paste the contents of [`server/scripts/enable-rls.sql`](server/scripts/enable-rls.sql)
→ **Run**. The result should list every table with `rls_enabled = true`. (Tested: an outsider role could read the tables
before, read nothing after, and the app kept working.)

### 5. Run your local app against Supabase
Edit `server/.env`:
```
DATABASE_URL="<SUPABASE_URL>"
SEED_ADMIN_PASSWORD="choose-a-strong-password"
SEED_STAFF_PASSWORD="choose-another-strong-password"
```
(Keep your old local line as a comment so you can switch back.) Then `npm run dev` and log in as `admin` with
`SEED_ADMIN_PASSWORD`. Check your orders, vouchers, products and Price Calculator settings are all there.

### 6. Deploy the API to Render
Render → **New +** → **Web Service** → your GitHub repo, then:

| Field | Value |
|---|---|
| Root Directory | `server` |
| Build Command | `npm install && npm run render-build` |
| Start Command | `npm start` |
| Instance Type | Free |
| Health Check Path | `/api/health` |

Environment variables: `DATABASE_URL` = `<SUPABASE_URL>`, `NODE_ENV` = `production`, `NODE_VERSION` = `20`,
`JWT_SECRET` = any long random text, `SEED_ADMIN_PASSWORD` and `SEED_STAFF_PASSWORD` = the same values as in step 5.
(The accounts already exist from your local test, so those two only matter if the accounts are ever missing.)
Then deploy the frontend as in **A** (Render static site) or **B** (Cloudflare Pages), with `VITE_API_BASE_URL` set to the
Render API address. If you use the blueprint (`render.yaml`) instead, delete its `databases:` block and make `DATABASE_URL`
a `sync: false` value.

### Supabase free-plan notes (check Supabase's pricing page — limits change)
- **Projects pause after about a week without activity.** Keep the API pinged (see *Keeping the app awake*): every ping runs
  a small database query. If it does pause, press **Restore** in the dashboard.
- **No automatic backups on the free plan.** The same script makes a backup — copy from Supabase back to a local database
  (which must already have the tables, `npx prisma db push`):
  ```bash
  SOURCE_DATABASE_URL="<SUPABASE_URL>" TARGET_DATABASE_URL="postgresql://…local…" npm run db:copy -- --replace --with-users
  ```
- About 500 MB of storage. Product photos (~40 KB each) are stored in the database, so they count toward it.

---

## Environment variables (API)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (set automatically in A) |
| `JWT_SECRET` | signs logins — **required in production**, the server refuses to start without it (generated for you in A) |
| `SEED_ADMIN_PASSWORD`, `SEED_STAFF_PASSWORD` | passwords for the two logins, **required in production** — used only the first time each account is created |
| `NODE_ENV` | `production` |
| `CLIENT_ORIGIN` | optional: extra allowed website addresses (comma-separated). `*.onrender.com`, `*.pages.dev`, `*.workers.dev` and localhost are already allowed |
| `JWT_EXPIRES_IN` | login lifetime, default `12h` |

Frontend: `VITE_API_BASE_URL` = the API's public address (no trailing slash).

---

## Keeping the app awake (free instances sleep after ~15 min)

- **Built in:** while someone has the app open it pings `/api/health` every 13 min (`client/src/hooks/useKeepAlive.js`).
- **24/7:** deploy the free Cloudflare Worker in [`keepalive-worker/`](keepalive-worker/) (see its README), or point a free
  uptime pinger (e.g. UptimeRobot) at `https://<your-api>.onrender.com/api/health`.
- Render's free tier has a monthly instance-hour allowance; one always-awake free service fits within it.

---

## Keeping your data

- **Render's free database is temporary (~30 days).** Before it expires either upgrade it to a paid plan, or move to Neon:
  create a Neon database, put its string in the API's `DATABASE_URL`, redeploy (the tables are created for you), and re-enter
  or copy your data.
- **Copying data across:** `pg_dump` from the old database and `psql` into the new one (use a `pg_dump` at least as new as the server).
- **Back up regularly.** The free database has no automatic backups. Orders, cargo batches, expenses and the To Buy list
  export to CSV/Excel from the app. Vouchers, products and Price Calculator settings do not — use `pg_dump` for those.
- Product photos are stored **inside the database** (not as files), so they survive restarts and redeploys.

---

## Updating later

`git push` to `main` → Render rebuilds automatically. Table changes are applied by `prisma db push` during the build
(additive changes are safe; a change that would delete data makes the build fail instead of deleting).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Can't log in at all | The logs say `"admin" was NOT created` → set `SEED_ADMIN_PASSWORD` and restart the API |
| Changed `SEED_ADMIN_PASSWORD` but the old password still works | It is only used when the account is **created**. Delete the row (`delete from users where username='admin';`) via `psql`, then restart the API |
| Frontend shows network / CORS errors | `VITE_API_BASE_URL` is wrong or missing → fix it and redeploy the frontend. For a custom domain add it to `CLIENT_ORIGIN` |
| 404 when refreshing `/orders/5` | The rewrite rule (`/*` → `/index.html`) is missing — it is in `render.yaml` |
| API deploy fails with `JWT_SECRET is not set` | Add `JWT_SECRET` (any long random text) and `NODE_ENV=production` |
| First page load is very slow | The free instance was asleep — see *Keeping the app awake* |
