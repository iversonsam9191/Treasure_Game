import { Router } from 'express';
import { db } from '../db.js';
import { AUTH_COOKIE_NAME, getUserByToken, type UserRow } from '../auth.js';

const router = Router();

const RESULTS = ['WIN', 'TIE', 'LOSS'] as const;
type GameResult = (typeof RESULTS)[number];

router.use((req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  const user = token ? getUserByToken(token) : undefined;
  if (!user) {
    res.status(401).json({ error: 'Sign in required.' });
    return;
  }
  res.locals.user = user;
  next();
});

router.post('/', (req, res) => {
  const { id: userId } = res.locals.user as UserRow;
  const { score, result } = req.body ?? {};

  if (typeof score !== 'number' || !Number.isFinite(score) || !RESULTS.includes(result)) {
    res.status(400).json({ error: 'A numeric score and a result of WIN/TIE/LOSS are required.' });
    return;
  }

  db.prepare('INSERT INTO game_scores (user_id, score, result) VALUES (?, ?, ?)').run(
    userId,
    score,
    result as GameResult,
  );
  res.status(201).json({ ok: true });
});

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

router.get('/', (req, res) => {
  const { id: userId } = res.locals.user as UserRow;

  const page = parsePositiveInt(req.query.page, 1);
  const pageSize = Math.min(parsePositiveInt(req.query.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const offset = (page - 1) * pageSize;

  const { total } = db
    .prepare('SELECT COUNT(*) as total FROM game_scores WHERE user_id = ?')
    .get(userId) as { total: number };

  const scores = db
    .prepare(
      'SELECT id, score, result, played_at FROM game_scores WHERE user_id = ? ORDER BY played_at DESC LIMIT ? OFFSET ?',
    )
    .all(userId, pageSize, offset);

  res.json({
    scores,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
});

export default router;
