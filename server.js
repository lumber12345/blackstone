'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const express = require('express');
const helmet = require('helmet');
const { Server } = require('socket.io');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const scryptAsync = promisify(crypto.scrypt);

let pool;
let demoDb = false;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ...(IS_PROD ? { ssl: { rejectUnauthorized: false } } : {}),
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
} else if (!IS_PROD) {
  /* Ephemeral local preview only. Render always uses DATABASE_URL/Postgres. */
  const { newDb } = require('pg-mem');
  const mem = newDb({ autoCreateForeignKeyIndices: true });
  const { Pool } = mem.adapters.createPg();
  pool = new Pool();
  demoDb = true;
} else {
  throw new Error('DATABASE_URL is required in production.');
}

const app = express();
const server = http.createServer(app);
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false, // The game uses inline style attributes; script files remain same-origin.
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '8kb' }));
app.use((req, _res, next) => { if (!req.body) req.body = {}; next(); });

const io = new Server(server, {
  serveClient: true,
  maxHttpBufferSize: 64 * 1024,
  allowRequest(req, done) {
    const origin = req.headers.origin;
    if (!origin) return done(null, true);
    try {
      return done(null, new URL(origin).host === req.headers.host);
    } catch (_) {
      return done('Invalid Origin', false);
    }
  }
});

const randomToken = () => crypto.randomBytes(32).toString('base64url');
const hashToken = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const jsonError = (res, status, message) => res.status(status).json({ error: message });
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function initDatabase() {
  await pool.query(fs.readFileSync(path.join(ROOT, 'server', 'schema.sql'), 'utf8'));
  // Retire legacy email verification/reset links; existing email addresses remain private and untouched.
  await pool.query(`UPDATE users SET verify_token_hash=NULL,verify_expires_at=NULL,reset_token_hash=NULL,reset_expires_at=NULL
    WHERE verify_token_hash IS NOT NULL OR verify_expires_at IS NOT NULL OR reset_token_hash IS NOT NULL OR reset_expires_at IS NOT NULL`);
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const N = 32768, r = 8, p = 1;
  const derived = await scryptAsync(password, salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}
async function checkPassword(password, encoded) {
  try {
    const [kind, n, r, p, saltText, hashText] = String(encoded).split('$');
    if (kind !== 'scrypt') return false;
    const expected = Buffer.from(hashText, 'base64url');
    const actual = Buffer.from(await scryptAsync(password, Buffer.from(saltText, 'base64url'), expected.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024
    }));
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch (_) { return false; }
}

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch (_) { return ''; }
    }
  }
  return '';
}
function setSessionCookie(res, token) {
  const bits = [`bsid=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${Math.floor(SESSION_MS / 1000)}`];
  if (IS_PROD) bits.push('Secure');
  res.setHeader('Set-Cookie', bits.join('; '));
}
function clearSessionCookie(res) {
  const bits = ['bsid=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (IS_PROD) bits.push('Secure');
  res.setHeader('Set-Cookie', bits.join('; '));
}
async function findSession(token) {
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.username
       FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.expires_at > NOW()`,
    [hashToken(token)]
  );
  return rows[0] || null;
}
async function requireAuth(req, res, next) {
  try {
    const user = await findSession(getCookie(req, 'bsid'));
    if (!user) return jsonError(res, 401, 'Please sign in again.');
    req.user = user;
    next();
  } catch (err) { next(err); }
}
async function createSession(userId, res) {
  const token = randomToken();
  const now = new Date();
  await pool.query('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES ($1,$2,$3,$4)',
    [hashToken(token), userId, new Date(now.getTime() + SESSION_MS), now]);
  setSessionCookie(res, token);
}
/* Basic per-IP throttling, sufficient for the single-instance demo. */
const buckets = new Map();
function rateLimit({ max, windowMs }) {
  return (req, res, next) => {
    const key = `${req.ip || 'unknown'}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || b.until <= now) { b = { count: 0, until: now + windowMs }; buckets.set(key, b); }
    b.count++;
    if (b.count > max) return jsonError(res, 429, 'Too many attempts. Please wait a little and try again.');
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key);
}, 60_000).unref();

