import jwt from 'jsonwebtoken';

export function ensureAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt');
    req.user = payload; // { id, email, name, role }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
