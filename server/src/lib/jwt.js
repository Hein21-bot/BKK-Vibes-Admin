import jwt from 'jsonwebtoken';

// In production a missing secret would silently fall back to a value that is public in the
// repository, so refuse to start instead.
const SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-change-me');
if (!SECRET) {
  throw new Error('JWT_SECRET is not set. Set it in the environment before running in production.');
}
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
