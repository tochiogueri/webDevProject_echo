# TU Dublin project: test and submission checklist

The **final submission is 13 December 2026 at 23:59**, per your uploaded brief. Weeks 8, 10 and 12 each include a marked demonstration worth 5%; the final stage is worth 85%.

## Before the first team demonstration

- [ ] Install Node.js and PostgreSQL and copy `.env.example` to `.env`.
- [ ] Run `npm install` and `npm start`; load `http://localhost:3000`.
- [ ] Register a new account, sign out, then sign back in.
- [ ] Search artists and songs in Discover with a working internet connection.
- [ ] Try preview playback, genre filters, and sorting.
- [ ] Like a song, create a playlist, add that song, rename the playlist, delete a song, and reload to verify persistence.
- [ ] Make another account and test public vs private playlist visibility.
- [ ] Search for another user, send a friend request, and accept it in another browser session.
- [ ] Invite the friend to collaborate on a playlist; accept invitation and contribute a track.
- [ ] Save favorites/playlist songs and visit Music DNA to verify real saved statistics.
- [ ] Generate mixes for all six moods and save one as a playlist.
- [ ] Verify Recognize explains the missing API key without a token. If adding an AudD key, test actual matching using permitted audio.
- [ ] Inspect on a narrow mobile screen and a laptop-width screen.
- [ ] Test invalid usernames, duplicate email addresses, wrong passwords, unauthorized playlist edits and oversized uploads.
- [ ] Run `npm test` and `npm run check`.

## Marking scheme coverage

| Category | Marks | Feature to demonstrate |
| --- | ---: | --- |
| Mobile-first interface | 20 | Narrow screen: sidebar becomes mobile tabs, cards reflow, player adapts |
| Authentication / public vs private | 10 | Registration and login, public discovery, private library, access checks |
| Persistent database CRUD | 10 | Add/edit/delete playlists and users, favorites, collaboration |
| Asynchronous REST API | 20 | Live iTunes search/mix generator and loading UI, optional AudD |
| Search and filters | 10 | Artist/song search, genre filter, sort, playlists and user search |
| Security | 10 | Password hashing, authorization, validation, SQL parameters, rate limiting |
| Code quality | 5 | Code structure, meaningful commits, tests, documentation |

## GitHub and pair responsibilities

- [ ] Create a **private** GitHub repository.
- [ ] Invite your development partner and `dianaferreiraTUDublin`.
- [ ] Both partners make regular, meaningful commits and pushes under their own accounts. Do not artificially claim authorship of work done by someone else.
- [ ] Divide the code review and improvements so both partners can explain their contributions.
- [ ] Demonstrate milestones in weeks 8, 10, 12 as requested.

## Final Brightspace submission

- [ ] ZIP with code, deployment folder, `server/schema.sql`, optional `server/seed.js`, `readme.txt`, and actual GitHub repo name.
- [ ] Do **not** include `node_modules` or `.env` secrets.
- [ ] Both team members record an actual demonstration of their features, related code and database effects.
- [ ] Video must be **10 minutes maximum**, single speed, maximum 2 GB, submitted separately.
- [ ] Check that another computer can follow `readme.txt` from a fresh checkout.

## Testing limitations

Syntax and music helper unit tests can run without PostgreSQL. Real login, friends, playlist CRUD and data persistence require a running PostgreSQL database. Live music search requires network access. Music recognition needs an AudD token and permission for a real upload or microphone recording. **Do not label the whole app production-tested until those end-to-end checks are completed.**