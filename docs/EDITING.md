# Edit and extend the portfolio

The website has no build step. Edit its HTML, CSS, and JavaScript, preview it with a local HTTP server, then package and upload the public files. Keep a backup or Git commit before larger changes.

## Content map

| What you want to change                                              | File                                                     |
| -------------------------------------------------------------------- | -------------------------------------------------------- |
| Name, introduction, biography, experience, skills, and contact links | `index.html`                                             |
| Project cards                                                        | `index.html`                                             |
| Project dialog descriptions and supporting details                   | `assets/js/main.js`                                      |
| Gaming introduction and OP.GG account links                          | `gaming/index.html`                                      |
| Account selection and region labels                                  | `assets/js/gaming.js`                                    |
| Page transitions                                                     | `assets/css/transitions.css`, `assets/js/transitions.js` |
| Main colors, fonts, spacing, layout, and breakpoints                 | `assets/css/styles.css`                                  |
| Gaming colors and layout                                             | `assets/css/gaming.css`                                  |
| CV download                                                          | `assets/docs/Andreas-Paraskeva-CV.pdf`                   |
| Search engine titles and descriptions                                | Each page's `<head>`                                     |
| Public page list and canonical domain                                | `sitemap.xml`, `robots.txt`, and page metadata           |

## Career and CV

Use abbreviated month names consistently, for example `Oct 2026`. The website includes **Systems Engineer · IBSCYLTD · Oct 2026–Present**, based on the supplied update. Keep job descriptions factual when adding responsibilities or achievements.

The PDF is the original uploaded CV, which predates the new role. To update or redact it, replace `assets/docs/Andreas-Paraskeva-CV.pdf` with a revised PDF using the same filename. The original includes contact information such as phone and email; publish the version you want visitors to download. Changing the filename also requires updating the download links.

## Projects and visual assets

Update a project's card and its JavaScript dialog data together. Keep titles, identifiers, descriptions, and links consistent. Existing illustrations are identified as conceptual; retain that distinction unless you replace them with authorized screenshots of actual work.

Put images in `assets/images/`, use descriptive filenames, and provide meaningful `alt` text. Prefer compressed WebP or similarly efficient formats. Keep large source artwork outside the public assets folder if it is not needed by the site.

Fonts live in `assets/fonts/`. Their license files ship with the site; keep those files alongside the fonts when updating the package.

## Gaming accounts and progress

The linked accounts are **KataFlix#EUNE** on EUNE and **EvelynnFlix#EUW** on EUW. Update the visible fallback link in `gaming/index.html`, the teaser in `index.html`, and the `accounts` data at the top of `assets/js/gaming.js` together. Each account has its own display tag, server region, and OP.GG URL. Changing only the URL leaves the visible label incorrect.

The page does not display live ranks or fetch Riot statistics. OP.GG supplies current account details when visitors follow the links. The session journal and its storage code have been removed; old notes already stored in a visitor's browser are not read or deleted.

## Contact and services

Contact links use `mailto:` and open the visitor's configured email application. The website does not collect form submissions or include analytics. Adding a contact form requires a mail service or backend; adding analytics requires its own configuration and privacy review.

## Design and accessibility

### Readable text, red theme, and cinematic intro

Body text starts at 18px, most paragraphs and controls use 16–18px, and the smallest labels use 13px. Keep text readable on mobile; avoid shrinking paragraphs to make them fit. Adjust layout, wrapping, and spacing instead.

The shared accent is `--accent` in `assets/css/styles.css`; gaming uses `--game-accent` in `assets/css/gaming.css`. Keep the two colors aligned. The red hero artwork is `assets/images/hero-art-red.webp`. Updating it changes both the homepage and the opening reveal.

The new opening layers the crimson artwork with the two project illustrations and staggered name reveals. It automatically enters in about four seconds. It is an original design; the external reference site could not be inspected from the development environment.

Intro copy and controls are in the `#site-intro` dialog in `index.html`. Its animation is in `assets/css/intro.css`; playback and once-per-tab behavior are in `assets/js/intro.js`. The `SEQUENCE_MS` and `EXIT_MS` constants control the automatic entry time and final curtain transition (currently 650ms). If these change, keep the CSS keyframe durations aligned. Skip, Enter, and Escape remain immediate exits.

The intro is a short visual opening rather than a download-progress indicator. It does not delay the page for asset-loading promises. Reduced-motion preferences bypass automatic playback; manually replaying with reduced motion shows a static introduction with working exit controls. Direct section links bypass the intro too. The `ap.portfolio.intro.v2` sessionStorage marker controls the current tab, and storage failures never prevent entry.

During review, use a new tab or the footer's **Replay intro** control. Preserve the modal dialog's accessible name, keyboard focus restoration, and page scroll cleanup. Without JavaScript the dialog stays closed and the portfolio remains available.

Adjust shared CSS variables first to change the visual theme consistently. Keep readable contrast, visible keyboard focus, and mobile spacing. The responsive layout and reduced-motion handling should remain intact when adding animations.

Use real links for navigation and buttons for interactions. Label interactive controls, keep heading order sensible, and ensure project dialogs can close with their close control and the Escape key. Test a keyboard-only pass after changing menus, dialogs, or controls.

### Smooth page transitions

`assets/js/transitions.js` runs in the head and enhances same-origin HTML links. `assets/css/transitions.css` supplies a 360ms departure and 600ms arrival curtain. Preserve both files and include them on new pages. Same-page section links, CV downloads, email links, external sites, and clicks that open a new tab use normal browser behavior. Reduced-motion preferences bypass the curtain.

Arrival uses a short-lived sessionStorage marker. Storage failures never block navigation. Browser Back/Forward clears the overlay; returning from gaming does not replay the opening. Keep CSS durations aligned with `DEPART_MS` and `ARRIVE_MS`. Test normal navigation, section links, keyboard navigation, and Back after changes.

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
