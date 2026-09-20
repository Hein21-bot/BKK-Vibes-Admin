import { randomInt } from 'node:crypto';

// No 0/O or 1/I/L so a number is easy to read aloud and type. 31^6 ≈ 887 million combinations.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LENGTH = 6;

// e.g. V-2026-K7M3QX
export function randomVoucherNo(date = new Date()) {
  let token = '';
  for (let i = 0; i < LENGTH; i++) token += ALPHABET[randomInt(ALPHABET.length)];
  return `V-${date.getFullYear()}-${token}`;
}
