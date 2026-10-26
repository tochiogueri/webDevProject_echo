/*
  ECHO FRONTEND: plain JavaScript, no React/build tools.
  How it works:
  1. loadView() draws a page.
  2. api() talks to our Express backend using fetch().
  3. Buttons have data-action attributes; the single click listener handles them.
  4. PostgreSQL is ONLY accessed by the backend, never by this file.
*/

const main = document.querySelector('#main-content');
const modal = document.querySelector('#modal');
const modalBody = document.querySelector('#modal-body');
const toastBox = document.querySelector('#toast');
const audio = new Audio();
audio.volume = 0.7;

const state = {
  user: null, view: 'home', search: '', recentResearchs: [], genre: 'all', sort: 'relevance',
  libraryTab: 'mine', mood: 'chill', generated: null, detail: null,
  tracks: new Map(), favorites: new Set(), playlists: [], queue: [], currentIndex: 0,
  recorder: null, microphoneStream: null
};


function saveRecentSearch(query) {
  const search = query.trim();

  if (!search) return;

  // Remove duplicates, ignoring capital letters
  state.recentSearches = state.recentSearches.filter(
    item => item.toLowerCase() !== search.toLowerCase()
  );

  // Put the newest search first and keep only five
  state.recentSearches.unshift(search);
  state.recentSearches = state.recentSearches.slice(0, 5);

  // Save searches in the browser
  localStorage.setItem(
    'echoRecentSearches',
    JSON.stringify(state.recentSearches)
  );
}

function renderRecentSearches() {
  const list = document.querySelector('#recent-search-list');

  if (!list) return;

  list.replaceChildren();

  state.recentSearches.forEach((search) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'recent-search-item';
    button.textContent = search;
    button.dataset.action = 'repeat-search';
    button.dataset.query = search;

    list.appendChild(button);
  });
}


try {
  const savedSearches = JSON.parse(
    localStorage.getItem('echoRecentSearches') || '[]'
  );

  if (Array.isArray(savedSearches)) {
    state.recentSearches = savedSearches
      .filter(item => typeof item === 'string')
      .slice(0, 5);
  }
} catch {
  state.recentSearches = [];
}


