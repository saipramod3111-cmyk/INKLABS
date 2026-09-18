import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { config } from '../config.js';
import { requireAuth, COOKIE_NAME } from '../middleware/auth.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id, email: user.email, name: user.name }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.created_at });

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const normalized = email.trim().toLowerCase();
  const exists = await query('SELECT 1 FROM users WHERE email = $1', [normalized]);
  if (exists.rowCount) return res.status(409).json({ error: 'An account with that email already exists' });

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
    [name.trim(), normalized, hash]
  );
  issueSession(res, rows[0]);
  res.status(201).json({ user: publicUser(rows[0]) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  issueSession(res, user);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.user.id]);
  if (!rows.length) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: publicUser(rows[0]) });
});

export default router;
