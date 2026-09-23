require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const deviceManager = require('./deviceManager');
const userManager = require('./userManager');
const MikrotikConnector = require('./mikrotik');
const PollerService = require('./poller');
const { generateToken, authRequired, requireRole, socketAuth } = require('./auth');

const app = express();
app.set('trust proxy', true);
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

app.use(cors({ origin: FRONTEND_URL === '*' ? '*' : FRONTEND_URL.split(','), credentials: true }));
app.use(express.json());

// Request log
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AFNA MONITORING CENTER', version: '1.0.0', uptime: process.uptime() });
});

// Client IP (public) - untuk footer tampilkan IP pengakses
app.get('/api/client-ip', (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  let ip = forwarded ? String(forwarded).split(',')[0].trim() : (realIp || req.ip || req.socket.remoteAddress || '');
  // Normalize ::ffff: IPv4
  if (ip && ip.startsWith('::ffff:')) ip = ip.substring(7);
  // Remove port if present
  if (ip && ip.includes(':') && !ip.includes('::')) {
    // IPv4 with port? keep as is, but remove brackets
    ip = ip.split(':')[0];
  }
  res.json({ ip, forwarded: forwarded || null, realIp: realIp || null, host: req.headers.host || null });
});

// Auth
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username & password required' });
  const user = userManager.getUserByUsername(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.active) return res.status(401).json({ error: 'User inactive' });
  if (!userManager.verifyPassword(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = generateToken(user);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name, email: user.email } });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json(req.user);
});