// The demo tracks appear only if Apple's public music API cannot be reached.
// Demo rows are clearly labeled and cannot be saved or played.
const SAMPLE_TRACKS = [
  ['Sample: Night Drive', 'ECHO Demo', 'Electronic'],
  ['Sample: Golden Hour', 'ECHO Demo', 'Indie Pop'],
  ['Sample: Slow Motion', 'ECHO Demo', 'R&B/Soul'],
  ['Sample: Satellite', 'ECHO Demo', 'Alternative'],
  ['Sample: Open Skies', 'ECHO Demo', 'Pop'],
  ['Sample: First Light', 'ECHO Demo', 'Jazz'],
  ['Sample: Bassline', 'ECHO Demo', 'Dance'],
  ['Sample: Daydream', 'ECHO Demo', 'Hip-Hop/Rap']
].map((song, index) => ({ id: 990000001 + index, title: song[0], artist: song[1], genre: song[2], album: 'Illustrative preview', artwork: '', preview_url: '', duration_ms: 0, demo: true }));

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function safeUrl(value) { return typeof value === 'string' && /^https:\/\//i.test(value) ? value : ''; }
function storeTracks(tracks) {
  for (const t of tracks || []) if (t && t.id) state.tracks.set(Number(t.id), { ...t, id: Number(t.id) });
  return tracks || [];
}
function getTrack(id) { return state.tracks.get(Number(id)); }
function time(ms) { return `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`; }
function notify(message, error = false) {
  toastBox.textContent = message;
  toastBox.className = `${error ? 'error ' : ''}show`;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toastBox.className = '', 3600);
}
async function api(path, options = {}) {
  const isForm = options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`/api${path}`, { credentials: 'same-origin', ...options,
      headers: isForm ? options.headers : { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  } catch { throw new Error('Cannot reach the server. Run npm start and check your database.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
function loginRequired() {
  if (state.user) return false;
  openAuth('login');
  notify('Sign in to save music and use your personal space.');
  return true;
}
function errorPage(error) { main.innerHTML = `<div class="empty-state"><span>⚠</span><h3>That didn't load</h3><p>${escapeHTML(error.message)}</p><button class="button" data-nav="home">Go home</button></div>`; }
function sectionHead(title, subtitle = '', action = '') {
  return `<div class="section-title-row"><div><h2>${escapeHTML(title)}</h2>${subtitle ? `<p>${escapeHTML(subtitle)}</p>` : ''}</div>${action}</div>`;
}
function heading(kicker, title, description = '') {
  return `<div class="eyebrow">${escapeHTML(kicker)}</div><h1 class="page-heading">${title}</h1>${description ? `<p class="intro-copy">${escapeHTML(description)}</p>` : ''}`;
}
function art(t, extraClass = 'art-wrapper') {
  const url = safeUrl(t.artwork);
  return `<div class="${extraClass}">${url ? `<img src="${escapeHTML(url)}" alt="" loading="lazy">` : '<div class="art-placeholder">♫</div>'}</div>`;
}
function trackCard(t) {
  const isFav = state.favorites.has(Number(t.id));
  const image = safeUrl(t.artwork)
    ? `<img src="${escapeHTML(t.artwork)}" alt="" loading="lazy">`
    : '<div class="art-placeholder">♫</div>';
  return `<article class="music-card">
    <div class="art-wrapper">${image}<button class="cover-play" data-action="play" data-id="${t.id}" aria-label="Play ${escapeHTML(t.title)}" ${!t.preview_url ? 'disabled' : ''}>▶</button></div>
    <div class="card-name" title="${escapeHTML(t.title)}">${escapeHTML(t.title)}</div>
    <div class="card-meta">${escapeHTML(t.artist)}</div>
    <div class="card-bottom"><span class="genre-pill">${escapeHTML(t.genre || 'Music')}</span>
    <span><button class="icon-button ${isFav ? 'is-fav' : ''}" data-action="favorite" data-id="${t.id}" title="${isFav ? 'Remove favorite' : 'Add to favorites'}" ${t.demo ? 'disabled' : ''}>${isFav ? '♥' : '♡'}</button>
    <button class="icon-button add" data-action="add-track" data-id="${t.id}" title="Add to playlist" ${t.demo ? 'disabled' : ''}>+</button></span></div></article>`;
}
function cards(tracks) {
  storeTracks(tracks);
  return `<div class="cover-grid">${tracks.map(trackCard).join('')}</div>`;
}
function trackRows(tracks, opts = {}) {
  storeTracks(tracks);
  if (!tracks.length) return empty('No songs here yet', 'Search for music and start building your collection.', '♫');
  return `<div class="track-list">${tracks.map((t, i) => `<div class="track-row">
    <span class="track-index">${String(i + 1).padStart(2, '0')}</span>${art(t, 'list-art')}
    <div class="track-data"><div class="track-title">${escapeHTML(t.title)}</div><div class="track-sub">${escapeHTML(t.artist)} · ${escapeHTML(t.genre || 'Music')}</div></div>
    <span class="track-album">${escapeHTML(t.album || '')}</span>
    <div class="track-actions"><button class="tiny-play" data-action="play" data-id="${t.id}" title="Preview" ${!t.preview_url ? 'disabled' : ''}>▶</button>
    ${opts.remove ? `<button class="icon-button" data-action="remove-from-playlist" data-id="${t.id}" title="Remove song">×</button>` :
      `<button class="icon-button ${state.favorites.has(Number(t.id)) ? 'is-fav' : ''}" data-action="favorite" data-id="${t.id}" title="Favorite" ${t.demo ? 'disabled' : ''}>${state.favorites.has(Number(t.id)) ? '♥' : '♡'}</button>
      <button class="icon-button add" data-action="add-track" data-id="${t.id}" title="Add to playlist" ${t.demo ? 'disabled' : ''}>+</button>`}
    </div></div>`).join('')}</div>`;
}
function empty(title, description, emoji = '◌', action = '') {
  return `<div class="empty-state"><span>${emoji}</span><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${action}</div>`;
}
function locked(title, description) {
  return empty(title, description, '🔒', `<button class="button" data-action="show-login">Log in / sign up ↗</button>`);
}
function setActive(view) {
  document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === view));
}

// ROUTING: update the centre of the page when users click on a nav link.
async function loadView(view = 'home') {
  state.view = view;
  state.detail = null;
  setActive(view);
  main.innerHTML = '<div class="loading-note">Finding your frequency... ✳</div>';
  window.scrollTo({ top: 0, behavior: 'instant' });
  try {
    if (view === 'home') await home();
    else if (view === 'discover') await discover();
    else if (view === 'playlists') await library();
    else if (view === 'dna') await dna();
    else if (view === 'generator') await generator();
    else if (view === 'connect') await connect();
    else if (view === 'recognize') await recognize();
    else await home();
  } catch (err) { errorPage(err); }
}

async function home() {
  main.innerHTML = `<div class="eyebrow">WELCOME TO YOUR SOUNDSPACE</div>
    <div class="hero" style="margin-top:14px"><div class="hero-left">
      <div class="hero-kicker"><span>✳</span> GOOD MUSIC. GOOD COMPANY.</div>
      <h1>Find your<br><em>frequency.</em></h1>
      <p>Discover new favorites, build the perfect playlist, and find people who get your sound.</p>
      <div class="hero-buttons"><button class="button" data-nav="discover">Explore music <span>↗</span></button><button class="button ghost" data-nav="generator">✳ Make a mix</button></div>
      </div><div class="hero-art"><div class="vinyl"></div><span class="floating-note">✳</span><span class="hero-stamp">PLAY IT YOUR WAY / ECHO</span></div></div>
    <section class="section">${sectionHead('Fresh on the radar', 'A little something for your ears.', '<button class="link-button" data-nav="discover">EXPLORE ALL ↗</button>')}
      <div id="home-tracks" class="loading-note">Tuning into the catalogue...</div></section>
    <section class="section">${sectionHead('More than just playlists', 'Your sound, your community, your discoveries.')}
      <div class="feature-grid"><button class="feature-card" data-nav="generator"><span class="feature-icon">✳</span><strong>Mix Lab</strong><small>Pick a mood. Get a soundtrack. ↗</small></button>
      <button class="feature-card" data-nav="dna"><span class="feature-icon">◈</span><strong>Your Music DNA</strong><small>See your taste in full colour. ↗</small></button>
      <button class="feature-card" data-nav="connect"><span class="feature-icon">☷</span><strong>Better together</strong><small>Friends, shared mixes, good times. ↗</small></button></div></section>`;
  try {
    const data = await api('/music/search?q=popular%20hits');
    const tracks = data.tracks.slice(0, 8);
    state.queue = storeTracks(tracks);
    document.querySelector('#home-tracks').outerHTML = cards(tracks);
  } catch {
    state.queue = storeTracks(SAMPLE_TRACKS);
    document.querySelector('#home-tracks').outerHTML = `<p class="info-strip warning-strip">The live catalogue is unavailable. These are design-only samples until the music API connects.</p>${cards(SAMPLE_TRACKS)}`;
  }
}

async function discover() {
  main.innerHTML = `${heading('THE GOOD STUFF', 'Discover your next favorite.', 'Search the live iTunes music catalogue, listen to previews, and save what you love.')}
    <div class="toolbar"><input id="discover-query" class="field" placeholder="Search songs, artists or albums..." value="${escapeHTML(state.search || '')}" aria-label="Music search query">
    <select id="genre-filter" class="field" aria-label="Filter by genre"><option value="all">All genres</option><option value="pop">Pop</option><option value="rock">Rock</option><option value="hip-hop">Hip-Hop</option><option value="r&b">R&B</option><option value="dance">Dance</option><option value="alternative">Alternative</option><option value="jazz">Jazz</option><option value="country">Country</option></select>
    <select id="sort-filter" class="field" aria-label="Sort music"><option value="relevance">Most relevant</option><option value="artist">Artist A-Z</option><option value="title">Title A-Z</option></select>
    <button class="button" data-action="search-music">Search ↗</button></div>
    <section class="section" style="margin-top:22px">${sectionHead('Tracks to explore', 'Search by title or artist, then filter results.')}

    <section class="recent-searches">
      <div class="recent-searches-header">
        <h3>Recent Searches</h3>
        <button class="button" data-action="clear-recent">
          Clear All
        </button>
      </div>
      <div id="recent-search-list"></div>
    </section>
      <div id="discover-results" class="loading-note">Searching...</div></section>`;
  document.querySelector('#genre-filter').value = state.genre;
  document.querySelector('#sort-filter').value = state.sort;
  
  const results = document.querySelector('#discover-results');

  if (results) {
    results.innerHTML = '<p class="loading-note">Search for a song or artist to discover music.</p>';
  }

  renderRecentSearches();
}

async function searchDiscover() {
  //console.log("ECHO SEARCH FUNCTION IS RUNNING"); 
  const enteredQuery = document.querySelector('#discover-query')?.value.trim() || '';

  const query = enteredQuery;
  state.search = query;

  // Only save searches typed by the user
  if (enteredQuery) {
    saveRecentSearch(enteredQuery);
    renderRecentSearches();
  }


  //console.log("Recent searches saved:", state.recentSearches);
  state.genre = document.querySelector('#genre-filter')?.value || 'all';
  state.sort = document.querySelector('#sort-filter')?.value || 'relevance';
  const result = document.querySelector('#discover-results');
  if (!result) return;
  result.innerHTML = '<div class="loading-note">Searching the music universe...</div>';
  try {
    const data = await api(`/music/search?q=${encodeURIComponent(query)}&genre=${encodeURIComponent(state.genre)}&sort=${encodeURIComponent(state.sort)}`);
    state.queue = storeTracks(data.tracks);
    if (!data.tracks.length) result.innerHTML = empty('No matches found', 'Try a different keyword or switch the genre filter.', '⌕');
    else result.innerHTML = `<p style="color:#949bad;font-size:11px">${data.tracks.length} results found</p>${trackRows(data.tracks)}`;
  } catch (e) { result.innerHTML = empty('Search unavailable', e.message, '⚠'); }
}

function playlistCard(p) {
  const isMine = p.owner_id === state.user?.id;
  return `<button class="playlist-card" data-action="open-playlist" data-id="${p.id}"><div class="playlist-art">${isMine ? '♫' : '✳'}</div>
    <div><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.description || `By @${p.owner_username || 'you'}`)}</small></div>
    <div class="playlist-card-bottom"><span class="tag">${p.track_count ?? 0} TRACKS</span><span style="font-size:11px;color:#b6bfce">${p.visibility === 'public' ? '◎ PUBLIC' : '◈ PRIVATE'} ↗</span></div></button>`;
}
async function library() {
  main.innerHTML = `${heading('THE COLLECTION', 'Your library. Your rules.', 'Keep your favorites close, build playlists, and share the good ones.')}
    <div class="mix-head"><div class="toolbar" style="margin:4px 0"><button class="button small ${state.libraryTab === 'mine' ? '' : 'ghost'}" data-action="library-tab" data-tab="mine">My playlists</button><button class="button small ${state.libraryTab === 'favorites' ? '' : 'ghost'}" data-action="library-tab" data-tab="favorites">Liked songs</button><button class="button small ${state.libraryTab === 'public' ? '' : 'ghost'}" data-action="library-tab" data-tab="public">Community</button></div>
    <button class="button" data-action="create-playlist">+ New playlist</button></div><div id="library-results"></div>`;
  await refreshLibrary();
}
async function refreshLibrary() {
  const result = document.querySelector('#library-results');
  if (!result) return;
  result.innerHTML = '<div class="loading-note">Opening your library...</div>';
  const tab = state.libraryTab;
  if (tab === 'mine') {
    if (!state.user) return result.innerHTML = locked('Your music lives here', 'Log in to create playlists and see your personal library.');
    const data = await api('/playlists/mine');
    state.playlists = data.playlists;
    result.innerHTML = data.playlists.length ? `<div class="playlist-grid">${data.playlists.map(playlistCard).join('')}</div>` : empty('Your first mix is waiting', 'Create a playlist, then discover tracks to add to it.', '♫', '<button class="button" data-action="create-playlist">Create playlist ↗</button>');
  } else if (tab === 'favorites') {
    if (!state.user) return result.innerHTML = locked('Save your favorites', 'Sign in to keep the songs you love in one place.');
    const data = await api('/favorites');
    storeTracks(data.tracks);
    result.innerHTML = trackRows(data.tracks);
  } else {
    const data = await api('/playlists/public');
    result.innerHTML = data.playlists.length ? `<div class="playlist-grid">${data.playlists.map(playlistCard).join('')}</div>` : empty('No public playlists yet', 'Be the first to share a playlist with the community.', '◈');
  }
}
async function playlistDetail(id) {
  const data = await api(`/playlists/${id}`);
  const p = data.playlist;
  state.detail = p;
  state.view = 'playlist-detail';
  setActive('playlists');
  const editable = p.can_edit && state.user;
  const owner = p.is_owner;
  state.queue = storeTracks(data.tracks);
  main.innerHTML = `<button class="link-button" data-nav="playlists" style="margin:0 0 22px">← BACK TO LIBRARY</button>
    ${heading(p.visibility === 'public' ? 'PUBLIC PLAYLIST' : 'YOUR PRIVATE MIX', escapeHTML(p.name), p.description || `Curated by music people, for music people.`)}
    <div class="mix-head" style="margin:19px 0 21px"><span class="tag">${data.tracks.length} SONGS · ${data.members.length} COLLABORATORS</span><div style="display:flex;gap:9px;flex-wrap:wrap">
      ${owner ? `<button class="button small ghost" data-action="edit-playlist">Edit details</button><button class="button small ghost" data-action="invite-friend">+ Invite friend</button><button class="button small danger" data-action="delete-playlist">Delete</button>` : ''}
      ${editable && !owner ? `<button class="button small danger" data-action="leave-playlist">Leave collaboration</button>` : ''}</div></div>
    ${data.members.length ? `<p class="intro-copy">With ${data.members.map(m => `@${escapeHTML(m.username)}`).join(', ')}</p>` : ''}
    <div class="page-panel">${sectionHead('Tracklist', editable ? 'Add tracks from Discover or the Mix Lab.' : 'Press play to hear a preview.')}${trackRows(data.tracks, { remove: editable })}</div>`;
}

//DNA dashboard \
async function dna() {
  main.innerHTML = `${heading('THE SOUNDS THAT MAKE YOU', 'Your music DNA.', 'A personal snapshot of your taste, built from your saved songs and your own playlists.')}
    <div id="dna-content"></div>`;
  const el = document.querySelector('#dna-content');
  if (!state.user) { el.innerHTML = locked('Discover your music DNA', 'Create an account and save songs to see your real listening preferences.'); return; }
  const d = await api('/dna');
  const max = Math.max(1, ...d.genres.map(g => g.count));
  //calculate the total number of songs across all genres 
  const totalGenreSongs = d.genres.reduce((total, genre) => total + genre.count, 0);
  //calculate the percentage of each genre
  const genrePercentages = d.genres.map(genre => ({ name: genre.name, count: genre.count, percentage: totalGenreSongs > 0 ? Math.round((genre.count / totalGenreSongs) * 100) : 0 }));
  const topArtist = d.artists[0]?.name || 'Waiting to be discovered';
  const stats = [ ['SAVED TRACKS', d.totals.favorites], ['PLAYLISTS MADE', d.totals.playlists], ['MUSIC FRIENDS', d.totals.friends] ];
  //build the genre chart from saved music 
  let chartPosition = 0;

  const genreColors = ['#b6f36a', '#aa8cff', '#ff8cba', '#ffc56d', '#70c9ff'];
  
  const chartSegments = genrePercentages.map((genre, index) => {
    const percentage = totalGenreSongs > 0
      ? (genre.count / totalGenreSongs) * 100
      : 0;

    const segment = `
      <circle
        cx="100"
        cy="100"
        r="72"
        fill="none"
        stroke="${genreColors[index % genreColors.length]}"
        stroke-width="26"
        pathLength="100"
        stroke-dasharray="${percentage} 100"
        stroke-dashoffset="${-chartPosition}"
        transform="rotate(-90 100 100)"
      />
    `;

    chartPosition += percentage;
    return segment;
  }).join('');


  const chartBackground = totalGenreSongs > 0 ? `conic-gradient(${chartSegments})` : '#333';
  console.log("Total genre songs:", totalGenreSongs);
  console.log("Chart segments:", chartSegments);
  console.log("chart background:", chartBackground);
  el.innerHTML = `<div class="stat-grid">${stats.map(([name, n]) => `<div class="stat-card"><span>${name}</span><strong>${n}<i>.</i></strong></div>`).join('')}</div>
  <div class="page-panel">
    <h2 class="subheading">Your Genre Distribution</h2>

   
<div class="genre-chart-container">
  <svg class="genre-chart"
       viewBox="0 0 200 200"
       role="img"
       aria-label="Genre distribution chart">
    ${chartSegments}
    <circle cx="100" cy="100" r="56"
            class="genre-chart-center" />
    <text x="100" y="105"
          class="genre-chart-label"
          text-anchor="middle">
      Your Sound
    </text>
  </svg>
  
  <div class="genre-legend">
    ${genrePercentages.map((genre, index) => `
      <div class="genre-legend-item">
        <span class="genre-dot genre-color-${index % 5}"></span>
        <span class="genre-name">${String(genre.name ?? '').replace(/[&<>"']/g, char => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[char])}</span>
        <strong>${genre.percentage}%</strong>
      </div>
    `).join('')}
  </div>
</div>

  </div>

    <div class="dna-grid"><div class="page-panel"><h2 class="subheading">Your top genres</h2>
      ${d.genres.length ? d.genres.map((g, i) => `<div class="bar-item"><div class="bar-title"><strong>${String(i+1).padStart(2,'0')} · ${escapeHTML(g.name)}</strong><span>${g.count} saved</span></div><div class="bar-bg"><div class="bar-fill ${i%2 ? 'alt' : ''}" style="width:${100*g.count/max}%"></div></div></div>`).join('') : '<p class="intro-copy">Save a few tracks to see your genre breakdown.</p>'}</div>
      <div class="page-panel"><h2 class="subheading">Artists on your wavelength</h2>
      ${d.artists.length ? d.artists.map((a, i) => `<div class="people-row"><div class="profile-bubble">${i+1}</div><div class="people-details"><strong>${escapeHTML(a.name)}</strong><small>${a.count} saved ${a.count === 1 ? 'song' : 'songs'}</small></div><span style="color:var(--lime)">✳</span></div>`).join('') : '<p class="intro-copy">Your favorite artists will show up here.</p>'}</div></div>
    <div class="insight"><span class="eyebrow">YOUR MUSIC STORY</span><h3>${d.totals.favorites ? `You're on a ${escapeHTML(d.genres[0]?.name || 'music')} wavelength.` : 'Every great playlist starts with one song.'}</h3>
    <p>${d.totals.favorites ? `Your top artist right now: ${escapeHTML(topArtist)}. Keep exploring and watch your DNA evolve.` : 'Discover your sound, tap the heart on tracks, and come back for the full picture.'}</p><span class="insight-icon">◈</span>
    <button class="button small" data-nav="discover">Find more music ↗</button></div>`;
}

const moods = [
  ['focus', '🪴', 'Deep Focus', 'No distractions. Just flow.'],
  ['gym', '⚡', 'Gym Energy', 'Turn your workout up.'],
  ['chill', '🌙', 'Slow Sundays', 'Breathe. Unwind. Repeat.'],
  ['party', '🪩', 'After Hours', 'Dance first, think later.'],
  ['roadtrip', '🚗', 'Windows Down', 'Soundtrack to anywhere.'],
  ['throwback', '💿', 'The Throwbacks', 'A little nostalgia.' ]
];
async function generator() {
  main.innerHTML = `${heading('YOUR PERSONAL DJ', 'Welcome to the Mix Lab.', 'Choose a mood, and ECHO will discover a new playlist using real tracks from the music catalogue.')}
    <div class="page-panel"><div class="mix-head"><h2 class="subheading" style="margin:0">01 / PICK YOUR VIBE</h2><span class="tag">MOOD-BASED GENERATOR</span></div>
    <div class="mood-grid">${moods.map(([id,icon,name,description]) => `<button class="mood-card ${state.mood === id ? 'selected' : ''}" data-action="mood" data-mood="${id}"><span>${icon}</span><strong>${escapeHTML(name)}</strong><small style="color:#939baa">${escapeHTML(description)}</small></button>`).join('')}</div>
    <button class="button" data-action="generate">✳ Generate my mix <span>↗</span></button></div>
    <div id="generated-result" style="margin-top:24px"></div>`;
  if (state.generated) showGenerated();
}
function showGenerated() {
  const el = document.querySelector('#generated-result');
  if (!el || !state.generated) return;
  const g = state.generated;
  state.queue = storeTracks(g.tracks);
  el.innerHTML = `<div class="page-panel"><div class="mix-head"><div><span class="eyebrow">MIX COMPLETE</span><h2 class="page-heading" style="font-size:30px;margin-bottom:6px">${escapeHTML(g.emoji)} ${escapeHTML(g.name)}</h2>
    <p class="intro-copy">${g.tracks.length} songs, one perfect vibe. Preview them or save the whole playlist.</p></div><button class="button" data-action="save-generated">+ Save playlist</button></div>
    ${trackRows(g.tracks)}</div>`;
}
async function makeMix() {
  const el = document.querySelector('#generated-result');
  if (el) el.innerHTML = '<div class="loading-note">Mixing something good... ✳</div>';
  try {
    state.generated = await api(`/music/generate?mood=${encodeURIComponent(state.mood)}`);
    showGenerated();
  } catch (e) { if (el) el.innerHTML = empty('Could not make that mix', e.message, '⚠'); }
}

async function connect() {
  main.innerHTML = `${heading('BETTER TOGETHER', 'Find your people.', 'Follow the same beat. Make friends, exchange playlists, and create something together.')}
  <div class="grid-two"><div class="page-panel"><h2 class="subheading">Find someone on ECHO</h2><div class="toolbar" style="margin:5px 0 14px"><input class="field" id="user-query" placeholder="Search by username..." aria-label="Search users"><button class="button small" data-action="search-users">Search ↗</button></div><div id="user-results"><p class="intro-copy">Enter at least two characters to find a user.</p></div></div>
  <div class="page-panel"><h2 class="subheading">Your connections</h2><div id="friend-results">${state.user ? '<div class="loading-note">Loading friends...</div>' : locked('Friends make it better', 'Log in to connect with other music fans.')}</div></div></div>
  <section class="section">${sectionHead('From the community', 'Public mixes made by people on ECHO.')}
  <div id="public-playlists" class="playlist-grid"></div></section>`;
  if (state.user) await refreshFriends();
  try {
    const data = await api('/playlists/public');
    document.querySelector('#public-playlists').innerHTML = data.playlists.length ? data.playlists.slice(0,6).map(playlistCard).join('') : empty('The community is just warming up', 'Make a public playlist and it will appear here.', '✳');
  } catch { /* The page still works without public playlists. */ }
}
async function searchUsers() {
  const q = document.querySelector('#user-query')?.value.trim() || '';
  const el = document.querySelector('#user-results');
  if (q.length < 2) return el.innerHTML = '<p class="intro-copy">Type at least two characters.</p>';
  const result = await api(`/users/search?q=${encodeURIComponent(q)}`);
  el.innerHTML = result.users.length ? result.users.map(u => `<div class="people-row"><div class="profile-bubble">${escapeHTML(u.username[0].toUpperCase())}</div>
    <div class="people-details"><strong>@${escapeHTML(u.username)}</strong><small>${escapeHTML(u.display_name)}</small></div>
    <button class="button small" data-action="add-friend" data-username="${escapeHTML(u.username)}">Add friend +</button></div>`).join('') : '<p class="intro-copy">No users found. Try a different name.</p>';
}
async function refreshFriends() {
  const el = document.querySelector('#friend-results');
  if (!el || !state.user) return;
  const [d, invites] = await Promise.all([api('/friends'), api('/invitations')]);
  let html = '';
  if (d.incoming.length) html += `<strong class="tag" style="margin-bottom:12px">FRIEND REQUESTS · ${d.incoming.length}</strong>` + d.incoming.map(r => `<div class="people-row"><div class="profile-bubble">${escapeHTML(r.username[0].toUpperCase())}</div><div class="people-details"><strong>@${escapeHTML(r.username)}</strong><small>Wants to connect</small></div><div class="people-actions"><button class="button small" data-action="reply-friend" data-id="${r.id}" data-accept="true">✓</button><button class="button small ghost" data-action="reply-friend" data-id="${r.id}" data-accept="false">×</button></div></div>`).join('');
  if (invites.invitations.length) html += `<div class="divider"></div><strong class="tag">PLAYLIST INVITATIONS</strong>` + invites.invitations.map(r => `<div class="people-row"><div class="playlist-art">♫</div><div class="people-details"><strong>${escapeHTML(r.playlist_name)}</strong><small>Invite from @${escapeHTML(r.inviter)}</small></div><div class="people-actions"><button class="button small" data-action="reply-invite" data-id="${r.id}" data-accept="true">Join</button><button class="button small ghost" data-action="reply-invite" data-id="${r.id}" data-accept="false">×</button></div></div>`).join('');
  html += '<div class="divider"></div><h3 class="subheading">Friends</h3>';
  html += d.friends.length ? d.friends.map(u => `<div class="people-row"><div class="profile-bubble">${escapeHTML(u.username[0].toUpperCase())}</div><div class="people-details"><strong>${escapeHTML(u.display_name)}</strong><small>@${escapeHTML(u.username)}</small></div><button class="button small ghost" data-action="remove-friend" data-id="${u.id}">Remove</button></div>`).join('') : '<p class="intro-copy">No friends yet. Send your first request!</p>';
  if (d.sent.length) html += `<p class="intro-copy">${d.sent.length} outgoing friend request(s) pending.</p>`;
  el.innerHTML = html;
}

async function recognize() {
  main.innerHTML = `${heading('WHAT SONG IS THAT?', 'Catch the sound.', 'Heard a song you love? Record a short clip or upload audio to identify the track.')}
    <div class="recognize-stage"><div class="recognize-orb" id="recognize-orb">◉</div><h2>Know the song. Own the moment.</h2><p>For best results, record 8–12 seconds of clear audio. This uses the AudD recognition service.</p>
    <div class="recognize-actions"><button class="button" data-action="record-start" id="record-button">◉ Start listening</button>
    <label class="button ghost file-label">↑ Upload clip<input type="file" id="audio-upload" accept="audio/*,video/webm"></label></div>
    <p id="record-status" style="font-size:11px;margin-top:18px">Checking recognition availability...</p></div>
    <div id="recognition-result"></div>`;
  try {
    const status = await api('/music/recognition-status');
    const el = document.querySelector('#record-status');
    if (!status.available && el) {
      el.innerHTML = 'Recognition needs an AudD API token in your <code>.env</code> file. See the README to enable it.';
      document.querySelector('#record-button').disabled = true;
      document.querySelector('#audio-upload').disabled = true;
    } else if (el) el.textContent = 'Recognition ready. You will be asked for microphone permission.';
  } catch (err) { const el = document.querySelector('#record-status'); if (el) el.textContent = err.message; }
}
async function recognizeAudio(blob, filename = 'recording.webm') {
  if (loginRequired()) return;
  const el = document.querySelector('#recognition-result');
  el.innerHTML = '<div class="loading-note">Listening closely... this can take a moment.</div>';
  const form = new FormData();
  form.append('audio', blob, filename);
  try {
    const response = await api('/music/recognize', { method: 'POST', body: form });
    if (!response.recognized) return el.innerHTML = empty('No match this time', 'Try a clearer clip with less background noise.', '⌁');
    state.queue = storeTracks(response.tracks);
    el.innerHTML = `<div class="page-panel recognition-result"><div class="eyebrow">WE FOUND YOUR SONG</div><h2 class="page-heading" style="font-size:30px">${escapeHTML(response.match.title)}</h2><p class="intro-copy">${escapeHTML(response.match.artist)}${response.match.album ? ` · ${escapeHTML(response.match.album)}` : ''}</p>
    ${response.tracks.length ? trackRows(response.tracks.slice(0, 3)) : '<p class="intro-copy">Recognition succeeded, but this song was not found in the searchable iTunes catalogue.</p>'}</div>`;
  } catch (error) { el.innerHTML = empty('Could not identify the song', error.message, '⚠'); }
}
async function startRecording() {
  if (loginRequired()) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return notify('Your browser does not support microphone recording. Try uploading a clip.', true);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.microphoneStream = stream;
    const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
    state.recorder = recorder;
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop()); state.microphoneStream = null;
      const button = document.querySelector('#record-button');
      if (button) { button.textContent = '◉ Start listening'; button.dataset.action = 'record-start'; }
      document.querySelector('#recognize-orb')?.classList.remove('listening');
      if (chunks.length) recognizeAudio(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }), 'clip.webm');
    };
    recorder.start();
    document.querySelector('#recognize-orb')?.classList.add('listening');
    const button = document.querySelector('#record-button');
    if (button) { button.textContent = '■ Stop and identify'; button.dataset.action = 'record-stop'; }
    const status = document.querySelector('#record-status');
    if (status) status.textContent = 'Recording... stop anytime, or wait 12 seconds.';
    setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 12000);
  } catch { notify('Microphone access was blocked. You can upload an audio file instead.', true); }
}

// DIALOGS: shared modal keeps HTML simple.
function showModal(html) { modalBody.innerHTML = `<div class="modal-inner">${html}</div>`; if (!modal.open) modal.showModal(); }
function closeModal() { if (modal.open) modal.close(); }
function modalTitle(title, subtitle = '') { return `<div class="modal-head"><div><h2>${escapeHTML(title)}</h2><p>${escapeHTML(subtitle)}</p></div><button class="modal-close" data-action="modal-close" aria-label="Close">×</button></div>`; }
function openAuth(mode = 'login') {
  const register = mode === 'register';
  showModal(`${modalTitle(register ? 'Join the frequency.' : 'Welcome back.', register ? 'Your next favorite starts here.' : 'Pick up right where you left off.')}
    <form class="form-stack" data-form="${register ? 'register' : 'login'}">
      ${register ? `<label>DISPLAY NAME<input class="field" name="display_name" required maxlength="60" placeholder="Your name"></label><label>USERNAME<input class="field" name="username" required minlength="3" maxlength="30" placeholder="musiclover"></label>` : ''}
      <label>${register ? 'EMAIL' : 'EMAIL OR USERNAME'}<input class="field" name="${register ? 'email' : 'login'}" ${register ? 'type="email"' : ''} required placeholder="${register ? 'hello@example.com' : 'Username or email'}"></label>
      <label>PASSWORD<input class="field" name="password" type="password" required minlength="8" placeholder="At least 8 characters"></label>
      <button class="button" type="submit">${register ? 'Create account ↗' : 'Log in ↗'}</button></form>
      <div class="modal-bottom">${register ? 'Already a member?' : 'New around here?'} <button data-action="${register ? 'show-login' : 'show-register'}">${register ? 'Log in' : 'Sign up'}</button></div>`);
}
function openAccount() {
  if (!state.user) return openAuth('login');
  showModal(`${modalTitle('Your account', `@${state.user.username}`)}
    <form class="form-stack" data-form="profile"><label>DISPLAY NAME<input class="field" name="display_name" required maxlength="60" value="${escapeHTML(state.user.display_name)}"></label>
    <label>BIO<textarea class="field" name="bio" maxlength="160">${escapeHTML(state.user.bio || '')}</textarea></label><button class="button" type="submit">Save changes</button></form>
    <div class="divider"></div><button class="button ghost" data-action="logout">Log out ↗</button>
    <button class="button danger small" style="margin-left:8px" data-action="delete-account">Delete account</button>`);
}
function openPlaylistModal(p = null) {
  if (loginRequired()) return;
  showModal(`${modalTitle(p ? 'Edit playlist' : 'Make a new playlist', p ? 'Change the name or visibility.' : 'Give your new soundtrack a name.')}
    <form class="form-stack" data-form="${p ? 'edit-playlist' : 'create-playlist'}">
    <label>PLAYLIST NAME<input class="field" name="name" required maxlength="100" placeholder="e.g. Late night drives" value="${escapeHTML(p?.name || '')}"></label>
    <label>DESCRIPTION<input class="field" name="description" maxlength="240" placeholder="What is this mix about?" value="${escapeHTML(p?.description || '')}"></label>
    <label>VISIBILITY<select class="field" name="visibility"><option value="private" ${p?.visibility !== 'public' ? 'selected' : ''}>Private: just you and collaborators</option><option value="public" ${p?.visibility === 'public' ? 'selected' : ''}>Public: anyone can listen</option></select></label>
    <button class="button" type="submit">${p ? 'Save changes' : 'Create playlist'} ↗</button></form>`);
}
async function openAddTrack(trackId) {
  if (loginRequired()) return;
  const track = getTrack(trackId);
  if (!track || track.demo) return;
  const d = await api('/playlists/mine');
  if (!d.playlists.length) return showModal(`${modalTitle('You need a playlist', 'Create one first, then add your favorite songs.')}
    <button class="button" data-action="create-playlist">+ Create playlist</button>`);
  showModal(`${modalTitle('Add to playlist', `${track.title} · ${track.artist}`)}<form class="form-stack" data-form="add-to-playlist">
    <input type="hidden" name="trackId" value="${track.id}"><label>CHOOSE A PLAYLIST<select class="field" name="playlistId">${d.playlists.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('')}</select></label>
    <button class="button" type="submit">Add song ↗</button></form>`);
}
function inviteModal() {
  showModal(`${modalTitle('Invite a friend', 'Only friends can collaborate.')}<form class="form-stack" data-form="invite"><label>FRIEND USERNAME<input class="field" name="username" required placeholder="their_username"></label><button class="button">Send invitation ↗</button></form>`);
}
function saveMixModal() {
  if (loginRequired()) return;
  if (!state.generated) return;
  showModal(`${modalTitle('Save your mix', 'It will appear in your library, ready to edit.')}
    <form class="form-stack" data-form="save-mix"><label>PLAYLIST NAME<input class="field" name="name" value="${escapeHTML(state.generated.name)}" maxlength="100" required></label>
    <label>VISIBILITY<select name="visibility" class="field"><option value="private">Private</option><option value="public">Public</option></select></label>
    <button class="button">Save ${state.generated.tracks.length} tracks ↗</button></form>`);
}

async function favorite(id) {
  if (loginRequired()) return;
  const t = getTrack(id);
  if (!t || t.demo) return;
  if (state.favorites.has(id)) {
    await api(`/favorites/${id}`, { method: 'DELETE' });
    state.favorites.delete(id);
    notify('Removed from liked songs.');
  } else {
    await api('/favorites', { method: 'POST', body: JSON.stringify({ track: t }) });
    state.favorites.add(id);
    notify('Saved to your liked songs. ♥');
  }
  // Update visible buttons without reloading music/search results.
  document.querySelectorAll(`[data-action="favorite"][data-id="${id}"]`).forEach(b => {
    b.textContent = state.favorites.has(id) ? '♥' : '♡';
    b.classList.toggle('is-fav', state.favorites.has(id));
  });
  if (state.view === 'playlists' && state.libraryTab === 'favorites') await refreshLibrary();
}
function playTrack(id) {
  const t = getTrack(id);
  if (!t || !safeUrl(t.preview_url)) return notify('No 30-second preview is available for that track.', true);
  const playingSame = Number(audio.datasetId) === id;
  if (playingSame && !audio.paused) return audio.pause();
  if (!playingSame) {
    audio.src = t.preview_url;
    audio.datasetId = id;
    const index = state.queue.findIndex(s => Number(s.id) === id);
    if (index >= 0) state.currentIndex = index;
  }
  audio.play().catch(() => notify('Could not play this preview. Try another song.', true));
  document.querySelector('#player-title').textContent = t.title;
  document.querySelector('#player-artist').textContent = t.artist;
  document.querySelector('#player-art').innerHTML = safeUrl(t.artwork) ? `<img src="${escapeHTML(t.artwork)}" alt="">` : '♫';
}
function nearbyTrack(direction) {
  if (!state.queue.length) return;
  state.currentIndex = (state.currentIndex + direction + state.queue.length) % state.queue.length;
  playTrack(Number(state.queue[state.currentIndex].id));
}
audio.addEventListener('timeupdate', () => {
  document.querySelector('#current-time').textContent = time(audio.currentTime * 1000);
  document.querySelector('#seek').value = audio.duration ? String((audio.currentTime / audio.duration) * 100) : '0';
  if (audio.duration) document.querySelector('#total-time').textContent = time(audio.duration * 1000);
});
audio.addEventListener('play', () => document.querySelector('#play-button').textContent = 'Ⅱ');
audio.addEventListener('pause', () => document.querySelector('#play-button').textContent = '▶');
audio.addEventListener('ended', () => document.querySelector('#play-button').textContent = '▶');
document.querySelector('#play-button').addEventListener('click', () => {
  if (!audio.src) return notify('Choose a song to start listening.');
  if (audio.paused) audio.play().catch(() => notify('Preview unavailable.', true)); else audio.pause();
});
document.querySelector('#prev-button').addEventListener('click', () => nearbyTrack(-1));
document.querySelector('#next-button').addEventListener('click', () => nearbyTrack(1));
document.querySelector('#volume').addEventListener('input', e => audio.volume = Number(e.target.value) / 100);
document.querySelector('#seek').addEventListener('input', e => { if (audio.duration) audio.currentTime = Number(e.target.value) * audio.duration / 100; });

// One click listener for ALL dynamically added buttons.
document.addEventListener('click', async event => {
  const b = event.target.closest('[data-action],[data-nav]');
  if (!b) return;
  if (b.dataset.nav) { event.preventDefault(); await loadView(b.dataset.nav); return; }
  const action = b.dataset.action, id = Number(b.dataset.id);
  try {
    if (action === 'modal-close') closeModal();
    else if (action === 'show-login') openAuth('login');
    else if (action === 'show-register') openAuth('register');
    else if (action === 'account') openAccount();
    else if (action === 'search-music') await searchDiscover();
    else if (action === 'repeat-search') {
      const query = b.dataset.query;
      const searchInput = document.querySelector('#discover-query');

      if (searchInput && query) {
        searchInput.value = query;
        await searchDiscover();
      }
    }
    else if (action === 'clear-recent') {
      state.recentSearches = [];
      localStorage.removeItem('echoRecentSearches');
      renderRecentSearches();
    }
    else if (action === 'play') playTrack(id);
    else if (action === 'favorite') await favorite(id);
    else if (action === 'add-track') await openAddTrack(id);
    else if (action === 'create-playlist') openPlaylistModal();
    else if (action === 'library-tab') { state.libraryTab = b.dataset.tab; await library(); }
    else if (action === 'open-playlist') await playlistDetail(id);
    else if (action === 'edit-playlist') openPlaylistModal(state.detail);
    else if (action === 'invite-friend') inviteModal();
    else if (action === 'delete-playlist') {
      if (confirm('Delete this playlist permanently?')) {
        await api(`/playlists/${state.detail.id}`, { method: 'DELETE' });
        notify('Playlist deleted.'); await loadView('playlists');
      }
    } else if (action === 'leave-playlist') {
      if (confirm('Leave this collaborative playlist?')) {
        await api(`/playlists/${state.detail.id}/leave`, { method: 'DELETE' });
        notify('You left the playlist.'); await loadView('playlists');
      }
    } else if (action === 'remove-from-playlist') {
      await api(`/playlists/${state.detail.id}/tracks/${id}`, { method: 'DELETE' });
      notify('Song removed.'); await playlistDetail(state.detail.id);
    } else if (action === 'mood') {
      state.mood = b.dataset.mood;
      document.querySelectorAll('.mood-card').forEach(item => item.classList.toggle('selected', item.dataset.mood === state.mood));
    } else if (action === 'generate') await makeMix();
    else if (action === 'save-generated') saveMixModal();
    else if (action === 'search-users') await searchUsers();
    else if (action === 'add-friend') {
      if (loginRequired()) return;
      await api('/friends/requests', { method: 'POST', body: JSON.stringify({ username: b.dataset.username }) });
      notify(`Friend request sent to @${b.dataset.username}!`); await refreshFriends();
    } else if (action === 'reply-friend') {
      await api(`/friends/requests/${id}/respond`, { method: 'POST', body: JSON.stringify({ accept: b.dataset.accept === 'true' }) });
      notify('Friend request updated.'); await refreshFriends();
    } else if (action === 'reply-invite') {
      await api(`/invitations/${id}/respond`, { method: 'POST', body: JSON.stringify({ accept: b.dataset.accept === 'true' }) });
      notify('Playlist invitation updated.'); await refreshFriends();
    } else if (action === 'remove-friend') {
      if (confirm('Remove this friend?')) { await api(`/friends/${id}`, { method: 'DELETE' }); await refreshFriends(); }
    } else if (action === 'record-start') await startRecording();
    else if (action === 'record-stop') { if (state.recorder?.state === 'recording') state.recorder.stop(); }
    else if (action === 'logout') {
      await api('/auth/logout', { method: 'POST' });
      state.user = null; state.favorites.clear(); state.playlists = [];
      closeModal(); setAccountLabel(); notify('See you next time!'); await loadView('home');
    } else if (action === 'delete-account') {
      const password = prompt('This permanently deletes your account, playlists and saved songs. Enter your password to confirm:');
      if (!password) return;
      await api('/profile', { method: 'DELETE', body: JSON.stringify({ password }) });
      state.user = null; state.favorites.clear(); closeModal(); setAccountLabel(); await loadView('home');
      notify('Account deleted.');
    }
  } catch (error) { notify(error.message, true); }
});

// Forms use the same listener rather than defining a new function for each modal.
document.addEventListener('submit', async event => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const submit = form.querySelector('[type=submit],button:not([type])');
  if (submit) submit.disabled = true;
  try {
    if (form.dataset.form === 'register' || form.dataset.form === 'login') {
      const result = await api(`/auth/${form.dataset.form}`, { method: 'POST', body: JSON.stringify(data) });
      state.user = result.user;
      await loadFavorites();
      setAccountLabel(); closeModal(); notify(`Welcome ${state.user.display_name}!`); await loadView('home');
    } else if (form.dataset.form === 'profile') {
      const r = await api('/profile', { method: 'PATCH', body: JSON.stringify(data) });
      state.user = r.user; setAccountLabel(); closeModal(); notify('Profile updated.');
    } else if (form.dataset.form === 'create-playlist') {
      const r = await api('/playlists', { method: 'POST', body: JSON.stringify(data) });
      closeModal(); notify('Playlist created.'); await playlistDetail(r.playlist.id);
    } else if (form.dataset.form === 'edit-playlist') {
      const id = state.detail.id;
      await api(`/playlists/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      closeModal(); notify('Playlist updated.'); await playlistDetail(id);
    } else if (form.dataset.form === 'add-to-playlist') {
      const t = getTrack(Number(data.trackId));
      await api(`/playlists/${data.playlistId}/tracks`, { method: 'POST', body: JSON.stringify({ track: t }) });
      closeModal(); notify(`Added ${t.title} to your playlist!`);
    } else if (form.dataset.form === 'invite') {
      await api(`/playlists/${state.detail.id}/invite`, { method: 'POST', body: JSON.stringify({ username: data.username }) });
      closeModal(); notify('Collaboration invitation sent!');
    } else if (form.dataset.form === 'save-mix') {
      const r = await api('/playlists', { method: 'POST', body: JSON.stringify({ name: data.name, description: `Generated from the ${state.mood} mood in ECHO Mix Lab.`, visibility: data.visibility }) });
      await api(`/playlists/${r.playlist.id}/tracks/bulk`, { method: 'POST', body: JSON.stringify({ tracks: state.generated.tracks }) });
      closeModal(); notify('Mix saved to your library!'); await playlistDetail(r.playlist.id);
    }
  } catch (error) { notify(error.message, true); }
  finally { if (submit) submit.disabled = false; }
});

document.querySelector('#global-search').addEventListener('keydown', async event => {
  if (event.key !== 'Enter') return;
  const q = event.target.value.trim();
  if (!q) return;
  state.search = q; state.genre = 'all';
  await loadView('discover');
});
document.addEventListener('keydown', async event => {
  if (event.key === 'Enter' && event.target.id === 'discover-query') await searchDiscover();
  if (event.key === 'Enter' && event.target.id === 'user-query') await searchUsers();
});
document.addEventListener('change', async event => {
  if (event.target.id === 'genre-filter' || event.target.id === 'sort-filter') await searchDiscover();
  if (event.target.id === 'audio-upload' && event.target.files?.[0]) {
    await recognizeAudio(event.target.files[0], event.target.files[0].name);
  }
});
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
function setAccountLabel() {
  const b = document.querySelector('#account-button');
  b.textContent = state.user ? state.user.display_name[0].toUpperCase() : '↗';
  b.title = state.user ? `${state.user.display_name} · Account` : 'Log in / Sign up';
}
async function loadFavorites() {
  if (!state.user) return;
  try { const data = await api('/favorites'); state.favorites = new Set(data.tracks.map(t => Number(t.id))); storeTracks(data.tracks); }
  catch { state.favorites = new Set(); }
}
async function init() {
  try {
    const d = await api('/auth/me');
    state.user = d.user;
    await loadFavorites();
  } catch { /* Display the public homepage even if the server is not running. */ }
  setAccountLabel();
  await loadView('home');
}
init();