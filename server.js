import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from './src/models/User.js';
import apiRouter from './src/routes/api.js';
import orderSocket from './src/sockets/orderSocket.js';
import { createServer } from 'http';
import { geoFenceMiddleware } from './src/middleware/geoFence.js';

dotenv.config();
const app = express();
const httpServer = createServer(app);
// Initialize socket.io and attach reference to express app for route usage
const io = orderSocket(httpServer);
app.set('io', io);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vitato');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// No session/passport; using stateless JWT

// Geo-fence (basic IP check placeholder)
app.use('/api/orders', geoFenceMiddleware);

app.use('/api', apiRouter);

// Local Auth Routes (JWT)
app.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET || 'dev_jwt', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET || 'dev_jwt', { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});
// Logout on client = discard token; server endpoint optional for blacklist (not implemented)
app.post('/auth/logout', (req, res) => { res.json({ ok: true }); });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`VITato server running on port ${PORT}`));
