# Edit and extend the portfolio

The website has no build step. Edit its HTML, CSS, and JavaScript, preview it with a local HTTP server, then package and upload the public files. Keep a backup or Git commit before larger changes.

## Content map

| What you want to change                                              | File                                           |
| -------------------------------------------------------------------- | ---------------------------------------------- |
| Name, introduction, biography, experience, skills, and contact links | `index.html`                                   |
| Project cards                                                        | `index.html`                                   |
| Project dialog descriptions and supporting details                   | `assets/js/main.js`                            |
| Gaming introduction and OP.GG account links                          | `gaming/index.html`                            |
| Journal behavior and browser storage                                 | `assets/js/gaming.js`                          |
| Main colors, fonts, spacing, layout, and breakpoints                 | `assets/css/styles.css`                        |
| Gaming colors and layout                                             | `assets/css/gaming.css`                        |
| CV download                                                          | `assets/docs/Andreas-Paraskeva-CV.pdf`         |
| Search engine titles and descriptions                                | Each page's `<head>`                           |
| Public page list and canonical domain                                | `sitemap.xml`, `robots.txt`, and page metadata |

## Career and CV

Use abbreviated month names consistently, for example `Oct 2026`. The website includes **Systems Engineer · IBSCYLTD · Oct 2026–Present**, based on the supplied update. Keep job descriptions factual when adding responsibilities or achievements.

The PDF is the original uploaded CV, which predates the new role. To update or redact it, replace `assets/docs/Andreas-Paraskeva-CV.pdf` with a revised PDF using the same filename. The original includes contact information such as phone and email; publish the version you want visitors to download. Changing the filename also requires updating the download links.

## Projects and visual assets

Update a project's card and its JavaScript dialog data together. Keep titles, identifiers, descriptions, and links consistent. Existing illustrations are identified as conceptual; retain that distinction unless you replace them with authorized screenshots of actual work.

Put images in `assets/images/`, use descriptive filenames, and provide meaningful `alt` text. Prefer compressed WebP or similarly efficient formats. Keep large source artwork outside the public assets folder if it is not needed by the site.

Fonts live in `assets/fonts/`. Their license files ship with the site; keep those files alongside the fonts when updating the package.

## Gaming accounts and progress

The linked accounts are **KataFlix#EUNE** and **EvelynnFlix#EUNE**. If either Riot ID changes, update the visible account name and its OP.GG link in `gaming/index.html`, and the `accounts` data at the top of `assets/js/gaming.js`. Links use the EUNE region; a different region requires a different OP.GG URL.

The page does not display live ranks or fetch Riot account statistics. OP.GG supplies current account details when visitors follow the links.

The progress journal uses `localStorage` in the visitor's browser. Data is specific to a browser, device, and website origin. It does not sync across devices, is not a shared public account log, and may disappear when browser data is cleared or private browsing ends. HTTP and HTTPS are different origins, so preview data does not transfer to the live site. Use **Export JSON** to download a backup and **Import JSON** to restore it in another browser. Import merges valid entries without overwriting existing sessions; duplicate entries are ignored. The journal holds up to 200 sessions.

When changing the journal, preserve compatibility with saved entries. Avoid rendering user-entered text as HTML. A shared or automatically updated journal would need a separate backend and authentication design.

## Contact and services

Contact links use `mailto:` and open the visitor's configured email application. The website does not collect form submissions or include analytics. Adding a contact form requires a mail service or backend; adding analytics requires its own configuration and privacy review.

## Design and accessibility

### Red theme and cinematic intro

The shared accent is `--accent` in `assets/css/styles.css`; gaming uses `--game-accent` in `assets/css/gaming.css`. Keep the two colors aligned. The red hero artwork is `assets/images/hero-art-red.webp`. Updating it changes both the homepage and the opening reveal.

Intro copy and controls are in the `#site-intro` dialog in `index.html`. Its animation is in `assets/css/intro.css`; playback and once-per-tab behavior are in `assets/js/intro.js`. The `SEQUENCE_MS` and `EXIT_MS` constants control the automatic entry time and final curtain transition. If these change, keep the CSS keyframe durations aligned. Skip, Enter, and Escape remain immediate exits.

The intro is a short visual opening rather than a download-progress indicator. It does not delay the page for asset-loading promises. Reduced-motion preferences bypass automatic playback; manually replaying with reduced motion shows a static introduction with working exit controls. Direct section links bypass the intro too. The `ap.portfolio.intro.v1` sessionStorage marker controls the current tab, and storage failures never prevent entry.

During review, use a new tab or the footer's **Replay intro** control. Preserve the modal dialog's accessible name, keyboard focus restoration, and page scroll cleanup. Without JavaScript the dialog stays closed and the portfolio remains available.

Adjust shared CSS variables first to change the visual theme consistently. Keep readable contrast, visible keyboard focus, and mobile spacing. The responsive layout and reduced-motion handling should remain intact when adding animations.

Use real links for navigation and buttons for interactions. Label interactive controls, keep heading order sensible, and ensure project dialogs can close with their close control and the Escape key. Test a keyboard-only pass after changing menus, dialogs, or controls.

## Preview and check

From the repository root:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/` and `http://127.0.0.1:8000/gaming/`. Check a narrow mobile width and a desktop width, then use the static checker:

```bash
python3 tests/check_site.py
```

`tests/smoke.mjs` contains browser checks for an environment with Playwright available. These source-only tools are not required on your hosting account. After editing, create a new upload package and follow [DEPLOYMENT.md](DEPLOYMENT.md).
