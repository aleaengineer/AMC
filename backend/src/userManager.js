const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
    // seed default admin
    seedDefaultAdmin();
  }
}

function loadUsers() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const arr = JSON.parse(raw);
    // if empty, seed
    if (arr.length === 0) {
      seedDefaultAdmin();
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
    return arr;
  } catch (e) {
    return [];
  }
}

function seedDefaultAdmin() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const arr = JSON.parse(raw);
    if (arr.some(u => u.username === 'admin')) return;
  } catch (_) {}
  const hash = bcrypt.hashSync('aleale', 10);
  const admin = {
    id: uuidv4(),
    username: 'admin',
    password: hash,
    role: 'admin',
    name: 'Administrator',
    email: 'admin@afnalink.local',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const teknisi = {
    id: uuidv4(),
    username: 'teknisi',
    password: bcrypt.hashSync('teknisi123', 10),
    role: 'teknisi',
    name: 'Teknisi AFNA',
    email: 'teknisi@afnalink.local',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const pop = {
    id: uuidv4(),
    username: 'pop',
    password: bcrypt.hashSync('pop123', 10),
    role: 'pop',
    name: 'POP AFNA',
    email: 'pop@afnalink.local',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(USERS_FILE, JSON.stringify([admin, pop, teknisi], null, 2));
  console.log('[Users] Seeded default users: admin/aleale, pop/pop123, teknisi/teknisi123');
}

function saveUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getAllUsersMasked() {
  return loadUsers().map(u => ({
    id: u.id,
    username: u.username,
    role: u.role,
    name: u.name,
    email: u.email,
    active: u.active,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    createdBy: u.createdBy || null
  }));
}

function getUsersForRequester(requester) {
  const all = getAllUsersMasked();
  if (!requester) return [];
  if (requester.role === 'admin') return all;
  if (requester.role === 'pop') {
    // pop only sees teknisi they created
    return all.filter(u => u.role === 'teknisi' && u.createdBy === requester.id);
  }
  // teknisi sees none for user management
  return [];
}

function getUserById(id) {
  return loadUsers().find(u => u.id === id);
}

function getUserByUsername(username) {
  return loadUsers().find(u => u.username === username);
}

function createUser({ username, password, role, name, email }, creator) {
  const users = loadUsers();
  if (users.some(u => u.username === username)) throw new Error('Username already exists');
  if (!['admin', 'pop', 'teknisi'].includes(role)) throw new Error('Invalid role');
  // pop can only create teknisi
  if (creator && creator.role === 'pop' && role !== 'teknisi') {
    throw new Error('Pop hanya bisa membuat user teknisi');
  }
  // teknisi cannot create users
  if (creator && creator.role === 'teknisi') {
    throw new Error('Teknisi tidak bisa membuat user');
  }
  const now = new Date().toISOString();
  const user = {
    id: uuidv4(),
    username,
    password: bcrypt.hashSync(password, 10),
    role,
    name: name || username,
    email: email || '',
    active: true,
    createdAt: now,
    updatedAt: now,
    createdBy: creator ? creator.id : null,
    createdByUsername: creator ? creator.username : 'system'
  };
  users.push(user);
  saveUsers(users);
  const { password: _, ...masked } = user;
  return masked;
}

function updateUser(id, updates) {
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  const u = users[idx];
  if (updates.username !== undefined) {
    if (users.some(x => x.username === updates.username && x.id !== id)) throw new Error('Username already exists');
    u.username = updates.username;
  }
  if (updates.password && updates.password !== '') {
    u.password = bcrypt.hashSync(updates.password, 10);
  }
  if (updates.role !== undefined) {
    if (!['admin', 'pop', 'teknisi'].includes(updates.role)) throw new Error('Invalid role');
    u.role = updates.role;
  }
  if (updates.name !== undefined) u.name = updates.name;
  if (updates.email !== undefined) u.email = updates.email;
  if (updates.active !== undefined) u.active = !!updates.active;
  u.updatedAt = new Date().toISOString();
  users[idx] = u;
  saveUsers(users);
  const { password: _, ...masked } = u;
  return masked;
}

function deleteUser(id) {
  let users = loadUsers();
  const before = users.length;
  users = users.filter(u => u.id !== id);
  if (users.length === before) return false;
  // prevent deleting last admin
  const remainingAdmins = users.filter(u => u.role === 'admin');
  if (remainingAdmins.length === 0) throw new Error('Cannot delete last admin');
  saveUsers(users);
  return true;
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

module.exports = {
  loadUsers,
  getAllUsersMasked,
  getUsersForRequester,
  getUserById,
  getUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  verifyPassword,
  seedDefaultAdmin
};
