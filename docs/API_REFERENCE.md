# ECHO REST API reference

All routes begin with `/api`. Responses are JSON except for audio upload. Routes requiring authentication expect the signed login cookie automatically set by the browser.

| Method | Route | What it does | Sign in? |
| --- | --- | --- | --- |
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Log in | No |
| POST | `/auth/logout` | Log out | No |
| GET | `/auth/me` | Get current user | No |
| PATCH | `/profile` | Edit display name and bio | Yes |
| DELETE | `/profile` | Delete account after password confirmation | Yes |
| GET | `/music/search?q=artist&genre=all&sort=title` | Search iTunes catalogue; optional filters | No |
| GET | `/music/moods` | Get six mix moods | No |
| GET | `/music/generate?mood=gym` | Generate up to twelve tracks | No |
| GET | `/music/recognition-status` | Whether AudD API token exists | No |
| POST | `/music/recognize` | Upload audio clip in multipart field `audio` | Yes |
| GET | `/favorites` | Get my liked songs | Yes |
| POST | `/favorites` | Like song, `{ "track": {...} }` | Yes |
| DELETE | `/favorites/:id` | Unlike song | Yes |
| GET | `/playlists/public?q=...` | Browse/search public playlists | No |
| GET | `/playlists/mine` | My created and shared playlists | Yes |
| GET | `/playlists/:id` | Playlist and tracks, if permitted | Public or member |
| POST | `/playlists` | Create playlist | Yes |
| PATCH | `/playlists/:id` | Update playlist name, description, visibility | Owner |
| DELETE | `/playlists/:id` | Delete playlist | Owner |
| POST | `/playlists/:id/tracks` | Add one track | Owner/member |
| POST | `/playlists/:id/tracks/bulk` | Add up to 30 tracks | Owner/member |
| DELETE | `/playlists/:id/tracks/:trackId` | Remove owned/contributed track | Owner/contributor |
| GET | `/users/search?q=...` | Find registered users | No |
| GET | `/friends` | Friends and requests | Yes |
| POST | `/friends/requests` | Send request, `{ "username":"..." }` | Yes |
| POST | `/friends/requests/:id/respond` | Accept or decline, `{ "accept":true }` | Yes |
| DELETE | `/friends/:id` | Unfriend | Yes |
| GET | `/invitations` | My playlist invitations | Yes |
| POST | `/playlists/:id/invite` | Invite friend by username | Owner |
| POST | `/invitations/:id/respond` | Accept or decline playlist invitation | Yes |
| DELETE | `/playlists/:id/leave` | Leave a shared playlist | Member |
| GET | `/dna` | Counts, genre breakdown, artists | Yes |

## A few examples

Search from the browser:

```js
const response = await fetch('/api/music/search?q=daft%20punk');
const data = await response.json();
console.log(data.tracks);
```

Create a playlist after logging in:

```js
await fetch('/api/playlists', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'same-origin',
  body: JSON.stringify({ name: 'My favorites', description: '', visibility: 'private' })
});
```

A track has the following basic shape:

```json
{
  "id": 12345,
  "title": "Example song",
  "artist": "Example artist",
  "album": "Example album",
  "genre": "Pop",
  "artwork": "https://example.com/cover.jpg",
  "preview_url": "https://example.com/sample.m4a",
  "duration_ms": 198000
}
```

The numeric ID is the iTunes song ID, not a locally invented ID.