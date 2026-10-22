# ECHO explained for beginners

This app deliberately uses **plain HTML, CSS, JavaScript, Node.js, Express, and PostgreSQL**. You do not need React or another frontend framework to change it.

## The simple big picture

```text
Your browser             Your Node.js server             PostgreSQL
(public/index.html)       (server/index.js)              (echo_music)
        |                         |                            |
Click a button            Receives a REST API call        Stores information
        | ---- fetch() ---------> | ---- SQL query ----------> |
        | <---- JSON response --- | <--- rows / result -------- |
Update the page
```

The external iTunes API is called **by the server**, from `server/music.js`. iTunes returns music metadata and short previews. AudD is a separate optional recognition API called from `server/index.js`.

## The five files to understand first

1. **`public/index.html`**: the permanent page structure: menus, player, modal window and a `<main>` area where JavaScript displays each view.
2. **`public/styles.css`**: colors, spacing, responsive layouts and animations. Change CSS variables near the start to personalize the design.
3. **`public/app.js`**: browser behavior. Search for `data-action`, `data-nav`, `async function`, and `api(` to learn how button clicks work.
4. **`server/index.js`**: REST routes and login checks. The routes each start with `app.get`, `app.post`, `app.patch` or `app.delete`.
5. **`server/schema.sql`**: PostgreSQL tables, foreign keys, and relationships.

Other helpful files: `server/db.js` connects to PostgreSQL; `server/music.js` handles music search and the rule-based mood generator; `server/seed.js` adds optional *local-only* demonstration accounts.

## Example: saving a favorite

1. Discover a track and press its heart icon.
2. `public/app.js` sends an HTTP `POST` request to `/api/favorites`, with the song information in JSON.
3. `server/index.js` checks whether the browser's signed login cookie belongs to an account.
4. `server/db.js` saves the song in `tracks`.
5. `server/index.js` connects your account to that song in `favorites`.
6. The server responds and the heart becomes active.
7. Refresh the page: the heart can still be active because data is stored in PostgreSQL, not only in the browser.

## Example: editing a playlist

The browser sends `PATCH /api/playlists/:id` to edit, or `DELETE /api/playlists/:id` to remove. The server checks that the signed-in user **owns** that playlist. It then runs an SQL `UPDATE` or `DELETE` query with placeholders such as `$1`, to avoid SQL injection.

## Example: Mix Lab playlist generator

`server/music.js` defines six mood presets. Each preset holds two search phrases, such as `lofi instrumental` and `ambient piano`. Clicking Generate calls `/api/music/generate?mood=focus`, gathers live results from the iTunes API, alternates tracks from the two searches, removes duplicates, and returns up to 12 songs. This is **rule-based music discovery**, not artificial intelligence. You can add another mood by copying a short preset in `MOODS`.

## Example: music recognition

The browser records audio through `MediaRecorder`, or accepts an uploaded sound clip. The Node server forwards the audio to **AudD**, then displays its actual response. Recognition requires a valid `AUDD_API_TOKEN` in `.env` and an internet connection. Without that token the feature correctly explains that it is unavailable. The site does **not** pretend that a typed song name is audio recognition.

## Learn the basics in this order

1. Open `index.html` and locate the Discover navigation button.
2. Open `styles.css` and adjust the accent color.
3. Open `app.js` and find the code that renders Discover.
4. Open `server/index.js` and locate `/api/music/search`.
5. Open `server/music.js` and add a new mood preset.
6. Open `schema.sql` and draw the relationship between `users`, `playlists` and `playlist_tracks`.
7. Log in with two separate browsers to test sending a friend request and accepting a playlist invitation.

**For assessment:** Be able to explain what `fetch`, `async/await`, Express routes, SQL queries, HTTP methods, cookies, and PostgreSQL foreign keys each do. Do not claim that optional recognition is active until you have successfully tested it with your own AudD token.