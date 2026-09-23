const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../data');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const HISTORY_FILE = path.join(DATA_DIR, 'traffic_history.json');

const ALGO = 'aes-256-cbc';
function getKey() {
  const raw = process.env.ENCRYPTION_KEY || 'afna-monitoring-center-secret-key-32b';
  // Ensure 32 bytes
  const hash = crypto.createHash('sha256').update(raw).digest();
  return hash;
}

function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let enc = cipher.update(text, 'utf8', 'hex');
  enc += cipher.final('hex');
  return iv.toString('hex') + ':' + enc;
}

function decrypt(text) {
  try {
    const key = getKey();
    const [ivHex, enc] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    let dec = decipher.update(enc, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch (e) {
    // fallback: if not encrypted, return as is (for migration)
    return text;
  }
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DEVICES_FILE)) fs.writeFileSync(DEVICES_FILE, JSON.stringify([], null, 2));
  if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, JSON.stringify({}, null, 2));
}

function loadDevices() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(DEVICES_FILE, 'utf8');
    const arr = JSON.parse(raw);
    // decrypt password for internal use? Keep encrypted at rest, decrypt on read for API
    return arr;
  } catch (e) {
    return [];
  }
}

function saveDevices(devices) {
  ensureDataDir();
  fs.writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2));
}

function getAllDevicesMasked() {
  const devices = loadDevices();
  return devices.map(d => ({
    id: d.id,
    name: d.name,
    host: d.host,
    port: d.port,
    username: d.username,
    apiType: d.apiType || 'api',
    status: d.status || 'unknown',
    lastSeen: d.lastSeen || null,
    createdAt: d.createdAt,
    ownerId: d.ownerId || null,
    ownerUsername: d.ownerUsername || null,
    ownerRole: d.ownerRole || null,
    // don't expose password
  }));
}

function getDevicesForUser(user) {
  const all = getAllDevicesMasked();
  if (!user) return [];
  if (user.role === 'admin') return all;
  if (user.role === 'pop') {
    // pop STRICT only own (no legacy)
    return all.filter(d => d.ownerId === user.id);
  }
  if (user.role === 'teknisi') {
    const fullUser = require('./userManager').getUserById(user.id);
    const parentId = fullUser?.createdBy;
    if (parentId) {
      return all.filter(d => d.ownerId === parentId);
    }
    // admin-created teknisi sees no pop devices (strict) — only if needed, fallback to none
    return [];
  }
  return [];
}

function canAccessDevice(user, deviceId) {
  const device = getDeviceById(deviceId);
  if (!device) return false;
  if (user.role === 'admin') return true;
  // STRICT: legacy no-owner not accessible to pop/teknisi
  if (user.role === 'pop') return device.ownerId === user.id;
  if (user.role === 'teknisi') {
    const fullUser = require('./userManager').getUserById(user.id);
    const parentId = fullUser?.createdBy;
    if (parentId) return device.ownerId === parentId;
    return false;
  }
  return false;
}

function getDeviceById(id) {
  const devices = loadDevices();
  return devices.find(d => d.id === id);
}

function getDeviceDecrypted(id) {
  const d = getDeviceById(id);
  if (!d) return null;
  return {
    ...d,
    password: decrypt(d.password)
  };
}

function createDevice({ name, host, port, username, password, apiType }, owner) {
  const devices = loadDevices();
  const now = new Date().toISOString();
  const device = {
    id: uuidv4(),
    name,
    host,
    port: parseInt(port) || 8728,
    username,
    password: encrypt(password),
    apiType: apiType || 'api',
    status: 'unknown',
    lastSeen: null,
    createdAt: now,
    updatedAt: now,
    ownerId: owner ? owner.id : null,
    ownerUsername: owner ? owner.username : null,
    ownerRole: owner ? owner.role : null
  };
  devices.push(device);
  saveDevices(devices);
  return device;
}

function updateDevice(id, updates) {
  const devices = loadDevices();
  const idx = devices.findIndex(d => d.id === id);
  if (idx === -1) return null;
  const d = devices[idx];
  if (updates.name !== undefined) d.name = updates.name;
  if (updates.host !== undefined) d.host = updates.host;
  if (updates.port !== undefined) d.port = parseInt(updates.port);
  if (updates.username !== undefined) d.username = updates.username;
  if (updates.password !== undefined && updates.password !== '' ) d.password = encrypt(updates.password);
  if (updates.apiType !== undefined) d.apiType = updates.apiType;
  d.updatedAt = new Date().toISOString();
  devices[idx] = d;
  saveDevices(devices);
  return d;
}

function deleteDevice(id) {
  let devices = loadDevices();
  const before = devices.length;
  devices = devices.filter(d => d.id !== id);
  saveDevices(devices);
  return before !== devices.length;
}

function updateDeviceStatus(id, status) {
  const devices = loadDevices();
  const idx = devices.findIndex(d => d.id === id);
  if (idx === -1) return;
  devices[idx].status = status;
  devices[idx].lastSeen = status === 'online' ? new Date().toISOString() : devices[idx].lastSeen;
  devices[idx].updatedAt = new Date().toISOString();
  saveDevices(devices);
}

// History handling - in memory + file persistence
let memoryHistory = {}; // { deviceId: { interfaceName: [{rx,tx,timestamp}] } }
let loaded = false;
function loadHistory() {
  if (loaded) return memoryHistory;
  ensureDataDir();
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
    memoryHistory = JSON.parse(raw);
    loaded = true;
  } catch (e) {
    memoryHistory = {};
    loaded = true;
  }
  return memoryHistory;
}

function saveHistoryToFile() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(memoryHistory, null, 2));
  } catch (e) {
    console.error('saveHistory error', e.message);
  }
}

// keep history every 5 sec save
setInterval(saveHistoryToFile, 5000);

function addHistory(deviceId, iface, rx, tx) {
  loadHistory();
  if (!memoryHistory[deviceId]) memoryHistory[deviceId] = {};
  if (!memoryHistory[deviceId][iface]) memoryHistory[deviceId][iface] = [];
  const entry = { rx, tx, timestamp: Date.now() };
  memoryHistory[deviceId][iface].push(entry);
  // keep ~3.5 days at 5s interval ~ 60000 points, limit to 60000
  const maxPoints = 60000;
  if (memoryHistory[deviceId][iface].length > maxPoints) {
    memoryHistory[deviceId][iface] = memoryHistory[deviceId][iface].slice(-maxPoints);
  }
  // also downsample for older? keep simple for MVP
}

function getHistory(deviceId, iface, limit = 200) {
  loadHistory();
  const arr = (memoryHistory[deviceId] && memoryHistory[deviceId][iface]) || [];
  if (limit) return arr.slice(-limit);
  return arr;
}

function getHistoryRange(deviceId, iface, hours = 24) {
  loadHistory();
  const arr = (memoryHistory[deviceId] && memoryHistory[deviceId][iface]) || [];
  const cutoff = Date.now() - hours * 3600 * 1000;
  return arr.filter(e => e.timestamp >= cutoff);
}

module.exports = {
  loadDevices,
  saveDevices,
  getAllDevicesMasked,
  getDevicesForUser,
  canAccessDevice,
  getDeviceById,
  getDeviceDecrypted,
  createDevice,
  updateDevice,
  deleteDevice,
  updateDeviceStatus,
  addHistory,
  getHistory,
  getHistoryRange,
  loadHistory,
  encrypt,
  decrypt
};
