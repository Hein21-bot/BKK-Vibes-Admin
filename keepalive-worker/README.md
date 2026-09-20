# Keep-alive Worker

A tiny Cloudflare Worker whose Cron Trigger pings the API's `/api/health` every
13 minutes so the free Render service and Neon database never go to sleep.
Runs 24/7 — unlike the in-app ping in `client/`, which only works while a tab is open.

Cloudflare's free plan includes Cron Triggers.

## Deploy

```bash
cd keepalive-worker
npm install
npx wrangler login          # opens the browser once

# set your real API URL (edit wrangler.toml, or pass it here):
npx wrangler deploy --var HEALTH_URL:https://<your-api>.onrender.com/api/health
```

That's it. Check it's firing:

```bash
npx wrangler tail           # live logs — you'll see "keepalive ... -> 200" every 13 min
```

Or in the dashboard: **Workers & Pages → cargo-admin-keepalive → Settings → Triggers → Cron Triggers**,
and **Logs** for the run history.

## Change the schedule

Edit `crons` in `wrangler.toml` (standard cron syntax) and redeploy.
`*/13 * * * *` = every 13 minutes.

## Remove it

```bash
npx wrangler delete
```
