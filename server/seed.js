// OPTIONAL: npm run seed
// Creates two example accounts and sample songs for lecturer demonstrations.
// Do not run on your real/production database: both users have a public demo password.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, setupDatabase, saveTrack } = require('./db');

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to install demo passwords in production.');
  }
  await setupDatabase();
  const passwordHash = await bcrypt.hash('DemoPass123!', 12);
  const users = [
    { username: 'echo_demo_alex', name: 'Alex Waves', email: 'alex@example.invalid' },
    { username: 'echo_demo_sam', name: 'Sam Frequencies', email: 'sam@example.invalid' }
  ];
  for (const user of users) {
    await pool.query(`INSERT INTO users (username,email,password_hash,display_name,bio)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT (username) DO NOTHING`,
    [user.username, user.email, passwordHash, user.name, 'Here for the music.']);
  }
  const result = await pool.query('SELECT id,username FROM users WHERE username = ANY($1)', [users.map(u => u.username)]);
  const ids = Object.fromEntries(result.rows.map(u => [u.username, u.id]));
  const alex = ids.echo_demo_alex, sam = ids.echo_demo_sam;
  const tracks = [
    { id: 980000001, title: 'Demo · Midnight Drive', artist: 'ECHO Demo Artists', album: 'Sample Soundscape', genre: 'Electronic' },
    { id: 980000002, title: 'Demo · Skyline', artist: 'ECHO Demo Artists', album: 'Sample Soundscape', genre: 'Indie Pop' },
    { id: 980000003, title: 'Demo · Coastline', artist: 'ECHO Demo Artists', album: 'Sample Soundscape', genre: 'Alternative' },
    { id: 980000004, title: 'Demo · Golden Hour', artist: 'ECHO Studio', album: 'Fictional Tracks', genre: 'R&B/Soul' },
    { id: 980000005, title: 'Demo · After Dark', artist: 'ECHO Studio', album: 'Fictional Tracks', genre: 'Dance' },
    { id: 980000006, title: 'Demo · Early Morning', artist: 'ECHO Studio', album: 'Fictional Tracks', genre: 'Pop' }
  ];
  for (const track of tracks) await saveTrack(pool, { ...track, artwork: '', preview_url: '', duration_ms: 0 });
  const presets = [
    { owner: alex, name: 'Skyline Sessions · DEMO', description: 'Public example playlist with sample tracks.', songs: tracks.slice(0,4) },
    { owner: sam, name: 'After Hours · DEMO', description: 'A second sample public playlist.', songs: tracks.slice(3) }
  ];
  for (const p of presets) {
    let found = await pool.query('SELECT id FROM playlists WHERE owner_id=$1 AND name=$2', [p.owner, p.name]);
    if (!found.rowCount) found = await pool.query('INSERT INTO playlists(owner_id,name,description,visibility) VALUES($1,$2,$3,$4) RETURNING id', [p.owner, p.name, p.description, 'public']);
    const playlistId = found.rows[0].id;
    for (const track of p.songs) {
      await pool.query('INSERT INTO playlist_tracks(playlist_id,track_id,added_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [playlistId, track.id, p.owner]);
      await pool.query('INSERT INTO favorites(user_id,track_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [p.owner, track.id]);
    }
  }
  await pool.query('INSERT INTO friendships(user_a,user_b) VALUES($1,$2) ON CONFLICT DO NOTHING', [Math.min(alex, sam), Math.max(alex, sam)]);
  console.log('Demo ready! Accounts: echo_demo_alex and echo_demo_sam; password: DemoPass123!');
  console.log('Sample songs are fictional and have no audio previews. Live iTunes songs play previews.');
}
seed().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());