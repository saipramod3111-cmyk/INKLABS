import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const COOKIE_NAME = 'inklabs_token';

export function requireAuth(req, res, next) {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  const token = req.cookies?.[COOKIE_NAME] || bearer;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}
