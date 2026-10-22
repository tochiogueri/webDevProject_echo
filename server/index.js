require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { pool, setupDatabase, saveTrack } = require('./db');
const { MOODS, validTrack, searchMusic, generateMusic } = require('./music');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET;
const prod = process.env.NODE_ENV === 'production';
if (!SECRET || SECRET.length < 32) {
  console.error('Set JWT_SECRET to a random string at least 32 characters long in .env');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL in .env');
  process.exit(1);
}

if (prod) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
  imgSrc: ["'self'", 'https:', 'data:'], mediaSrc: ["'self'", 'https:', 'blob:'],
  connectSrc: ["'self'"], objectSrc: ["'none'"], upgradeInsecureRequests: prod ? [] : null
}} }));
app.use(express.json({ limit: '35kb' }));
app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: 25, standardHeaders: 'draft-7', legacyHeaders: false }));

// Protect cookie-authenticated actions against cross-origin requests.
app.use('/api', (req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    if (origin && (() => { try { return new URL(origin).host !== req.get('host'); } catch { return true; } })()) {
      return res.status(403).json({ error: 'Cross-site request blocked.' });
    }
  }
  next();
});

function wrap(fn) { return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); }
function bad(res, text, status = 400) { return res.status(status).json({ error: text }); }
function text(value, max = 100) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function int(value) { const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : null; }
function userPublic(row) { return { id: row.id, username: row.username, display_name: row.display_name, bio: row.bio, created_at: row.created_at }; }
function setLogin(res, user) {
  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '7d' });
  res.cookie('echo_token', token, { httpOnly: true, secure: prod, sameSite: 'strict', maxAge: 7 * 86400000, path: '/' });
}
app.use('/api', (req, _res, next) => {
  req.userId = null;
  try { req.userId = jwt.verify(req.cookies.echo_token || '', SECRET).id || null; } catch { /* guest */ }
  next();
});
function requireAuth(req, res, next) { if (!req.userId) return bad(res, 'Please log in to continue.', 401); next(); }
async function findUser(id) {
  const r = await pool.query('SELECT id, username, display_name, bio, created_at FROM users WHERE id=$1', [id]);
  return r.rows[0];
}

// ACCOUNT --------------------------------------------------------------------
app.post('/api/auth/register', wrap(async (req, res) => {
  const username = text(req.body.username, 30).toLowerCase();
  const email = text(req.body.email, 255).toLowerCase();
  const displayName = text(req.body.display_name, 60) || username;
  const password = req.body.password;
  if (!/^[a-z0-9_]{3,30}$/.test(username)) return bad(res, 'Username: 3–30 letters, numbers or underscores.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(res, 'Enter a valid email address.');
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) return bad(res, 'Password must be 8–72 characters.');
  const hash = await bcrypt.hash(password, 12);
  try {
    const r = await pool.query('INSERT INTO users (username,email,password_hash,display_name) VALUES ($1,$2,$3,$4) RETURNING id, username, display_name, bio, created_at', [username, email, hash, displayName]);
    setLogin(res, r.rows[0]);
    res.status(201).json({ user: userPublic(r.rows[0]) });
  } catch (err) {
    if (err.code === '23505') return bad(res, 'Username or email already exists.', 409);
    throw err;
  }
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const login = text(req.body.login, 255).toLowerCase();
  const r = await pool.query('SELECT * FROM users WHERE username=$1 OR email=$1', [login]);
  const user = r.rows[0];
  if (!user || typeof req.body.password !== 'string' || !(await bcrypt.compare(req.body.password, user.password_hash))) return bad(res, 'Incorrect login or password.', 401);
  setLogin(res, user);
  res.json({ user: userPublic(user) });
}));
app.post('/api/auth/logout', (_req, res) => { res.clearCookie('echo_token', { httpOnly: true, secure: prod, sameSite: 'strict', path: '/' }); res.json({ ok: true }); });
app.get('/api/auth/me', wrap(async (req, res) => res.json({ user: req.userId ? (await findUser(req.userId)) || null : null })));
app.patch('/api/profile', requireAuth, wrap(async (req, res) => {
  const displayName = text(req.body.display_name, 60);
  const bio = text(req.body.bio, 160);
  if (!displayName) return bad(res, 'Enter a display name.');
  const r = await pool.query('UPDATE users SET display_name=$1,bio=$2 WHERE id=$3 RETURNING id,username,display_name,bio,created_at', [displayName, bio, req.userId]);
  res.json({ user: r.rows[0] });
}));
app.delete('/api/profile', requireAuth, wrap(async (req, res) => {
  const r = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.userId]);
  if (!r.rows[0] || typeof req.body.password !== 'string' || !(await bcrypt.compare(req.body.password, r.rows[0].password_hash))) return bad(res, 'Password is incorrect.', 403);
  await pool.query('DELETE FROM users WHERE id=$1', [req.userId]);
  res.clearCookie('echo_token', { path: '/', secure: prod, sameSite: 'strict', httpOnly: true });
  res.json({ ok: true });
}));

