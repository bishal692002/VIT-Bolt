import dotenv from 'dotenv';
dotenv.config();

// Simple admin session tracking (in-memory for simplicity)
const adminSessions = new Set();

export const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.adminToken;
  
  if (!token || !adminSessions.has(token)) {
    return res.status(403).json({ error: 'Unauthorized - Admin access required' });
  }
  
  req.isAdmin = true;
  next();
};

export const adminLogin = (req, res) => {
  const { username, password } = req.body;
  
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
  
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = `admin_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    adminSessions.add(token);
    
    // Session expires in 8 hours
    setTimeout(() => adminSessions.delete(token), 8 * 60 * 60 * 1000);
    
    return res.json({ success: true, token, message: 'Admin logged in successfully' });
  }
  
  return res.status(401).json({ error: 'Invalid admin credentials' });
};

export const adminLogout = (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.adminToken;
  if (token) {
    adminSessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
};
