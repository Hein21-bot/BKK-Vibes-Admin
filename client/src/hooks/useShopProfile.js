import { useCallback, useState } from 'react';

const KEY = 'cargo-admin:shop-profile';
const EMPTY = { name: '', address: '', phone: '', email: '', logo: '' };

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return EMPTY;
}

// Shop details printed at the top of vouchers (logo, name, address, contact).
// Stored in this browser only — no backend table needed.
export function useShopProfile() {
  const [profile, setProfile] = useState(read);

  // Returns false if the browser refused to store it (quota / blocked storage).
  const save = useCallback((next) => {
    const merged = { ...EMPTY, ...next };
    setProfile(merged);
    try {
      localStorage.setItem(KEY, JSON.stringify(merged));
      return true;
    } catch {
      return false;
    }
  }, []);

  return [profile, save];
}

// Bundled BKK Vibes logo (client/public/logo.jpg), used whenever no custom logo is set.
export const DEFAULT_LOGO = '/logo.jpg';
