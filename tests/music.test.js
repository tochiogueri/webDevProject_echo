const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanTrack, validTrack, uniqueTracks, MOODS } = require('../server/music');

test('normalises iTunes data for saving to PostgreSQL', () => {
  const song = cleanTrack({ trackId: 123, trackName: 'First Light', artistName: 'Test Artist',
    collectionName: 'Example', primaryGenreName: 'Pop', artworkUrl100: 'https://example.com/100x100bb.jpg',
    previewUrl: 'https://example.com/clip.m4a', trackTimeMillis: 120000 });
  assert.equal(song.id, 123);
  assert.equal(song.genre, 'Pop');
  assert.equal(song.artwork, 'https://example.com/600x600bb.jpg');
  assert.equal(validTrack(song), true);
});

test('rejects invalid songs and unsafe image URLs', () => {
  assert.equal(validTrack({ id: 1, title: 'Song', artist: 'Artist', artwork: 'javascript:alert(1)' }), false);
  assert.equal(validTrack({ id: 1, title: '', artist: 'Artist' }), false);
  assert.equal(validTrack({ id: 1, title: 'Song', artist: 'Artist', artwork: 'https://example.com/img.jpg' }), true);
});

test('filters duplicate tracks by ID', () => {
  assert.equal(uniqueTracks([{ id: 1 }, { id: 2 }, { id: 1 }]).length, 2);
});

test('offers six mood-based generator presets', () => {
  assert.equal(Object.keys(MOODS).length, 6);
  assert.ok(MOODS.gym.searches.length >= 2);
});