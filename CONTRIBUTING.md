# Contributing to ECHO

ECHO is a two-person TU Dublin course project. Keep work understandable and easy to demonstrate.

## Working with GitHub

1. Make sure `main` runs locally before branching.
2. Create a feature branch, such as `feature/music-search` or `feature/friends`.
3. Make small changes; verify them with `npm test` and `npm run check`.
4. Commit *your actual work* with a clear message such as `Add genre filtering to Discover`.
5. Push your branch and open a pull request for review by the other teammate.
6. Resolve review comments, then merge.

## Style

- Prefer straightforward HTML, CSS and JavaScript. Avoid unnecessary frameworks.
- Put browser UI changes in `public/`, API logic in `server/`, and tests in `tests/`.
- Validate inputs and check ownership on every write operation.
- Use PostgreSQL parameter placeholders, not string-built SQL.
- Keep configuration and private tokens in `.env`, **never** in Git.
- Document any third-party snippets and licenses where applicable.

For the required assessment demos, both partners must understand the parts they changed and show genuine individual contributions.