# ECHO. · Find your frequency.

A modern music discovery and collaborative playlist web application built for the **TU Dublin Web Development and Deployment (TU857/TU858) pair project**.

**Built with simple technology:** HTML + CSS + vanilla JavaScript in the browser, Node.js + Express in the backend, and PostgreSQL for permanent storage. No React, TypeScript, bundlers, or complicated project setup.

## What you can do

| Feature | What it does | Login? |
| --- | --- | --- |
| Home / Discover | Search real artists and songs using the public iTunes REST API, hear 30-second previews, filter genres, sort results | No |
| Account | Register, log in, log out, edit profile, delete account | No (to register) |
| Liked songs | Save / remove favorite songs | Yes |
| Playlists | Create, read, edit, delete playlists; add/remove tracks; set public/private | Yes |
| Community | Browse public playlists and search for other users | No |
| Friends | Send, accept/decline requests, remove friends | Yes |
| Collaboration | Invite friends to a playlist; accept/decline; contribute/remove your songs; leave | Yes |
| Music DNA | Live charts of top genres/artists and counts from the PostgreSQL database | Yes |
| Mix Lab | Generate a 12-song playlist from one of six moods via a live music REST API; save it | No (save requires login) |
| Music recognition | Record or upload a clip; identify a real song via the AudD recognition service | Yes + **optional AudD API token** |

