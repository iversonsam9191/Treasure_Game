import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

const SCRYPT_KEYLEN = 64;
const TOKEN_TTL = '30d';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-do-not-use-in-production';

export const AUTH_COOKIE_NAME = 'auth_token';

// Falls back to a fixed dev secret (not a random one) so tokens survive `tsx watch` restarts locally.
function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production.');
  }
  console.warn('[auth] JWT_SECRET not set — using an insecure dev fallback. Do not use this in production.');
  return DEV_FALLBACK_SECRET;
}

const JWT_SECRET = resolveJwtSecret();

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
}

interface AuthTokenPayload {
  sub: number;
  jti: string;
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

export function getUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}

export function getUserById(id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function createUser(email: string, password: string): UserRow {
  const { hash, salt } = hashPassword(password);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, password_salt) VALUES (?, ?, ?)')
    .run(email, hash, salt);
  return getUserById(Number(info.lastInsertRowid))!;
}

export function issueToken(userId: number): { token: string; expiresAt: Date } {
  const jti = crypto.randomBytes(16).toString('hex');
  const payload: AuthTokenPayload = { sub: userId, jti };
  const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: TOKEN_TTL });
  return { token, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) };
}

export function getUserByToken(token: string): UserRow | undefined {
  let payload: AuthTokenPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as AuthTokenPayload;
  } catch {
    return undefined; // bad signature, malformed, or expired
  }

  const isRevoked = db.prepare('SELECT 1 FROM revoked_tokens WHERE jti = ?').get(payload.jti);
  if (isRevoked) return undefined;

  return getUserById(payload.sub);
}

export function revokeToken(token: string): void {
  let payload: AuthTokenPayload & { exp?: number };
  try {
    payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as AuthTokenPayload & { exp?: number };
  } catch {
    return; // already invalid/expired — nothing to revoke
  }

  const expiresAt = payload.exp
    ? new Date(payload.exp * 1000).toISOString()
    : new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  db.prepare('INSERT OR REPLACE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)').run(
    payload.jti,
    expiresAt,
  );
}
