# Andreas Paraskeva · Portfolio

A personal portfolio for **antreasparaskeva.com**, with a crimson electronic visual style, a cinematic animated-name introduction, and a separate League of Legends hobby page at `/gaming/`.

The site uses plain HTML, CSS, and JavaScript. It works on static or PHP shared hosting without a build step, database, Python runtime, or package installation on the server. Fonts, illustrations, and the downloadable CV are served locally.

## Preview locally

From the repository root, run:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/` and `http://127.0.0.1:8000/gaming/`. Use a local server so navigation behaves as it will on the website.

## Publish and maintain

- [Deploy with FileZilla](docs/DEPLOYMENT.md): package the site, upload it, and verify the live pages.
- [Edit the content and design](docs/EDITING.md): update the career timeline, projects, gaming accounts, and appearance.

Create the upload package with:

```bash
python3 scripts/package_site.py
```

The default output is `/workspace/artifacts/antreasparaskeva-portfolio.zip`. The ZIP contains `site/` and `UPLOAD-GUIDE/`. Upload the **contents of `site/`** to the domain's document root, usually `public_html/`; keep `UPLOAD-GUIDE/` on your computer.

## Source map

| Path                                   | Purpose                                                  |
| -------------------------------------- | -------------------------------------------------------- |
| `index.html`                           | Portfolio, biography, career timeline, and contact links |
| `gaming/index.html`                    | Gaming page and account links                            |
| `assets/css/styles.css`                | Shared design, portfolio layout, and responsive styles   |
| `assets/css/gaming.css`                | Gaming page styles                                       |
| `assets/css/intro.css`                 | Cinematic opening and image-reveal animation              |
| `assets/js/main.js`                    | Portfolio interactions and project dialog content        |
| `assets/js/gaming.js`                  | Gaming interactions and local progress journal           |
| `assets/js/intro.js`                   | Intro playback, skip, replay, and accessibility           |
| `assets/docs/Andreas-Paraskeva-CV.pdf` | Original CV supplied for this project                    |
| `assets/fonts/`                        | Local fonts and their license files                      |
| `assets/images/`                       | Original visual assets                                   |
| `tests/`                               | Source-only checks; not included in the upload           |

## Data and content

The opening plays once per browser tab and reveals the name and original red artwork before entering the portfolio. **Skip intro**, **Enter portfolio**, and Escape close it immediately. **Replay intro** in the footer shows it again. Reduced-motion preferences and direct links to sections bypass automatic playback; without JavaScript the portfolio opens normally.

The gaming journal saves to browser `localStorage`. Entries stay in that browser on that device; they do not sync and can be lost if browser data is cleared. Export and import JSON backups to keep or transfer your entries. OP.GG links open the account pages for current match history and ranks; the website does not fetch live statistics.

The career timeline includes the Systems Engineer role at IBSCYLTD from **Oct 2026**. The downloadable PDF remains the original supplied CV and predates that addition. It includes the contact details in the supplied document; replace it with a redacted PDF if you want different public contact information.

Project illustrations are conceptual visuals, not screenshots of delivered client systems. Contact links open the visitor's email application. There is no server-side contact form or analytics integration.

## Checks

The source includes `tests/check_site.py` for local file/link checks and `tests/smoke.mjs` for browser checks. Browser checks require Playwright in the development environment. Neither test tooling nor Python is required on the hosting server.

Run the static check from the repository root:

```bash
python3 tests/check_site.py
```

With the preview server running and Playwright available, run:

```bash
node tests/smoke.mjs
node tests/intro.mjs
```

The browser test uses an installed Chromium when available, or Playwright's browser. See the script for optional settings. Test results apply to the environment where they run; verify the live domain after uploading, too.
