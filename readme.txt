ECHO MUSIC APP - TU DUBLIN WEB DEVELOPMENT AND DEPLOYMENT

Requirements:
- Node.js 20+
- PostgreSQL server and an empty database called echo_music
- Internet connection for external iTunes music search and 30-second previews

Install:
1. Copy .env.example to .env
2. In .env, set DATABASE_URL (PostgreSQL credentials) and a JWT_SECRET (32+ characters)
3. Open a terminal in this folder and run: npm install
4. Run: npm start
5. Visit http://localhost:3000

The server creates database tables automatically from server/schema.sql.
Optional demo data: npm run seed (LOCAL DEV ONLY)
Optional real song recognition: add AUDD_API_TOKEN to .env, then restart.

Tests: npm test
Syntax checks: npm run check

For the complete feature guide, security notes, source map and project brief
mapping, read README.md and the docs/ folder.

GitHub repository name: tochiogueri/webDevProject_echo
Both development partners: [ADD THE TWO GROUP MEMBER NAMES]

Do NOT include node_modules or .env in your final submission ZIP.
Submit your 10-minute maximum video separately on Brightspace.