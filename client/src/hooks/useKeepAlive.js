import { useEffect } from 'react';
import { api } from '../api/client.js';

// Render's free web service sleeps after ~15 min idle (≈50s cold start), and
// Neon suspends the database when idle. While the app is open in a browser tab
// this pings /api/health (which also runs a trivial DB query) so both stay warm.
//
// Only runs when VITE_API_BASE_URL is set — i.e. the deployed build talking to
// a remote API. It does nothing in local dev.
//
// Note: this only helps while someone has the app open. For 24/7 uptime use the
// Cloudflare Worker cron in keepalive-worker/.
const INTERVAL_MS = 13 * 60 * 1000; // 13 min — safely under Render's 15 min

export function useKeepAlive() {
  useEffect(() => {
    if (!import.meta.env.VITE_API_BASE_URL) return;

    const ping = () => {
      api.get('/health', { timeout: 60000 }).catch(() => {});
    };

    ping();
    const id = setInterval(ping, INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
