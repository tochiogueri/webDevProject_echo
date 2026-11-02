# ECHO Music: Week 8 / Milestone 1 live-demo guide
**TU Dublin, Web Development and Deployment | 2 November 2026 | 5 marks**

This guide refers to the **current repository**. The hamburger menu and the recent-search / chart work already exist. Do not overwrite them with an older ZIP.

## Prepare in VS Code
1. Save any uncommitted local changes before pulling. If you have replaced `public/styles.css` locally, stash it first.
2. Run `git pull origin main` in the ECHO repository folder (the one containing `package.json`).
3. Run `npm install` if dependencies are not installed. Confirm PostgreSQL and your local `.env` are configured.
4. Run `npm run dev` in the VS Code **terminal**, not inside the README.
5. Visit `http://localhost:3000` and use `Ctrl+Shift+R` to force-refresh.

## The five marks: what to click and say
| Mark | Show on screen | Where in the code | One-sentence explanation |
| --- | --- | --- | --- |
| 1: Node.js / localhost | Terminal running `npm run dev`; website at localhost:3000 | `package.json`, `server/index.js`, `public/index.html` | "Express serves our HTML, CSS and JavaScript over a local Node.js web server." |
| 2: Wide borders | Visible green outline of homepage hero and borders on cards | `public/styles.css`, section "MILESTONE 1: CLEARLY VISIBLE BORDERS" | "Borders separate interface components and keep visual consistency." |
| 3: Stacking | Chrome DevTools desktop width, then 375px; three feature cards become one vertical column | `.feature-grid` and `@media(max-width:650px)` in `styles.css` | "CSS Grid and media queries change the layout to fit smaller screens." |
| 4: Burger menu | On 375px width, click ☰ to open, pick a page, then close | `index.html` button `#hamburger-button`, `styles.css` `.hamburger` and `.mobile-menu`, `app.js` `closeMobileMenu()` | "The button toggles a hidden mobile navigation menu and updates its accessible expanded state." |
| 5: Cards/images/text | Home / Fresh on the radar: album art, song title, artist, genre | `app.js` `trackCard()`, `styles.css` `.music-card` and `.art-wrapper img` | "Reusable cards show artwork and concise information; CSS keeps images proportional." |

## Live walkthrough (2–3 minutes)
- Open terminal and show the running Node.js server, then your homepage.
- Point out the green hero border and the card borders.
- Open Chrome DevTools with **F12**, then Toggle device toolbar (**Ctrl+Shift+M**).
- Set viewport width to **375px**. Scroll to the "More than just playlists" feature cards to show stacking.
- Click ☰ to expand and collapse the burger menu and navigate to Discover.
- Return Home, show the music cards with images and short text.

## Important details to understand
- `1fr` in CSS Grid means one flexible column.
- `repeat(3, minmax(0, 1fr))` means three equally sized columns.
- A media query applies a CSS rule only at the specified viewport width.
- `[hidden]` makes the mobile navigation hidden until JavaScript opens it.
- `aria-expanded` tells assistive technology if the menu is open.
- `object-fit: cover` lets album covers fill their image frames neatly.
- Existing CSS is **desktop-first with responsive mobile overrides**. It works on mobile, but do not claim the source was written strictly mobile-first.

## Before presenting
- Confirm the server and database start successfully.
- Confirm music artwork loads from the external music service. When offline, the page uses clearly labelled design-only samples.
- Confirm the burger menu opens, closes, and does not overlap important controls.
- Confirm stacking at 375px and borders at desktop width.
- If the lecturer wants more code, open `public/styles.css`, search for `feature-grid` and `hamburger`, and briefly explain each.
