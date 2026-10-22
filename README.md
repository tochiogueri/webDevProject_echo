<p align="center"><img src="assets/echo-banner.svg" alt="ECHO. Find your frequency. Music discovery, playlists and social listening." width="100%"></p>

<p align="center">
  <img alt="Node.js 20+" src="https://img.shields.io/badge/Node.js-20%2B-43853D?style=flat-square&logo=nodedotjs&logoColor=white">
  <img alt="Express 4" src="https://img.shields.io/badge/Express-4-222222?style=flat-square&logo=express">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-database-336791?style=flat-square&logo=postgresql&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black">
  <img alt="TU Dublin" src="https://img.shields.io/badge/TU%20Dublin-Web%20Development-8F87E4?style=flat-square">
</p>

<p align="center"><b>A social music discovery platform for people who want to find, save and share their sound.</b></p>
<p align="center">Built as a TU Dublin Web Development &amp; Deployment (TU857/TU858) pair project.</p>

---

## What is ECHO?

ECHO combines live music discovery with personal collections and social playlists. Discover artists with the **iTunes Search API**, preview available 30-second clips, create playlists, connect with friends and explore your **Music DNA**. The responsive interface is built with **HTML, CSS and vanilla JavaScript**, with an **Express REST API** and **PostgreSQL** database behind it.

> **Scope:** ECHO is a music **discovery and preview** website, not a full music streaming service. Music recognition works only when an AudD API token is configured. Mix Lab uses transparent rules, not an AI recommendation model.

## Features

| Discover | Your library | Connect & collaborate |
| :--- | :--- | :--- |
| Search live artists and songs | Save favorite tracks | Find other users |
| Listen to available 30-second previews | Create, rename and delete playlists | Send and accept friend requests |
| Filter genres and sort results | Control public/private visibility | Invite friends to collaborate |
| Generate mood-based mixes | Explore saved-genre and artist statistics | Explore community playlists |

**Extra features:** music recognition with an optional AudD key, profile editing, responsive mobile tabs, and secured login.

## Quick start

Clone the project with `git clone https://github.com/tochiogueri/webDevProject_echo.git`, then run the commands below from inside that folder.


**Requirements:** Node.js **20+**, PostgreSQL, and an internet connection for live music search.

**1.** Create an empty PostgreSQL database named `echo_music` (pgAdmin is fine).

```sql
CREATE DATABASE echo_music;
```

**2.** Clone the repository, install dependencies, and create your local configuration.

```bash
npm install
```

On **Windows PowerShell**:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux: `cp .env.example .env`.

**3.** Edit `.env` with your **own** PostgreSQL password and a random secret of at least 32 characters:

```dotenv
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/echo_music
JWT_SECRET=replace_with_a_random_secret_of_at_least_32_characters
AUDD_API_TOKEN=
NODE_ENV=development
```

**4.** Start ECHO.

```bash
npm run dev
```

Open **http://localhost:3000**. ECHO creates its database tables automatically on startup from `server/schema.sql`.

> Never commit your `.env` file or private API tokens. The repository includes only `.env.example` with placeholder values.

### Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Run the Express server |
| `npm run dev` | Run the server with Node's watch mode |
| `npm test` | Run the unit tests |
| `npm run check` | Check JavaScript syntax |
| `npm run seed` | Add *local-only* fictional demonstration accounts and sample playlists |

`npm run seed` uses a published demo password. **Never run it on a publicly accessible production database.**

## Tech stack

- **Frontend:** semantic HTML, responsive CSS, plain JavaScript, Fetch API
- **Backend:** Node.js, Express, REST endpoints, JWT authentication in HttpOnly cookies
- **Database:** PostgreSQL with relational tables and parameterized SQL
- **External data:** iTunes Search API; optional AudD song recognition API
- **Testing:** Node.js built-in test runner, GitHub Actions workflow

## How it fits together

```mermaid
flowchart LR
  A[Browser: HTML / CSS / JS] -->|Fetch JSON| B[Express REST API]
  B -->|Parameterized SQL| C[(PostgreSQL)]
  B -->|Music search| D[iTunes Search API]
  B -.->|Optional audio ID| E[AudD API]
```

## Project layout

```text
Echo-Music/
├── assets/             # README banner
├── public/             # HTML, CSS, browser JavaScript and icon
├── server/             # Express endpoints, SQL schema and music helpers
├── tests/              # Unit tests
├── docs/               # API reference, beginner walkthrough, assessment checklist
├── .github/            # Pull request template and test workflow
├── .env.example        # Safe example configuration
├── .gitignore          # Excludes secrets and installed dependencies
├── package.json
├── README.md
└── readme.txt          # Brief college submission setup notes
```

## Documentation

| Guide | Contains |
| --- | --- |
| [Complete setup and usage guide](docs/SETUP_GUIDE.md) | Step-by-step pgAdmin setup, user features, security and troubleshooting |
| [Beginner code walkthrough](docs/CODE_WALKTHROUGH.md) | How HTML, JS, Express and PostgreSQL communicate |
| [REST API reference](docs/API_REFERENCE.md) | Endpoints, methods, permissions and examples |
| [Testing and coursework checklist](docs/PROJECT_CHECKLIST.md) | Manual checks and marking requirements |
| [GitHub setup for the team](docs/GITHUB_SETUP.md) | Cloning the repository and working with your project partner |
| [Contributing](CONTRIBUTING.md) | Branches, readable commits and pair workflow |

## Project status and limitations

- The project includes **unit tests and syntax checks**. These do not replace real end-to-end testing with a running PostgreSQL database.
- Live catalogue search and preview playback need access to the external iTunes service; some tracks have no preview.
- Music recognition needs a separate AudD API key and, for recording on a deployed site, HTTPS and microphone permission.
- Deploying publicly needs a production database, HTTPS, secrets configuration, and further integration and security testing.
- This is **work in progress for coursework**. Features listed here describe the included implementation, not a claim that every flow has been deployed or manually verified.

## Coursework and teamwork

This is a **pair assignment**. Each team member should push their own meaningful work and be ready to demonstrate and explain it. Keep the repository **private** while it contains coursework and invite your partner and the lecturer according to your assignment brief.

**Academic note:** The supplied code includes AI-assisted material. Review, test and understand it before submitting. Do not claim individual authorship of teammates' changes or work not performed.

<p align="center"><b>ECHO.</b> &nbsp; Find your frequency. 🎧</p>