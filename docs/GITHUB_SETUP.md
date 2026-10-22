# ECHO GitHub repository

The source code is hosted at **https://github.com/tochiogueri/webDevProject_echo** on the `main` branch.

## Clone it locally

```bash
git clone https://github.com/tochiogueri/webDevProject_echo.git
cd webDevProject_echo
npm install
```

Create your local `.env` from `.env.example`, add your own database password and JWT secret, create the PostgreSQL database `echo_music`, then run `npm run dev`.

## Coursework collaboration

- The repo is currently **public**. For private coursework collaboration, the owner should switch visibility to **private** under **Settings > General > Danger Zone > Change repository visibility**.
- Invite your development partner and the lecturer required by the brief through **Settings > Collaborators** after making it private.
- Both partners should use their own GitHub accounts and make meaningful feature commits.
- Work in feature branches; use pull requests to review changes before merging into `main`.
- Run `npm test` and `npm run check` before each push.
- Never upload `.env`, `node_modules`, tokens or database passwords.
- For the final assessment, export the database setup scripts and supply a ZIP without `node_modules`, along with your separate video demonstration.

## Helpful links

- [Project README](../README.md)
- [Complete setup guide](SETUP_GUIDE.md)
- [Submission checklist](PROJECT_CHECKLIST.md)