/* Cookie auth is same-origin only. Reject browser requests from other origins. */
app.use('/api', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin');
  const site = req.get('sec-fetch-site');
  if (site === 'cross-site') return jsonError(res, 403, 'Cross-site request rejected.');
  if (origin) {
    try {
      if (new URL(origin).host !== req.get('host')) return jsonError(res, 403, 'Cross-origin request rejected.');
    } catch (_) { return jsonError(res, 403, 'Invalid request origin.'); }
  }
  next();
});

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, database: demoDb ? 'ephemeral-demo' : 'postgres', temporaryDatabase: process.env.DEMO_DATABASE === 'true' });
}));

app.get('/api/auth/me', asyncRoute(async (req, res) => {
  const user = await findSession(getCookie(req, 'bsid'));
  if (!user) return res.json({ user: null, save: null });
  const { rows } = await pool.query('SELECT data FROM player_saves WHERE user_id=$1', [user.id]);
  res.json({ user: { id: user.id, username: user.username }, save: rows[0]?.data || null });
}));

app.post('/api/auth/signup', rateLimit({ max: 5, windowMs: 15 * 60_000 }), asyncRoute(async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!/^[A-Za-z0-9_]{3,18}$/.test(username)) return jsonError(res, 400, 'Username must be 3–18 characters using letters, numbers, or underscores.');
  if (password.length < 12 || password.length > 128) return jsonError(res, 400, 'Password must be 12–128 characters.');
  const id = crypto.randomUUID();
  const created = new Date();
  const passwordHash = await hashPassword(password);
  try {
    await pool.query(
      `INSERT INTO users (id,username,username_key,password_hash,verified_at,created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, username, username.toLowerCase(), passwordHash, created, created]
    );
  } catch (err) {
    if (err.code === '23505' || /unique|duplicate/i.test(err.message || '')) return jsonError(res, 409, 'That username is already taken.');
    throw err;
  }
  await createSession(id, res);
  res.status(201).json({ ok: true, user: { id, username } });
}));

app.post('/api/auth/login', rateLimit({ max: 10, windowMs: 15 * 60_000 }), asyncRoute(async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!/^[a-z0-9_]{3,18}$/.test(username) || password.length > 128) return jsonError(res, 400, 'Enter your username and password.');
  const { rows } = await pool.query('SELECT id,username,password_hash FROM users WHERE username_key=$1 LIMIT 1', [username]);
  const user = rows[0];
  if (!user || !(await checkPassword(password, user.password_hash))) return jsonError(res, 401, 'Incorrect username or password.');
  const old = getCookie(req, 'bsid');
  if (old) await pool.query('DELETE FROM sessions WHERE token_hash=$1', [hashToken(old)]);
  await createSession(user.id, res);
  res.json({ ok: true, user: { id: user.id, username: user.username } });
}));

app.post('/api/auth/logout', asyncRoute(async (req, res) => {
  const token = getCookie(req, 'bsid');
  if (token) {
    const hash = hashToken(token);
    await pool.query('DELETE FROM sessions WHERE token_hash=$1', [hash]);
    for (const socket of io.sockets.sockets.values()) if (socket.data.sessionHash === hash) socket.disconnect(true);
  }
  clearSessionCookie(res);
  res.json({ ok: true });
}));

function safeSave(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid save format.');
  const data = JSON.parse(JSON.stringify(input));
  if (data.v !== 1 || typeof data.name !== 'string' || !data.name.trim() || data.name.length > 18) throw new Error('Unsupported or invalid character save.');
  const bytes = Buffer.byteLength(JSON.stringify(data), 'utf8');
  if (bytes > 150_000) throw new Error('Save file is too large.');
  if (!Number.isInteger(data.level) || data.level < 1 || data.level > 200) throw new Error('Invalid character level.');
  return data;
}

app.get('/api/game/save', requireAuth, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT data,updated_at FROM player_saves WHERE user_id=$1', [req.user.id]);
  res.json({ save: rows[0]?.data || null, updatedAt: rows[0]?.updated_at || null });
}));
app.put('/api/game/save', requireAuth, asyncRoute(async (req, res) => {
  let save;
  try { save = safeSave((req.body || {}).save); }
  catch (err) { return jsonError(res, 400, err.message); }
  const updatedAt = new Date();
  await pool.query(
    `INSERT INTO player_saves (user_id,data,updated_at) VALUES ($1,$2,$3)
     ON CONFLICT (user_id) DO UPDATE SET data=EXCLUDED.data,updated_at=EXCLUDED.updated_at`,
    [req.user.id, save, updatedAt]
  );
  res.json({ ok: true, updatedAt });
}));
app.delete('/api/game/save', requireAuth, asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM player_saves WHERE user_id=$1', [req.user.id]);
  res.json({ ok: true });
}));

function profileFrom(row) {
  const save = row.data || {};
  const stats = save.stats || {};
  const kills = Object.values(save.kills || {}).reduce((a, n) => a + (Number(n) || 0), 0);
  return {
    id: row.id,
    username: row.username,
    character: String(save.name || row.username).slice(0, 18),
    avatar: String(save.avatar || '🕵️').slice(0, 12),
    level: Math.max(1, Math.min(200, Number(save.level) || 1)),
    kills: Math.max(0, Number(stats.kills) || kills),
    played: Math.max(0, Math.floor(Number(save.played) || 0)),
    joined: row.created_at,
    updatedAt: row.updated_at
  };
}
app.get('/api/players', requireAuth, asyncRoute(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id,u.username,u.created_at,ps.data,ps.updated_at
       FROM users u JOIN player_saves ps ON ps.user_id=u.id
      ORDER BY ps.updated_at DESC LIMIT 100`
  );
  const profiles = rows.map(profileFrom).sort((a, b) => b.level - a.level || b.kills - a.kills || a.username.localeCompare(b.username));
  res.json({ players: profiles, total: profiles.length });
}));
app.get('/api/players/:id', requireAuth, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id,u.username,u.created_at,ps.data,ps.updated_at
       FROM users u JOIN player_saves ps ON ps.user_id=u.id
      WHERE u.id=$1`, [req.params.id]
  );
  if (!rows[0]) return jsonError(res, 404, 'Player not found.');
  res.json({ player: profileFrom(rows[0]) });
}));

app.get('/api/chat/recent', requireAuth, asyncRoute(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT m.id,m.user_id,u.username,m.body,m.created_at
       FROM city_messages m JOIN users u ON u.id=m.user_id
      ORDER BY m.created_at DESC LIMIT 50`
  );
  res.json({ messages: rows.reverse().map(r => ({ id: r.id, userId: r.user_id, username: r.username, body: r.body, createdAt: r.created_at })) });
}));