app.put('/api/auth/me', authRequired, (req, res) => {
  const { name, email, password } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (password) updates.password = password;
  try {
    const updated = userManager.updateUser(req.user.id, updates);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Users CRUD - admin sees all, pop sees only own teknisi
app.get('/api/users', authRequired, requireRole('admin', 'pop'), (req, res) => {
  if (req.user.role === 'admin') {
    res.json(userManager.getAllUsersMasked());
  } else {
    // pop only sees teknisi they created
    res.json(userManager.getUsersForRequester(req.user));
  }
});

app.post('/api/users', authRequired, requireRole('admin', 'pop'), (req, res) => {
  const { username, password, role, name, email } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'username, password, role required' });
  try {
    const user = userManager.createUser({ username, password, role, name, email }, req.user);
    res.status(201).json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/users/:id', authRequired, requireRole('admin', 'pop'), (req, res) => {
  try {
    // pop can only update teknisi they created
    if (req.user.role === 'pop') {
      const target = userManager.getUserById(req.params.id);
      if (!target || target.role !== 'teknisi' || target.createdBy !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: pop hanya bisa edit teknisi milik sendiri' });
      }
      // pop cannot change role to admin/pop
      if (req.body.role && req.body.role !== 'teknisi') {
        return res.status(400).json({ error: 'Pop hanya bisa update teknisi' });
      }
    }
    const updated = userManager.updateUser(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/users/:id', authRequired, requireRole('admin', 'pop'), (req, res) => {
  try {
    if (req.user.role === 'pop') {
      const target = userManager.getUserById(req.params.id);
      if (!target || target.role !== 'teknisi' || target.createdBy !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: pop hanya bisa hapus teknisi milik sendiri' });
      }
    }
    const ok = userManager.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Seed default users on startup
userManager.loadUsers();

// Devices CRUD (protected) - pop only see own, teknisi see parent pop's
app.get('/api/devices', authRequired, (req, res) => {
  const devices = deviceManager.getDevicesForUser(req.user);
  res.json(devices);
});

app.get('/api/devices/:id', authRequired, (req, res) => {
  const d = deviceManager.getDeviceById(req.params.id);
  if (!d) return res.status(404).json({ error: 'Device not found' });
  if (!deviceManager.canAccessDevice(req.user, req.params.id)) return res.status(403).json({ error: 'Forbidden: not your device' });
  const masked = { ...d };
  delete masked.password;
  res.json(masked);
});

app.post('/api/devices', authRequired, requireRole('admin', 'pop'), (req, res) => {
  const { name, host, port, username, password, apiType } = req.body;
  if (!name || !host || !username || !password) {
    return res.status(400).json({ error: 'name, host, username, password required' });
  }
  const device = deviceManager.createDevice({ name, host, port, username, password, apiType }, req.user);
  // start polling
  poller.startPolling(device.id);
  const masked = { ...device };
  delete masked.password;
  res.status(201).json(masked);
});

app.put('/api/devices/:id', authRequired, requireRole('admin', 'pop'), (req, res) => {
  if (!deviceManager.canAccessDevice(req.user, req.params.id)) return res.status(403).json({ error: 'Forbidden: not your device' });
  const device = deviceManager.updateDevice(req.params.id, req.body);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  poller.restartPolling(req.params.id);
  const masked = { ...device };
  delete masked.password;
  res.json(masked);
});

app.delete('/api/devices/:id', authRequired, requireRole('admin', 'pop'), (req, res) => {
  if (!deviceManager.canAccessDevice(req.user, req.params.id)) return res.status(403).json({ error: 'Forbidden: not your device' });
  const ok = deviceManager.deleteDevice(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Device not found' });
  poller.stopPolling(req.params.id);
  res.json({ success: true });
});

// Test connection
app.post('/api/devices/:id/test', authRequired, async (req, res) => {
  if (!deviceManager.canAccessDevice(req.user, req.params.id)) return res.status(403).json({ error: 'Forbidden: not your device' });
  const device = deviceManager.getDeviceDecrypted(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const connector = new MikrotikConnector(device);
  try {
    const result = await connector.testConnection();
    deviceManager.updateDeviceStatus(req.params.id, 'online');
    res.json({ success: true, ...result });
  } catch (e) {
    deviceManager.updateDeviceStatus(req.params.id, 'offline');
    res.status(400).json({ success: false, error: e.message });
  }
});

// Auto-detect API type
app.post('/api/devices/:id/detect', authRequired, async (req, res) => {
  if (!deviceManager.canAccessDevice(req.user, req.params.id)) return res.status(403).json({ error: 'Forbidden: not your device' });
  const device = deviceManager.getDeviceDecrypted(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const connector = new MikrotikConnector(device);
  try {
    const type = await connector.autoDetect();
    deviceManager.updateDevice(req.params.id, { apiType: type });
    res.json({ success: true, apiType: type });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Get interfaces
app.get('/api/devices/:id/interfaces', authRequired, async (req, res) => {
  if (!deviceManager.canAccessDevice(req.user, req.params.id)) return res.status(403).json({ error: 'Forbidden: not your device' });
  const device = deviceManager.getDeviceDecrypted(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const connector = new MikrotikConnector(device);
  try {
    const ifaces = await connector.getInterfaces();
    res.json(ifaces);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get uplink interface (dhcp-client or default route)
app.get('/api/devices/:id/uplink', authRequired, async (req, res) => {
  if (!deviceManager.canAccessDevice(req.user, req.params.id)) return res.status(403).json({ error: 'Forbidden: not your device' });
  const device = deviceManager.getDeviceDecrypted(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const connector = new MikrotikConnector(device);
  try {
    const uplink = await connector.getUplinkInterface();
    const dhcp = await connector.getDhcpClient().catch(() => []);
    const routes = await connector.getRoutes().catch(() => []);
    const defaultRoutes = routes.filter(r => (r['dst-address'] || r.dstAddress) === '0.0.0.0/0');
    res.json({ uplink: uplink || null, dhcpClient: dhcp, defaultRoutes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all uplinks for dashboard (batch) - filtered by user
app.get('/api/uplinks', authRequired, async (req, res) => {
  const devices = deviceManager.getDevicesForUser(req.user);
  const results = {};
  for (const d of devices) {
    const dev = deviceManager.getDeviceDecrypted(d.id);
    const connector = new MikrotikConnector(dev);
    try {
      const uplink = await connector.getUplinkInterface();
      results[d.id] = { host: d.host, name: d.name, uplink: uplink || null, status: d.status };
    } catch (e) {
      results[d.id] = { host: d.host, name: d.name, uplink: null, error: e.message, status: d.status };
    }
  }
  res.json(results);
});

// Get resource (CPU, memory, uptime) - health
app.get('/api/devices/:id/resource', authRequired, async (req, res) => {
  if (!deviceManager.canAccessDevice(req.user, req.params.id)) return res.status(403).json({ error: 'Forbidden: not your device' });
  const device = deviceManager.getDeviceDecrypted(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const connector = new MikrotikConnector(device);
  try {
    const resource = await connector.getResource();
    const health = await connector.getHealth().catch(() => null);
    res.json({ ...resource, health });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/devices/:id/health', authRequired, async (req, res) => {
  if (!deviceManager.canAccessDevice(req.user, req.params.id)) return res.status(403).json({ error: 'Forbidden: not your device' });
  const device = deviceManager.getDeviceDecrypted(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const connector = new MikrotikConnector(device);
  try {
    const resource = await connector.getResource();
    const health = await connector.getHealth().catch(() => null);
    res.json({ resource, health, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/devices/:id/health-history', authRequired, (req, res) => {
  if (!deviceManager.canAccessDevice(req.user, req.params.id)) return res.status(403).json({ error: 'Forbidden: not your device' });
  const { range, hours, points } = req.query;
  const rangeHours = parseRangeToHours(range);
  let data;
  if (rangeHours !== null) data = deviceManager.getHealthHistory(req.params.id, rangeHours);
  else if (hours) data = deviceManager.getHealthHistory(req.params.id, parseFloat(hours));
  else if (req.query.days) data = deviceManager.getHealthHistory(req.params.id, parseFloat(req.query.days) * 24);
  else data = deviceManager.getHealthHistory(req.params.id, 24, parseInt(req.query.limit) || 200);
  const target = parseInt(points) || 300;
  if (data.length > target) {
    // downsample for health: average cpu, temp
    const bucketSize = Math.ceil(data.length / target);
    const sampled = [];
    for (let i = 0; i < data.length; i += bucketSize) {
      const bucket = data.slice(i, i + bucketSize);
      const avgCpu = Math.round(bucket.reduce((a,b)=>a+(b.cpu||0),0)/bucket.length);
      const avgTemp = bucket.some(b=>b.temperature!==null) ? (bucket.reduce((a,b)=>a+(b.temperature||0),0)/bucket.length).toFixed(1) : null;
      const ts = bucket[Math.floor(bucket.length/2)].timestamp;
      sampled.push({ cpu: avgCpu, temperature: avgTemp ? parseFloat(avgTemp) : null, timestamp: ts, raw: bucket[0] });
    }
    return res.json(sampled);
  }
  res.json(data);
});

// Helper: parse range string like 5m,30m,6h,12h,1d,7d,30d
function parseRangeToHours(range) {
  if (!range) return null;
  const m = String(range).toLowerCase().trim().match(/^(\d+(?:\.\d+)?)\s*([mhd])$/);
  if (!m) return null;
  const val = parseFloat(m[1]);
  const unit = m[2];
  if (unit === 'm') return val / 60;
  if (unit === 'h') return val;
  if (unit === 'd') return val * 24;
  return null;
}
function downsample(data, targetPoints = 300) {
  if (!Array.isArray(data) || data.length <= targetPoints) return data;
  const bucketSize = Math.ceil(data.length / targetPoints);
  const result = [];
  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, i + bucketSize);
    const avgRx = Math.round(bucket.reduce((a, b) => a + b.rx, 0) / bucket.length);
    const avgTx = Math.round(bucket.reduce((a, b) => a + b.tx, 0) / bucket.length);
    const maxRx = Math.max(...bucket.map(b => b.rx));
    const maxTx = Math.max(...bucket.map(b => b.tx));
    const timestamp = bucket[Math.floor(bucket.length / 2)].timestamp;
    result.push({ rx: avgRx, tx: avgTx, maxRx, maxTx, timestamp });
  }
  return result;
}

// Get traffic history with range & downsampling for chart
app.get('/api/devices/:id/history', authRequired, (req, res) => {
  if (!deviceManager.canAccessDevice(req.user, req.params.id)) return res.status(403).json({ error: 'Forbidden: not your device' });
  const { interface: iface, limit, hours, range, points } = req.query;
  if (!iface) return res.status(400).json({ error: 'interface query required' });
  let data;
  const rangeHours = parseRangeToHours(range);
  if (rangeHours !== null) {
    data = deviceManager.getHistoryRange(req.params.id, iface, rangeHours);
  } else if (hours) {
    data = deviceManager.getHistoryRange(req.params.id, iface, parseFloat(hours));
  } else if (req.query.days) {
    data = deviceManager.getHistoryRange(req.params.id, iface, parseFloat(req.query.days) * 24);
  } else if (req.query.minutes) {
    data = deviceManager.getHistoryRange(req.params.id, iface, parseFloat(req.query.minutes) / 60);
  } else {
    data = deviceManager.getHistory(req.params.id, iface, parseInt(limit) || 200);
    // if limit not set, we may still want to downsample if too many points? Already limited to 200
    return res.json(data);
  }

  // For range queries, downsample to fit chart (target 300-500 points)
  const target = parseInt(points) || 400;
  // If client wants raw, set points=0 or very large
  if (data.length > target) {
    const sampled = downsample(data, target);
    // attach meta for frontend
    res.set('X-Total-Points', String(data.length));
    res.set('X-Sampled-Points', String(sampled.length));
    return res.json(sampled);
  }
  res.json(data);
});

// Get all history for device (all interfaces)
app.get('/api/devices/:id/history-all', authRequired, (req, res) => {
  if (!deviceManager.canAccessDevice(req.user, req.params.id)) return res.status(403).json({ error: 'Forbidden: not your device' });
  const { hours } = req.query;
  const deviceId = req.params.id;
  const all = deviceManager.loadHistory()[deviceId] || {};
  if (hours) {
    const cutoff = Date.now() - parseInt(hours) * 3600 * 1000;
    const filtered = {};
    for (const [iface, arr] of Object.entries(all)) {
      filtered[iface] = arr.filter(e => e.timestamp >= cutoff);
    }
    return res.json(filtered);
  }
  res.json(all);
});

// Socket.IO
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
io.use(socketAuth);

io.on('connection', (socket) => {
  console.log('[Socket] client connected', socket.id);

  socket.on('subscribe:device', (deviceId) => {
    socket.join(`device:${deviceId}`);
    console.log(`[Socket] ${socket.id} subscribed to device:${deviceId}`);
  });

  socket.on('subscribe:traffic', ({ deviceId, interface: iface }) => {
    if (deviceId && iface) {
      socket.join(`traffic:${deviceId}:${iface}`);
      console.log(`[Socket] ${socket.id} subscribed to traffic:${deviceId}:${iface}`);
    } else if (deviceId) {
      socket.join(`device:${deviceId}`);
    }
  });

  socket.on('set:interfaces', ({ deviceId, interfaces }) => {
    if (deviceId && Array.isArray(interfaces)) {
      poller.setInterfaces(deviceId, interfaces);
      console.log(`[Socket] set interfaces for ${deviceId}:`, interfaces);
    }
  });

  socket.on('disconnect', () => {
    console.log('[Socket] client disconnected', socket.id);
  });
});

// Poller
const poller = new PollerService(io);
poller.startAll();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  poller.stopAll();
  server.close(() => process.exit(0));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`AFNA MONITORING CENTER Backend running on http://0.0.0.0:${PORT}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Poll interval: ${process.env.POLL_INTERVAL || 5000}ms`);
});