// MUSIC SEARCH: iTunes REST API -----------------------------------------------
app.get('/api/music/search', wrap(async (req, res) => {
  const query = text(req.query.q, 100);
  if (!query) return res.json({ tracks: [] });
  let tracks = await searchMusic(query, 65);
  const genre = text(req.query.genre, 60).toLowerCase();
  if (genre && genre !== 'all') tracks = tracks.filter(t => t.genre.toLowerCase().includes(genre));
  if (req.query.sort === 'artist') tracks.sort((a, b) => a.artist.localeCompare(b.artist));
  if (req.query.sort === 'title') tracks.sort((a, b) => a.title.localeCompare(b.title));
  res.json({ tracks: tracks.slice(0, 48) });
}));
app.get('/api/music/moods', (_req, res) => res.json({ moods: MOODS }));
app.get('/api/music/generate', wrap(async (req, res) => {
  const result = await generateMusic(text(req.query.mood, 40));
  if (!result) return bad(res, 'Choose a valid mood.');
  res.json(result);
}));

// REAL music recognition needs your own AudD token (no pretend recognition).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
app.get('/api/music/recognition-status', (_req, res) => res.json({ available: Boolean(process.env.AUDD_API_TOKEN) }));
app.post('/api/music/recognize', requireAuth, upload.single('audio'), wrap(async (req, res) => {
  if (!process.env.AUDD_API_TOKEN) return bad(res, 'Music recognition requires an AUDD_API_TOKEN in your .env file.', 503);
  if (!req.file || !/^audio\//.test(req.file.mimetype) && !['application/octet-stream','video/webm'].includes(req.file.mimetype)) return bad(res, 'Upload or record an audio clip.');
  const form = new FormData();
  form.append('api_token', process.env.AUDD_API_TOKEN);
  form.append('return', 'apple_music,spotify');
  form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname || 'clip.webm');
  const response = await fetch('https://api.audd.io/', { method: 'POST', body: form, signal: AbortSignal.timeout(25000) });
  if (!response.ok) return bad(res, 'Recognition provider is currently unavailable.', 502);
  const result = await response.json();
  if (result.status !== 'success') return bad(res, 'Recognition service rejected this request. Check your AudD token.', 502);
  if (!result.result) return res.json({ recognized: false });
  const recognized = { title: result.result.title, artist: result.result.artist, album: result.result.album };
  let matches = [];
  try { matches = await searchMusic(`${recognized.title} ${recognized.artist}`, 8); } catch { /* recognition still valid */ }
  res.json({ recognized: true, match: recognized, tracks: matches });
}));

