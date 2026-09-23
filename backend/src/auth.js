const jwt = require('jsonwebtoken');
const userManager = require('./userManager');

const JWT_SECRET = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'afna-jwt-secret-change-me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Middleware: check Bearer token
function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized: token required' });
  try {
    const payload = verifyToken(token);
    const user = userManager.getUserById(payload.id);
    if (!user || !user.active) return res.status(401).json({ error: 'Unauthorized: user inactive' });
    req.user = { id: user.id, username: user.username, role: user.role, name: user.name, email: user.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized: invalid token', details: e.message });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: `Forbidden: requires role ${roles.join('/')}` });
    next();
  };
}

// Socket.IO auth
function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  if (!token) {
    // Allow without auth for now? But we want to protect. For MVP allow anonymous but attach null
    // If you want strict, uncomment below:
    // return next(new Error('Unauthorized'));
    socket.user = null;
    return next();
  }
  try {
    const payload = verifyToken(token);
    const user = userManager.getUserById(payload.id);
    if (!user || !user.active) return next(new Error('User inactive'));
    socket.user = { id: user.id, username: user.username, role: user.role };
    next();
  } catch (e) {
    next(new Error('Invalid token'));
  }
}

module.exports = { generateToken, verifyToken, authRequired, requireRole, socketAuth, JWT_SECRET };
