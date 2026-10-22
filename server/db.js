const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false
});

async function setupDatabase() {
  // CREATE TABLE IF NOT EXISTS is safe to run on every startup.
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('PostgreSQL tables are ready.');
}

async function saveTrack(db, track) {
  await db.query(`INSERT INTO tracks (id,title,artist,album,genre,artwork,preview_url,duration_ms)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, artist=EXCLUDED.artist,
      album=EXCLUDED.album, genre=EXCLUDED.genre, artwork=EXCLUDED.artwork,
      preview_url=EXCLUDED.preview_url, duration_ms=EXCLUDED.duration_ms`,
  [track.id, track.title, track.artist, track.album || '', track.genre || 'Other',
    track.artwork || '', track.preview_url || '', track.duration_ms || 0]);
}

module.exports = { pool, setupDatabase, saveTrack };