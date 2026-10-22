// Tiny, reusable music helpers. Kept separate to make them easier to understand/test.

const MOODS = {
  focus: { label: 'Deep Focus', searches: ['ambient piano', 'lofi instrumental'], emoji: '🪴' },
  gym: { label: 'Gym Energy', searches: ['workout hip hop', 'dance workout'], emoji: '⚡' },
  chill: { label: 'Slow Sundays', searches: ['chill r&b', 'indie acoustic'], emoji: '🌙' },
  party: { label: 'After Hours', searches: ['dance pop', 'house hits'], emoji: '🪩' },
  roadtrip: { label: 'Windows Down', searches: ['indie rock', 'road trip pop'], emoji: '🚗' },
  throwback: { label: 'The Throwbacks', searches: ['2000s pop hits', '90s r&b'], emoji: '💿' }
};

function cleanTrack(song) {
  if (!song || !Number.isSafeInteger(Number(song.trackId))) return null;
  return {
    id: Number(song.trackId),
    title: String(song.trackName || '').slice(0, 200),
    artist: String(song.artistName || '').slice(0, 200),
    album: String(song.collectionName || '').slice(0, 200),
    genre: String(song.primaryGenreName || 'Other').slice(0, 100),
    artwork: String(song.artworkUrl100 || '').replace(/100x100bb/, '600x600bb'),
    preview_url: String(song.previewUrl || ''),
    duration_ms: Math.max(0, Number(song.trackTimeMillis) || 0)
  };
}

function validTrack(track) {
  return track && Number.isSafeInteger(Number(track.id)) && Number(track.id) > 0 &&
    typeof track.title === 'string' && track.title.length > 0 && track.title.length <= 200 &&
    typeof track.artist === 'string' && track.artist.length > 0 && track.artist.length <= 200 &&
    ['artwork', 'preview_url'].every(key => !track[key] || /^https:\/\//i.test(track[key]));
}

function uniqueTracks(tracks) {
  const seen = new Set();
  return tracks.filter(track => {
    if (!track || seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}

async function searchMusic(query, limit = 24) {
  const params = new URLSearchParams({ term: query, entity: 'song', media: 'music', limit: String(Math.min(limit, 70)), country: 'IE', explicit: 'No' });
  const response = await fetch(`https://itunes.apple.com/search?${params}`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('The music catalogue is temporarily unavailable.');
  const data = await response.json();
  return uniqueTracks((data.results || []).map(cleanTrack).filter(t => t && t.title && t.artist));
}

async function generateMusic(mood) {
  const preset = MOODS[mood];
  if (!preset) return null;
  const results = await Promise.all(preset.searches.map(query => searchMusic(query, 32)));
  // Interleave the two searches, instead of showing only one style of music.
  const mixed = [];
  for (let i = 0; i < 32; i++) for (const group of results) if (group[i]) mixed.push(group[i]);
  return { mood, name: preset.label, emoji: preset.emoji, tracks: uniqueTracks(mixed).slice(0, 12) };
}

module.exports = { MOODS, cleanTrack, validTrack, uniqueTracks, searchMusic, generateMusic };