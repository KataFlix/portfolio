# Publish on antreasparaskeva.com

This is a static website. Shared hosting that serves HTML, CSS, JavaScript, images, fonts, and PDF files is sufficient. PHP or Python support is not required. Your domain must already point to the hosting account.

## 1. Create and extract the upload ZIP

If you received the prepared ZIP, extract it and continue with step 2. To rebuild it from the full development repository, run:

```bash
python3 scripts/package_site.py
```

The default file is `/workspace/artifacts/antreasparaskeva-portfolio.zip`. To choose another destination:

```bash
python3 scripts/package_site.py --output /tmp/antreasparaskeva-portfolio.zip
```

Extract the ZIP on your computer. It contains:

```text
site/
  index.html
  404.html
  robots.txt
  sitemap.xml
  assets/
  gaming/
UPLOAD-GUIDE/
  README.md
  DEPLOYMENT.md
  EDITING.md
```

Only `site/` contains files to publish. The package excludes Git history, development tools, tests, caches, and private configuration.

## 2. Upload using FileZilla

1. Connect using the SFTP or FTPS settings provided by your hosting company. Obtain connection details from the host; they are not part of this project.
2. Find the document root assigned to **antreasparaskeva.com**, commonly `public_html/`, `www/`, or `httpdocs/`. For an addon domain, use its assigned folder.
3. Download a backup of the existing website before replacing its files. Keep unrelated hosting files unless you know they belong to the old site.
4. Upload **everything inside `site/`** into that document root. Do not upload the enclosing `site` directory or `UPLOAD-GUIDE`.
5. If this deliberately replaces an existing website, replace the matching site files. An old `index.php` can take precedence over `index.html`; after backing it up, rename or remove the old entry file if it prevents the new homepage from opening.

The resulting server layout should be:

```text
public_html/
  index.html
  404.html
  robots.txt
  sitemap.xml
  assets/
  gaming/
    index.html
```

Paths assume publication at the root of `antreasparaskeva.com`. `/gaming/` is a page on the same domain. Hosting the whole website in a nested folder requires corresponding path and canonical URL changes.

## 3. Enable HTTPS through the host

Use the hosting control panel to activate the domain's SSL certificate and, when available, HTTPS redirects. Certificate availability and redirect controls depend on the host. Do not add a guessed server configuration that conflicts with existing hosting rules.

The supplied `404.html` is an error page. If you want it served automatically for missing URLs, set the hosting panel's custom 404 page to `/404.html`. On Apache hosts that support `.htaccess`, `ErrorDocument 404 /404.html` is the usual setting; merge it carefully into existing configuration. The upload package does not assume a particular web server.

## 4. Check the live website

After uploading, open these URLs in a fresh browser tab:

- `https://antreasparaskeva.com/`
- `https://antreasparaskeva.com/gaming/`
- `https://antreasparaskeva.com/assets/docs/Andreas-Paraskeva-CV.pdf`

Check desktop and mobile layouts, menu and keyboard navigation, project dialogs, the CV download, contact links, both OP.GG account links, and adding/removing a journal entry. Reload the gaming page to check persistence in that browser.

The latest package includes the red theme and animated introduction. Replace the supplied HTML, CSS, JavaScript, and image files together. The updated asset URLs include a version query to prevent old cached styles or scripts from interfering. Open the homepage in a new tab to see the opening, or use **Replay intro** in the footer. Skip, Enter, and Escape should immediately reveal the portfolio; reduced-motion settings skip automatic playback.

Confirm that images and fonts load, and that the browser console reports no missing files. If old files appear, hard-refresh the page or clear the host/CDN cache. Linux hosting is case-sensitive: preserve every filename exactly.

The site has no deployment service, remote upload script, or stored hosting credentials. Creating the ZIP prepares the files; FileZilla upload is the publication step.

## Updating later

Read [EDITING.md](EDITING.md), preview changes locally, and create a fresh ZIP. Back up the live files before each deliberate replacement. Re-upload the changed files or the package contents, then repeat the relevant live checks. Preserve the `assets/fonts/` license files when publishing.

Journal data belongs to each visitor's browser. Uploading a new version does not centrally edit or back up those entries. Changes to journal storage keys or data format should include a compatible migration.