app.get('/api/messages/:playerId', requireAuth, asyncRoute(async (req, res) => {
  if (req.params.playerId === req.user.id) return jsonError(res, 400, 'Choose another player.');
  const { rows: target } = await pool.query('SELECT id,username FROM users WHERE id=$1', [req.params.playerId]);
  if (!target[0]) return jsonError(res, 404, 'Player not found.');
  const { rows } = await pool.query(
    `SELECT m.id,m.sender_id,m.recipient_id,s.username AS sender_name,m.body,m.created_at
       FROM direct_messages m JOIN users s ON s.id=m.sender_id
      WHERE (m.sender_id=$1 AND m.recipient_id=$2) OR (m.sender_id=$2 AND m.recipient_id=$1)
      ORDER BY m.created_at DESC LIMIT 50`, [req.user.id, req.params.playerId]
  );
  res.json({ player: target[0], messages: rows.reverse().map(r => ({ id: r.id, senderId: r.sender_id, recipientId: r.recipient_id, sender: r.sender_name, body: r.body, createdAt: r.created_at })) });
}));
app.post('/api/messages/:playerId', requireAuth, rateLimit({ max: 30, windowMs: 60_000 }), asyncRoute(async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body || body.length > 500) return jsonError(res, 400, 'Message must be 1–500 characters.');
  if (req.params.playerId === req.user.id) return jsonError(res, 400, 'You cannot message yourself.');
  const { rows: target } = await pool.query('SELECT id,username FROM users WHERE id=$1', [req.params.playerId]);
  if (!target[0]) return jsonError(res, 404, 'Player not found.');
  const id = crypto.randomUUID(), createdAt = new Date();
  await pool.query('INSERT INTO direct_messages (id,sender_id,recipient_id,body,created_at) VALUES ($1,$2,$3,$4,$5)',
    [id, req.user.id, target[0].id, body, createdAt]);
  const message = { id, senderId: req.user.id, recipientId: target[0].id, sender: req.user.username, body, createdAt };
  io.to(`user:${target[0].id}`).emit('dm:new', message);
  res.status(201).json({ message });
}));