// SAVED TRACKS ----------------------------------------------------------------
app.get('/api/favorites', requireAuth, wrap(async (req, res) => {
  const r = await pool.query(`SELECT t.* FROM tracks t JOIN favorites f ON f.track_id=t.id
    WHERE f.user_id=$1 ORDER BY f.created_at DESC`, [req.userId]);
  res.json({ tracks: r.rows });
}));
app.post('/api/favorites', requireAuth, wrap(async (req, res) => {
  if (!validTrack(req.body.track)) return bad(res, 'Invalid song information.');
  await saveTrack(pool, req.body.track);
  await pool.query('INSERT INTO favorites(user_id,track_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [req.userId, req.body.track.id]);
  res.status(201).json({ ok: true });
}));
app.delete('/api/favorites/:id', requireAuth, wrap(async (req, res) => {
  if (!int(req.params.id)) return bad(res, 'Invalid song ID.');
  await pool.query('DELETE FROM favorites WHERE user_id=$1 AND track_id=$2', [req.userId, req.params.id]);
  res.json({ ok: true });
}));

// PLAYLISTS: public search, personal CRUD, contributors -----------------------
const playlistSummary = `SELECT p.*, u.username AS owner_username,
  (SELECT COUNT(*)::int FROM playlist_tracks pt WHERE pt.playlist_id=p.id) AS track_count,
  (SELECT COUNT(*)::int FROM playlist_members pm WHERE pm.playlist_id=p.id) AS member_count
  FROM playlists p JOIN users u ON u.id=p.owner_id`;
app.get('/api/playlists/public', wrap(async (req, res) => {
  const q = `%${text(req.query.q, 100)}%`;
  const r = await pool.query(`${playlistSummary} WHERE p.visibility='public' AND
    (p.name ILIKE $1 OR p.description ILIKE $1 OR u.username ILIKE $1)
    ORDER BY p.created_at DESC LIMIT 50`, [q]);
  res.json({ playlists: r.rows });
}));
app.get('/api/playlists/mine', requireAuth, wrap(async (req, res) => {
  const r = await pool.query(`${playlistSummary} WHERE p.owner_id=$1 OR EXISTS
    (SELECT 1 FROM playlist_members m WHERE m.playlist_id=p.id AND m.user_id=$1)
    ORDER BY p.created_at DESC`, [req.userId]);
  res.json({ playlists: r.rows });
}));
app.post('/api/playlists', requireAuth, wrap(async (req, res) => {
  const name = text(req.body.name, 100);
  if (!name) return bad(res, 'Playlist name is required.');
  const description = text(req.body.description, 240);
  const visibility = req.body.visibility === 'public' ? 'public' : 'private';
  const r = await pool.query(`INSERT INTO playlists (owner_id,name,description,visibility)
    VALUES ($1,$2,$3,$4) RETURNING *`, [req.userId, name, description, visibility]);
  res.status(201).json({ playlist: r.rows[0] });
}));
async function permission(playlistId, userId) {
  const r = await pool.query(`SELECT p.*, EXISTS(SELECT 1 FROM playlist_members m WHERE m.playlist_id=p.id AND m.user_id=$2) AS is_member
    FROM playlists p WHERE p.id=$1`, [playlistId, userId || 0]);
  const p = r.rows[0];
  if (!p) return null;
  return { ...p, is_owner: p.owner_id === userId, can_edit: p.owner_id === userId || p.is_member };
}
app.get('/api/playlists/:id', wrap(async (req, res) => {
  const id = int(req.params.id);
  if (!id) return bad(res, 'Invalid playlist ID.');
  const p = await permission(id, req.userId);
  if (!p) return bad(res, 'Playlist not found.', 404);
  if (p.visibility !== 'public' && !p.can_edit) return bad(res, 'This playlist is private.', 403);
  const [tracks, members] = await Promise.all([
    pool.query(`SELECT t.*,pt.added_by, u.username AS contributor FROM playlist_tracks pt
      JOIN tracks t ON t.id=pt.track_id LEFT JOIN users u ON u.id=pt.added_by
      WHERE pt.playlist_id=$1 ORDER BY pt.added_at DESC`, [id]),
    pool.query(`SELECT u.username,u.display_name FROM playlist_members m JOIN users u ON u.id=m.user_id WHERE m.playlist_id=$1`, [id])
  ]);
  res.json({ playlist: p, tracks: tracks.rows, members: members.rows });
}));
app.patch('/api/playlists/:id', requireAuth, wrap(async (req, res) => {
  const p = await permission(int(req.params.id), req.userId);
  if (!p || !p.is_owner) return bad(res, 'Only the owner can edit this playlist.', 403);
  const name = text(req.body.name, 100);
  if (!name) return bad(res, 'Playlist name is required.');
  const visibility = req.body.visibility === 'public' ? 'public' : 'private';
  const r = await pool.query(`UPDATE playlists SET name=$1,description=$2,visibility=$3
    WHERE id=$4 RETURNING *`, [name, text(req.body.description, 240), visibility, p.id]);
  res.json({ playlist: r.rows[0] });
}));
app.delete('/api/playlists/:id', requireAuth, wrap(async (req, res) => {
  const r = await pool.query('DELETE FROM playlists WHERE id=$1 AND owner_id=$2 RETURNING id', [int(req.params.id), req.userId]);
  if (!r.rowCount) return bad(res, 'Playlist not found or not yours.', 403);
  res.json({ ok: true });
}));
app.post('/api/playlists/:id/tracks', requireAuth, wrap(async (req, res) => {
  const p = await permission(int(req.params.id), req.userId);
  if (!p || !p.can_edit) return bad(res, 'You cannot edit this playlist.', 403);
  if (!validTrack(req.body.track)) return bad(res, 'Invalid song information.');
  await saveTrack(pool, req.body.track);
  await pool.query(`INSERT INTO playlist_tracks (playlist_id,track_id,added_by) VALUES($1,$2,$3)
    ON CONFLICT DO NOTHING`, [p.id, req.body.track.id, req.userId]);
  res.status(201).json({ ok: true });
}));
app.post('/api/playlists/:id/tracks/bulk', requireAuth, wrap(async (req, res) => {
  const p = await permission(int(req.params.id), req.userId);
  if (!p || !p.can_edit) return bad(res, 'You cannot edit this playlist.', 403);
  const tracks = req.body.tracks;
  if (!Array.isArray(tracks) || tracks.length > 30 || !tracks.every(validTrack)) return bad(res, 'Choose up to 30 valid songs.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const track of tracks) {
      await saveTrack(client, track);
      await client.query('INSERT INTO playlist_tracks (playlist_id,track_id,added_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [p.id, track.id, req.userId]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  res.status(201).json({ ok: true, count: tracks.length });
}));
app.delete('/api/playlists/:id/tracks/:trackId', requireAuth, wrap(async (req, res) => {
  const p = await permission(int(req.params.id), req.userId);
  if (!p || !p.can_edit) return bad(res, 'You cannot edit this playlist.', 403);
  if (!int(req.params.trackId)) return bad(res, 'Invalid song ID.');
  // Collaborators can remove their own contributions. Owners can remove any track.
  const r = await pool.query(`DELETE FROM playlist_tracks WHERE playlist_id=$1 AND track_id=$2
    AND ($3::boolean OR added_by=$4) RETURNING track_id`, [p.id, req.params.trackId, p.is_owner, req.userId]);
  if (!r.rowCount) return bad(res, 'Song not found or added by someone else.', 403);
  res.json({ ok: true });
}));

// FRIENDS ---------------------------------------------------------------------
app.get('/api/users/search', wrap(async (req, res) => {
  const q = text(req.query.q, 40);
  if (q.length < 2) return res.json({ users: [] });
  const r = await pool.query('SELECT id,username,display_name,bio FROM users WHERE username ILIKE $1 AND id<>$2 LIMIT 20', [`%${q}%`, req.userId || 0]);
  res.json({ users: r.rows });
}));
app.get('/api/friends', requireAuth, wrap(async (req, res) => {
  const [friends, incoming, sent] = await Promise.all([
    pool.query(`SELECT u.id,u.username,u.display_name FROM friendships f JOIN users u ON
      u.id = CASE WHEN f.user_a=$1 THEN f.user_b ELSE f.user_a END
      WHERE f.user_a=$1 OR f.user_b=$1 ORDER BY u.username`, [req.userId]),
    pool.query(`SELECT r.id,r.sender_id,u.username,u.display_name FROM friend_requests r JOIN users u ON u.id=r.sender_id
      WHERE r.receiver_id=$1 AND r.status='pending' ORDER BY r.created_at DESC`, [req.userId]),
    pool.query(`SELECT r.id,u.username FROM friend_requests r JOIN users u ON u.id=r.receiver_id
      WHERE r.sender_id=$1 AND r.status='pending'`, [req.userId])
  ]);
  res.json({ friends: friends.rows, incoming: incoming.rows, sent: sent.rows });
}));
app.post('/api/friends/requests', requireAuth, wrap(async (req, res) => {
  const username = text(req.body.username, 30).toLowerCase();
  const r = await pool.query('SELECT id FROM users WHERE username=$1', [username]);
  const target = r.rows[0];
  if (!target || target.id === req.userId) return bad(res, 'Choose another registered user.');
  const a = Math.min(target.id, req.userId), b = Math.max(target.id, req.userId);
  const existing = await pool.query('SELECT 1 FROM friendships WHERE user_a=$1 AND user_b=$2', [a, b]);
  if (existing.rowCount) return bad(res, 'You are already friends.');
  const reverse = await pool.query(`SELECT id FROM friend_requests WHERE sender_id=$1 AND receiver_id=$2 AND status='pending'`, [target.id, req.userId]);
  if (reverse.rowCount) return bad(res, 'This user has already sent you a friend request. Accept it instead.');
  await pool.query(`INSERT INTO friend_requests(sender_id,receiver_id,status) VALUES($1,$2,'pending')
    ON CONFLICT(sender_id,receiver_id) DO UPDATE SET status='pending',created_at=NOW()`, [req.userId, target.id]);
  res.status(201).json({ ok: true });
}));
app.post('/api/friends/requests/:id/respond', requireAuth, wrap(async (req, res) => {
  const accept = req.body.accept === true;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(`UPDATE friend_requests SET status=$1 WHERE id=$2 AND receiver_id=$3
      AND status='pending' RETURNING sender_id,receiver_id`, [accept ? 'accepted' : 'declined', int(req.params.id), req.userId]);
    if (!r.rowCount) { await client.query('ROLLBACK'); return bad(res, 'Request not found.', 404); }
    if (accept) {
      const { sender_id, receiver_id } = r.rows[0];
      await client.query(`INSERT INTO friendships(user_a,user_b) VALUES($1,$2) ON CONFLICT DO NOTHING`,
        [Math.min(sender_id,receiver_id), Math.max(sender_id,receiver_id)]);
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));
app.delete('/api/friends/:id', requireAuth, wrap(async (req, res) => {
  const other = int(req.params.id);
  if (!other) return bad(res, 'Invalid user.');
  await pool.query('DELETE FROM friendships WHERE user_a=$1 AND user_b=$2', [Math.min(other, req.userId), Math.max(other, req.userId)]);
  res.json({ ok: true });
}));

// COLLABORATIVE PLAYLIST INVITATIONS -----------------------------------------
app.get('/api/invitations', requireAuth, wrap(async (req, res) => {
  const r = await pool.query(`SELECT i.id,i.playlist_id,p.name AS playlist_name,u.username AS inviter
    FROM playlist_invitations i JOIN playlists p ON p.id=i.playlist_id
    JOIN users u ON u.id=i.inviter_id
    WHERE i.invitee_id=$1 AND i.status='pending' ORDER BY i.created_at DESC`, [req.userId]);
  res.json({ invitations: r.rows });
}));
app.post('/api/playlists/:id/invite', requireAuth, wrap(async (req, res) => {
  const p = await permission(int(req.params.id), req.userId);
  if (!p || !p.is_owner) return bad(res, 'Only the owner can invite collaborators.', 403);
  const r = await pool.query('SELECT id FROM users WHERE username=$1', [text(req.body.username, 30).toLowerCase()]);
  const user = r.rows[0];
  if (!user || user.id === req.userId) return bad(res, 'Choose a different registered user.');
  const a = Math.min(user.id, req.userId), b = Math.max(user.id, req.userId);
  const friends = await pool.query('SELECT 1 FROM friendships WHERE user_a=$1 AND user_b=$2', [a, b]);
  if (!friends.rowCount) return bad(res, 'You can only invite friends.');
  await pool.query(`INSERT INTO playlist_invitations (playlist_id,invitee_id,inviter_id,status)
    VALUES($1,$2,$3,'pending') ON CONFLICT (playlist_id,invitee_id)
    DO UPDATE SET status='pending',inviter_id=$3,created_at=NOW()`, [p.id, user.id, req.userId]);
  res.status(201).json({ ok: true });
}));
app.post('/api/invitations/:id/respond', requireAuth, wrap(async (req, res) => {
  const accept = req.body.accept === true;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(`UPDATE playlist_invitations SET status=$1 WHERE id=$2
      AND invitee_id=$3 AND status='pending' RETURNING playlist_id`, [accept ? 'accepted' : 'declined', int(req.params.id), req.userId]);
    if (!r.rowCount) { await client.query('ROLLBACK'); return bad(res, 'Invitation not found.', 404); }
    if (accept) await client.query('INSERT INTO playlist_members (playlist_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [r.rows[0].playlist_id, req.userId]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));
app.delete('/api/playlists/:id/leave', requireAuth, wrap(async (req, res) => {
  await pool.query('DELETE FROM playlist_members WHERE playlist_id=$1 AND user_id=$2', [int(req.params.id), req.userId]);
  res.json({ ok: true });
}));

// MUSIC DNA STATS: counts use real saved PostgreSQL data ----------------------
app.get('/api/dna', requireAuth, wrap(async (req, res) => {
  const [totals, genres, artists] = await Promise.all([
    pool.query(`SELECT
      (SELECT COUNT(*)::int FROM favorites WHERE user_id=$1) AS favorites,
      (SELECT COUNT(*)::int FROM playlists WHERE owner_id=$1) AS playlists,
      (SELECT COUNT(*)::int FROM friendships WHERE user_a=$1 OR user_b=$1) AS friends`, [req.userId]),
    pool.query(`WITH saved AS (
      SELECT track_id FROM favorites WHERE user_id=$1
      UNION SELECT pt.track_id FROM playlist_tracks pt JOIN playlists p ON p.id=pt.playlist_id WHERE p.owner_id=$1
    ) SELECT t.genre AS name,COUNT(*)::int AS count FROM saved s JOIN tracks t ON t.id=s.track_id
      GROUP BY t.genre ORDER BY count DESC LIMIT 6`, [req.userId]),
    pool.query(`WITH saved AS (
      SELECT track_id FROM favorites WHERE user_id=$1
      UNION SELECT pt.track_id FROM playlist_tracks pt JOIN playlists p ON p.id=pt.playlist_id WHERE p.owner_id=$1
    ) SELECT t.artist AS name,COUNT(*)::int AS count FROM saved s JOIN tracks t ON t.id=s.track_id
      GROUP BY t.artist ORDER BY count DESC LIMIT 5`, [req.userId])
  ]);
  res.json({ totals: totals.rows[0], genres: genres.rows, artists: artists.rows });
}));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: 'Audio must be under 8 MB.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

if (require.main === module) {
  setupDatabase().then(() => app.listen(PORT, () => console.log(`ECHO listening at http://localhost:${PORT}`)))
    .catch(error => { console.error('Database connection failed. Check PostgreSQL and DATABASE_URL.\n', error.message); process.exit(1); });
}
module.exports = app;