**Important about recognition:** Real Shazam-style identification is not possible with a name-search API alone. This implementation uploads a short audio clip to [AudD](https://audd.io/) and displays the identified song. You need your own AudD API token, which may have usage charges or trial restrictions. Without it, the recognition page explains that configuration is needed. The feature does **not** fake a match.

**Important about playback:** This is a music discovery / preview app, not a full music streaming service. iTunes provides short samples (usually ~30 seconds), not full copyrighted songs.

## 1. What to install

1. [Node.js](https://nodejs.org/) version **20 or newer** (Node 22 LTS is a good choice).
2. [PostgreSQL](https://www.postgresql.org/download/) and optionally pgAdmin for creating the database.
3. [VS Code](https://code.visualstudio.com/) to edit the files.

## 2. Create the PostgreSQL database

Open **pgAdmin** → connect to your local PostgreSQL server → right click **Databases** → **Create > Database** → name it:

`echo_music`

Alternatively, in a SQL query window connected as a PostgreSQL admin, run:

```sql
CREATE DATABASE echo_music;
```

You **do not** have to create tables manually. When the Node server starts, it executes `server/schema.sql` to create all the tables automatically.

## 3. Configure environment variables

Open the folder in VS Code. Make a copy of `.env.example` named **`.env`**.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit the new `.env` with your actual PostgreSQL password:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/echo_music
JWT_SECRET=replace_with_a_random_string_of_at_least_32_characters
AUDD_API_TOKEN=
NODE_ENV=development
```

Your PostgreSQL username may be different from `postgres`. If your password includes special URL characters such as `@` or `#`, encode them in the connection string, or use a simple development database password.

**Never upload `.env` to GitHub.** It is already included in `.gitignore`.

## 4. Install and start ECHO

Open a terminal in the folder with `package.json` and run:

```bash
npm install
npm run dev
```

Wait for the message:

```text
PostgreSQL tables are ready.
ECHO listening at http://localhost:3000
```

Open **http://localhost:3000** in your browser. `npm start` also works, but `npm run dev` restarts the server automatically after backend edits.

If you get a database connection error, make sure PostgreSQL is running, the database exists, and `.env` contains the correct username/password.

## 5. Add demo data (optional, handy for the lecturer)

```bash
npm run seed
```

This adds two fake demo users, sample tracks, liked songs, a friendship, and two public playlists. Run only in your **local development** database. These tracks are labeled **DEMO** and have no audio previews.

| Demo username | Password |
| --- | --- |
| `echo_demo_alex` | `DemoPass123!` |
| `echo_demo_sam` | `DemoPass123!` |

**Never seed a publicly deployed database** with the known demo password. You can instead create your own users normally using Sign up.

## 6. Enable real music recognition (optional)

1. Get an AudD music recognition API token from [audd.io](https://audd.io/).
2. Add `AUDD_API_TOKEN=YOUR_TOKEN_HERE` to `.env`.
3. Restart the server.
4. Sign in, visit **Recognize**, and record a short clip or upload an audio file (max 8 MB).

Recording requires microphone permission and **HTTPS** on deployed sites. Browsers also allow microphone access at `localhost`. Tokens stay in the backend and are never sent to the browser. AudD may charge for requests; check the provider's terms before using it.

## Folder map: where things are

```text
echo-music-app/
├── public/
│   ├── index.html          # Page structure, sidebar, player, dialog
│   ├── styles.css          # All design and mobile layouts
│   ├── app.js              # Buttons, pages, fetch(), playback, UI
│   └── favicon.svg         # ECHO icon
├── server/
│   ├── index.js            # Express REST API (routes and authentication)
│   ├── db.js               # PostgreSQL connection and song saving
│   ├── music.js            # Music search + simple mood mix logic
│   ├── schema.sql          # Database tables and relationships
│   └── seed.js             # Optional demo data
├── tests/
│   └── music.test.js       # Beginner-friendly unit tests
├── docs/
│   ├── API_REFERENCE.md    # Every endpoint in one place
│   ├── PROJECT_CHECKLIST.md
│   └── CODE_WALKTHROUGH.md
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── readme.txt              # Short submission instructions
```

### How the app works (in everyday language)

**Example: liking a song**

1. You tap `♡` on the Discover page.
2. `public/app.js` runs `favorite(id)` and uses `fetch()` to send the song to `/api/favorites`.
3. `server/index.js` checks that you are logged in.
4. `server/db.js` saves the song to PostgreSQL using a parameterized SQL query.
5. The backend returns `{ "ok": true }` and the heart changes to `♥`.
6. Next time you log in, the heart is still filled because it was saved in PostgreSQL.

**Example: Mix Lab**

1. Choose a mood like *Gym Energy*.
2. `app.js` requests `/api/music/generate?mood=gym`.
3. `server/music.js` searches iTunes for two related genres and combines 12 different results.
4. You can preview tracks, then click **Save playlist**.
5. The browser creates a playlist in PostgreSQL, then saves its songs via `/api/playlists/:id/tracks/bulk`.

The playlist generator uses a simple **rule-based approach**, not an invented AI model. You can read every rule in `server/music.js`.

## Security explained

- Passwords are hashed with `bcryptjs` (never stored as plain text).
- Logins use a signed JWT in a `HttpOnly`, `SameSite=Strict` cookie.
- SQL queries use placeholders like `$1` and `$2` to prevent SQL injection.
- The server checks authentication and playlist owner/collaborator permissions.
- `helmet` adds common security headers and a Content Security Policy.
- Rate limiting is enabled on the API and especially login/registration routes.
- Audio uploads are kept in memory and limited to 8 MB.
- Sensitive tokens and passwords stay in the `.env` file and are not committed to Git.
- The frontend escapes text added to HTML to reduce cross-site scripting risks.

For a real public launch, also configure HTTPS, a production database, proper backups, logging, and monitoring.

## Testing

```bash
npm test
npm run check
```

- `npm test` runs Node's built-in unit test runner; no additional test framework needed.
- `npm run check` checks the JavaScript syntax of the main source files.
- `docs/PROJECT_CHECKLIST.md` lists manual checks for each assessed feature.

## What the assignment requires

Based on the uploaded TU Dublin brief:

| Assessment category | Marks | ECHO implementation |
| --- | ---: | --- |
| Responsive mobile-first UI/UX | 20 | CSS breakpoints, mobile tab bar, responsive song/playlist grids, keyboard focus |
| Authentication & public/private areas | 10 | Registration/login/logout, protected features, private and public playlists |
| Database CRUD | 10 | Users/profile, playlists, favorites, friends and collaborative tracks in PostgreSQL |
| Asynchronous external REST API | 20 | iTunes Search API plus optional AudD for recognition; `fetch` and `async/await` |
| Advanced search/filter | 10 | Song/title/artist search, genre filter, alphabetical sorting, users and public playlists search |
| Application security | 10 | Hashing, cookies, permissions, rate limiting, headers, input checks, parameterized SQL |
| Code quality | 5 | Small files, code comments, helper functions, tests, documented endpoints |

There are three assessed labs (weeks 8, 10, 12), each **5%**, and the final submission is due **13 December 2026 at 23:59**. The final 85% includes the criteria above. Your lecturer also requires **regular GitHub pushes from both partners**, a **private repository** with `dianaferreiraTUDublin` invited, and a **10-minute maximum video demo with both students showing their contributions**.

**Important:** A finished codebase alone does not guarantee full marks. You and your partner need to install it, understand the implementation, test it on your computers, improve it, and show your individual work at the labs.

## Suggested pair division

- **Developer A:** users/accounts, security, friends, Music DNA, profile page.
- **Developer B:** music catalogue, search/filter, playlists, Mix Lab, recognition.
- **Both:** collaboration, responsive design, manual testing, GitHub integration, video demo.

Read `docs/CODE_WALKTHROUGH.md` before making changes. Keep each Git commit focused on a small feature so that both contributions are visible.

## Troubleshooting

- **Home shows “design-only samples”:** iTunes public catalogue request failed. Check your internet, API access, and backend logs. The sample cards are not playable.
- **Login gives a server error:** PostgreSQL may be stopped, or connection details in `.env` are wrong.
- **“Recognition requires an API token”:** add `AUDD_API_TOKEN` as described above. The rest of the app works without it.
- **No preview plays:** Some tracks do not provide a preview URL. Try another track.
- **The app displays your songs but nothing is saved:** You may be browsing without signing in. Songs only persist when saved to favorites or playlists.
- **Changed your backend file but not seeing updates:** restart `npm start` or use `npm run dev`.