const onlineUsers = new Map();
function sendPresence() {
  io.to('city').emit('presence:update', {
    count: onlineUsers.size,
    players: [...onlineUsers.values()].map(x => ({ id: x.id, username: x.username }))
  });
}
const socketRate = new Map();
function allowedSocketMessage(socket) {
  const now = Date.now();
  const state = socketRate.get(socket.id) || { start: now, count: 0 };
  if (now - state.start > 10_000) { state.start = now; state.count = 0; }
  state.count++;
  socketRate.set(socket.id, state);
  return state.count <= 6;
}
io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie || '';
    const fakeReq = { headers: { cookie: cookieHeader } };
    const token = getCookie(fakeReq, 'bsid');
    const user = await findSession(token);
    if (!user) return next(new Error('Sign in required.'));
    socket.data.user = { id: user.id, username: user.username };
    socket.data.sessionHash = hashToken(token);
    next();
  } catch (err) { next(err); }
});
io.on('connection', async socket => {
  const user = socket.data.user;
  socket.join('city');
  socket.join(`user:${user.id}`);
  const current = onlineUsers.get(user.id) || { id: user.id, username: user.username, sockets: 0 };
  current.sockets++;
  onlineUsers.set(user.id, current);
  sendPresence();
  try {
    const { rows } = await pool.query(
      `SELECT m.id,m.user_id,u.username,m.body,m.created_at FROM city_messages m
        JOIN users u ON u.id=m.user_id ORDER BY m.created_at DESC LIMIT 50`
    );
    socket.emit('chat:history', rows.reverse().map(r => ({ id: r.id, userId: r.user_id, username: r.username, body: r.body, createdAt: r.created_at })));
  } catch (err) { console.error('chat history failed:', err.message); }
  socket.on('chat:send', async (payload, ack) => {
    try {
      if (!allowedSocketMessage(socket)) return typeof ack === 'function' && ack({ error: 'Slow down for a moment.' });
      const body = String(payload?.body || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
      if (!body || body.length > 280) return typeof ack === 'function' && ack({ error: 'Chat messages must be 1–280 characters.' });
      const id = crypto.randomUUID(), createdAt = new Date();
      await pool.query('INSERT INTO city_messages (id,user_id,body,created_at) VALUES ($1,$2,$3,$4)', [id, user.id, body, createdAt]);
      await pool.query(`DELETE FROM city_messages WHERE id IN (SELECT id FROM city_messages ORDER BY created_at DESC OFFSET 500)`);
      const message = { id, userId: user.id, username: user.username, body, createdAt };
      io.to('city').emit('chat:new', message);
      if (typeof ack === 'function') ack({ ok: true });
    } catch (err) {
      console.error('chat send failed:', err.message);
      if (typeof ack === 'function') ack({ error: 'Message could not be sent.' });
    }
  });
  socket.on('disconnect', () => {
    socketRate.delete(socket.id);
    const entry = onlineUsers.get(user.id);
    if (entry) {
      entry.sockets--;
      if (entry.sockets <= 0) onlineUsers.delete(user.id);
      else onlineUsers.set(user.id, entry);
      sendPresence();
    }
  });
});

/* Serve only the actual game assets; never expose server code, config, or the repository root. */
app.use('/css', express.static(path.join(ROOT, 'css'), { fallthrough: false, maxAge: IS_PROD ? '1h' : 0 }));
app.use('/js', express.static(path.join(ROOT, 'js'), { fallthrough: false, maxAge: IS_PROD ? '1h' : 0 }));
app.get('/', (_req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/favicon.ico', (_req, res) => res.status(204).end());
app.use('/api', (_req, res) => jsonError(res, 404, 'Not found.'));
app.use((err, _req, res, _next) => {
  if (res.headersSent) return;
  console.error('request error:', err.message);
  const status = Number(err.status || err.statusCode) || 500;
  res.status(status).json({ error: status >= 500 ? 'Server error. Try again in a moment.' : err.message });
});

initDatabase().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`BLACKSTONE online listening on 0.0.0.0:${PORT}${demoDb ? ' (ephemeral in-memory database)' : ''}`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

module.exports = { app, server, pool };
