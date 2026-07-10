import { Router } from 'express';
import {
  AUTH_COOKIE_NAME,
  createUser,
  getUserByEmail,
  getUserByToken,
  issueToken,
  revokeToken,
  verifyPassword,
} from '../auth.js';

const router = Router();

const isProd = process.env.NODE_ENV === 'production';
const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProd,
  path: '/',
};

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

router.post('/signup', (req, res) => {
  const { email, password } = req.body ?? {};

  if (!isValidEmail(email) || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({
      error: 'A valid email and a password of at least 8 characters are required.',
    });
    return;
  }

  if (getUserByEmail(email)) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const user = createUser(email, password);
  const { token, expiresAt } = issueToken(user.id);
  res.cookie(AUTH_COOKIE_NAME, token, { ...authCookieOptions, expires: expiresAt });
  res.status(201).json({ user: { id: user.id, email: user.email } });
});

router.post('/signin', (req, res) => {
  const { email, password } = req.body ?? {};

  if (!isValidEmail(email) || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = getUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const { token, expiresAt } = issueToken(user.id);
  res.cookie(AUTH_COOKIE_NAME, token, { ...authCookieOptions, expires: expiresAt });
  res.json({ user: { id: user.id, email: user.email } });
});

router.post('/signout', (req, res) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (token) revokeToken(token);
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
  res.status(204).end();
});

router.get('/me', (req, res) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  const user = token ? getUserByToken(token) : undefined;
  res.json({ user: user ? { id: user.id, email: user.email } : null });
});

export default router;
