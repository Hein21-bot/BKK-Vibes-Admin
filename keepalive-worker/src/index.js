// Cloudflare Worker — keeps the Render API and Neon database from sleeping.
// A Cron Trigger (see wrangler.toml) calls scheduled() every 13 minutes; it
// fetches /api/health, which also runs a trivial DB query.
//
// Free plan: Cron Triggers are included. This runs 24/7, independent of whether
// anyone has the app open.

export default {
  async scheduled(_event, env, ctx) {
    const url = env.HEALTH_URL;
    if (!url) return;
    ctx.waitUntil(
      fetch(url, { headers: { 'user-agent': 'cargo-admin-keepalive' } })
        .then((r) => console.log(`keepalive ${url} -> ${r.status}`))
        .catch((e) => console.error('keepalive failed:', e.message)),
    );
  },

  // Optional: visiting the Worker URL in a browser also triggers a ping.
  async fetch(_req, env) {
    const url = env.HEALTH_URL;
    if (!url) return new Response('HEALTH_URL not set', { status: 500 });
    const r = await fetch(url);
    return new Response(`pinged ${url} -> ${r.status}`, { status: 200 });
  },
};
