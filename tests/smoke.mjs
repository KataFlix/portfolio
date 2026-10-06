/** Run against a local preview: python3 -m http.server 8000 --bind 127.0.0.1
 * Then: node tests/smoke.mjs (requires Playwright and its Chromium browser).
 * Optional: BASE_URL=http://127.0.0.1:8001 SCREENSHOT_DIR=/tmp/site-shots
 * CHROMIUM_EXECUTABLE=/path/to/chromium can select a system browser.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error(
    "Playwright is required for browser tests. Install it and run npx playwright install chromium.",
  );
  process.exit(1);
}
const base = (process.env.BASE_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);
const screenshots =
  process.env.SCREENSHOT_DIR || path.resolve("..", "artifacts");
const systemChromium = await fs
  .access("/usr/bin/chromium")
  .then(() => "/usr/bin/chromium")
  .catch(() => undefined);
const executablePath = process.env.CHROMIUM_EXECUTABLE || systemChromium;
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
const failures = [];
const pageErrors = [];
const assetFailures = [];
const checks = [];
let journalBackup;

async function context(options = {}) {
  const ctx = await browser.newContext({ reducedMotion: "reduce", ...options });
  await ctx.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(base) ||
      url.startsWith("blob:") ||
      url.startsWith("data:")
      ? route.continue()
      : route.abort();
  });
  ctx.on("page", (page) => {
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("response", (response) => {
      if (response.url().startsWith(base) && response.status() >= 400)
        assetFailures.push(`${response.status()} ${response.url()}`);
    });
  });
  return ctx;
}

async function check(name, fn) {
  try {
    await fn();
    checks.push(name);
    console.log(`PASS: ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`FAIL: ${name}: ${error.message}`);
  }
}

async function goto(page, pathname = "/") {
  await page.goto(`${base}${pathname}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
}

async function addSession(
  page,
  {
    focus = "Map awareness",
    date = "2026-10-06",
    result = "win",
    notes = "Review the minimap before each play.",
    champion = "Evelynn",
  } = {},
) {
  await page.locator("#session-date").fill(date);
  await page.locator("#session-result").selectOption(result);
  await page.locator("#session-champion").fill(champion);
  await page.locator("#session-focus").fill(focus);
  await page.locator("#session-notes").fill(notes);
  await page.locator("#journal-save").click();
}

async function importBackup(page, snapshot) {
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.locator("#journal-import").click();
  const fileChooser = await fileChooserPromise;
  const buffer = Buffer.isBuffer(snapshot)
    ? snapshot
    : Buffer.from(
        typeof snapshot === "string" ? snapshot : JSON.stringify(snapshot),
      );
  await fileChooser.setFiles({
    name: "journal-backup.json",
    mimeType: "application/json",
    buffer,
  });
  await page.waitForFunction(
    () =>
      document.querySelector("#journal-import-file").value === "" &&
      !document.querySelector("#journal-import").disabled,
  );
  assert.ok(
    await page
      .locator("#journal-import")
      .evaluate((element) => element === document.activeElement),
  );
}

try {
  const ctx = await context();
  const page = await ctx.newPage();

  await check(
    "Responsive portfolio and gaming at 320, 390, 768, and 1440px",
    async () => {
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const pathname of ["/", "/gaming/"]) {
          await goto(page, pathname);
          const dimensions = await page.evaluate(() => ({
            width: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          assert.ok(
            dimensions.scroll <= dimensions.width + 1,
            `${pathname} overflows at ${width}px: ${JSON.stringify(dimensions)}`,
          );
          assert.ok(await page.locator("h1").isVisible());
        }
      }
    },
  );

  await check(
    "Mobile menu opens, closes with Escape, returns focus, and closes on navigation",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await goto(page);
      const menu = page.locator("[data-menu-toggle]");
      await menu.click();
      assert.equal(await menu.getAttribute("aria-expanded"), "true");
      assert.ok(await page.locator("[data-nav]").isVisible());
      await page.keyboard.press("Escape");
      assert.equal(await menu.getAttribute("aria-expanded"), "false");
      assert.ok(
        await menu.evaluate((element) => element === document.activeElement),
      );
      await menu.click();
      await page.locator('[data-nav] a[href="#work"]').click();
      assert.equal(await menu.getAttribute("aria-expanded"), "false");
      assert.equal(new URL(page.url()).hash, "#work");
    },
  );

  await check(
    "Project dialogs show correct links, close with Escape/button, and restore focus",
    async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await goto(page);
      const better = page.locator('[data-project="better-schools"]').first();
      await better.click();
      assert.ok(
        await page.locator("#project-dialog").evaluate((dialog) => dialog.open),
      );
      assert.equal(
        await page.locator("#dialog-title").textContent(),
        "Better Schools",
      );
      assert.equal(
        await page.locator("#dialog-link").getAttribute("href"),
        "https://betterschools.eu",
      );
      assert.equal(
        await page.locator("#dialog-link").getAttribute("target"),
        "_blank",
      );
      assert.match(
        await page.locator("#dialog-link").getAttribute("rel"),
        /noopener/,
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator("#project-dialog").evaluate((dialog) => dialog.open),
        false,
      );
      assert.ok(
        await better.evaluate((element) => element === document.activeElement),
      );
      const v2go = page.locator('[data-project="v2go"]').first();
      await v2go.click();
      assert.equal(await page.locator("#dialog-title").textContent(), "V2Go");
      assert.match(
        await page.locator("#dialog-link").getAttribute("href"),
        /^mailto:/,
      );
      assert.equal(
        await page.locator("#dialog-link").getAttribute("target"),
        null,
      );
      assert.equal(
        await page.locator("#dialog-link").getAttribute("rel"),
        null,
      );
      await page.locator(".dialog-close").click();
      assert.ok(
        await v2go.evaluate((element) => element === document.activeElement),
      );
    },
  );

  await check(
    "CV download is served as a PDF and contact links use mailto",
    async () => {
      const response = await ctx.request.get(
        `${base}/assets/docs/Andreas-Paraskeva-CV.pdf`,
      );
      assert.equal(response.status(), 200);
      assert.equal((await response.body()).subarray(0, 5).toString(), "%PDF-");
      assert.ok(
        (await page
          .locator('a[href="mailto:andreas.paraskeva2711@hotmail.com"]')
          .count()) >= 2,
      );
    },
  );

  await check(
    "Both gaming account switches preserve safe OP.GG links",
    async () => {
      await goto(page, "/gaming/");
      for (const [key, name] of [
        ["evelynnflix", "EvelynnFlix"],
        ["kataflix", "KataFlix"],
      ]) {
        await page.locator(`[data-account="${key}"]`).click();
        assert.equal(
          await page.locator("#account-name").textContent(),
          `${name}#EUNE`,
        );
        assert.equal(
          await page.locator("#account-profile-link").getAttribute("href"),
          `https://op.gg/lol/summoners/eune/${name}-EUNE`,
        );
        assert.equal(
          await page
            .locator(`[data-account="${key}"]`)
            .getAttribute("aria-pressed"),
          "true",
        );
        assert.equal(
          await page.locator("#account-profile-link").getAttribute("target"),
          "_blank",
        );
        assert.match(
          await page.locator("#account-profile-link").getAttribute("rel"),
          /noopener/,
        );
      }
    },
  );

  await check("Journal rejects empty focus and invalid dates", async () => {
    await page.locator("#journal-save").click();
    assert.match(
      await page.locator("#journal-form-error").textContent(),
      /practice focus/,
    );
    assert.equal(
      await page.locator("#session-focus").getAttribute("aria-invalid"),
      "true",
    );
    await page.locator("#session-focus").fill("Map awareness");
    await page.locator("#session-date").fill("");
    await page.locator("#journal-save").click();
    assert.match(
      await page.locator("#journal-form-error").textContent(),
      /valid session date/,
    );
    assert.equal(await page.locator("#journal-count").textContent(), "00");
  });

  await check(
    "Journal stores safe text, persists, computes metrics, and exports JSON",
    async () => {
      const payload = '<img src=x onerror="window.journalXSS=true">';
      await addSession(page, {
        focus: payload,
        notes: "<script>window.journalXSS=true</script>",
      });
      assert.equal(await page.locator("#journal-count").textContent(), "01");
      assert.equal(await page.locator("#journal-wins").textContent(), "01");
      assert.equal(
        await page.locator("#journal-entries h4").textContent(),
        payload,
      );
      assert.equal(
        await page
          .locator("#journal-entries img, #journal-entries script")
          .count(),
        0,
      );
      assert.equal(await page.evaluate(() => window.journalXSS), undefined);
      await addSession(page, {
        date: "2026-10-05",
        result: "loss",
        focus: "Wave control",
      });
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await page.locator("#journal-count").textContent(), "02");
      assert.equal(await page.locator("#journal-wins").textContent(), "01");
      assert.equal(
        await page.locator("#journal-last").textContent(),
        "6 Oct 2026",
      );
      assert.equal(
        await page.locator("#journal-entries h4").first().textContent(),
        payload,
      );
      const downloadPromise = page.waitForEvent("download");
      await page.locator("#journal-export").click();
      const download = await downloadPromise;
      assert.match(
        download.suggestedFilename(),
        /^andreas-gaming-journal-\d{4}-\d{2}-\d{2}\.json$/,
      );
      const file = await download.path();
      const exported = JSON.parse(await fs.readFile(file, "utf8"));
      journalBackup = exported;
      assert.equal(exported.version, 1);
      assert.equal(exported.site, "antreasparaskeva.com");
      assert.equal(exported.entries.length, 2);
      assert.equal(exported.entries[1].focus, payload);
    },
  );

  await check(
    "Journal deletion and clear dialog cancel/confirm update saved state",
    async () => {
      await page.locator(".journal-entry-delete").last().click();
      assert.equal(await page.locator("#journal-count").textContent(), "01");
      await page.locator("#journal-clear").click();
      assert.ok(
        await page
          .locator("#journal-clear-dialog")
          .evaluate((dialog) => dialog.open),
      );
      assert.ok(
        await page
          .locator("#journal-clear-cancel")
          .evaluate((element) => element === document.activeElement),
      );
      await page.locator("#journal-clear-cancel").click();
      assert.equal(await page.locator("#journal-count").textContent(), "01");
      assert.ok(
        await page
          .locator("#journal-clear")
          .evaluate((element) => element === document.activeElement),
      );
      await page.locator("#journal-clear").click();
      await page.locator("#journal-clear-confirm").click();
      assert.equal(await page.locator("#journal-count").textContent(), "00");
      assert.ok(await page.locator("#journal-empty").isVisible());
      assert.ok(await page.locator("#journal-export").isDisabled());
      assert.equal(
        await page.evaluate(() => localStorage.getItem("ap.gaming.journal.v1")),
        null,
      );
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await page.locator("#journal-count").textContent(), "00");
    },
  );

  await check(
    "Journal backup roundtrip restores safe text and ignores duplicate imports",
    async () => {
      assert.ok(journalBackup, "Export check must produce a backup first");
      await importBackup(page, journalBackup);
      assert.equal(await page.locator("#journal-count").textContent(), "02");
      assert.equal(await page.locator("#journal-wins").textContent(), "01");
      assert.match(
        await page.locator("#journal-status").textContent(),
        /2 sessions imported/,
      );
      assert.equal(
        await page.locator("#journal-entries h4").first().textContent(),
        journalBackup.entries[1].focus,
      );
      assert.equal(
        await page
          .locator("#journal-entries img, #journal-entries script")
          .count(),
        0,
      );
      assert.equal(await page.evaluate(() => window.journalXSS), undefined);
      await importBackup(page, journalBackup);
      assert.equal(await page.locator("#journal-count").textContent(), "02");
      assert.match(
        await page.locator("#journal-status").textContent(),
        /No new sessions/,
      );
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await page.locator("#journal-count").textContent(), "02");
    },
  );

  await check(
    "Invalid, conflicting, oversized, and excessive imports preserve existing notes",
    async () => {
      const original = await page.evaluate(() =>
        localStorage.getItem("ap.gaming.journal.v1"),
      );
      const validNew = {
        ...journalBackup.entries[0],
        id: "new-imported-session",
        focus: "New practice",
      };
      const rejected = [
        "{invalid json",
        { version: 2, entries: [validNew] },
        {
          version: 1,
          entries: [
            validNew,
            { ...validNew, id: "invalid-date", date: "2026-02-30" },
          ],
        },
        {
          version: 1,
          entries: [
            validNew,
            { ...journalBackup.entries[0], focus: "Conflicting edit" },
          ],
        },
        {
          version: 1,
          entries: Array.from({ length: 201 }, (_, i) => ({
            ...validNew,
            id: `too-many-${i}`,
          })),
        },
        {
          version: 1,
          entries: Array.from({ length: 199 }, (_, i) => ({
            ...validNew,
            id: `merge-limit-${i}`,
          })),
        },
        Buffer.alloc(1024 * 1024 + 1, " "),
      ];
      for (const snapshot of rejected) {
        await importBackup(page, snapshot);
        assert.equal(await page.locator("#journal-count").textContent(), "02");
        assert.match(
          await page.locator("#journal-status").textContent(),
          /Backup not imported/,
        );
        assert.match(
          await page.locator("#journal-status").getAttribute("class"),
          /is-error/,
        );
        assert.equal(
          await page.evaluate(() =>
            localStorage.getItem("ap.gaming.journal.v1"),
          ),
          original,
        );
      }
    },
  );

  await check(
    "Denied browser storage still permits in-memory notes and JSON export",
    async () => {
      const denied = await context();
      await denied.addInitScript(() => {
        for (const method of ["getItem", "setItem", "removeItem"]) {
          Storage.prototype[method] = () => {
            throw new DOMException("Disabled for this test", "SecurityError");
          };
        }
      });
      const p = await denied.newPage();
      await goto(p, "/gaming/");
      assert.ok(await p.locator("#journal-storage-warning").isVisible());
      await addSession(p);
      assert.equal(await p.locator("#journal-count").textContent(), "01");
      assert.match(
        await p.locator("#journal-status").textContent(),
        /this visit/,
      );
      const downloadPromise = p.waitForEvent("download");
      await p.locator("#journal-export").click();
      const downloaded = await downloadPromise;
      assert.equal(
        JSON.parse(await fs.readFile(await downloaded.path(), "utf8")).entries
          .length,
        1,
      );
      await p.reload({ waitUntil: "networkidle" });
      assert.equal(await p.locator("#journal-count").textContent(), "00");
      await denied.close();
    },
  );

  await check(
    "Corrupted stored journal is preserved while visit-only notes work",
    async () => {
      const corrupt = await context();
      await corrupt.addInitScript(() => {
        if (/^https?:$/.test(location.protocol))
          localStorage.setItem("ap.gaming.journal.v1", "{broken json");
      });
      const p = await corrupt.newPage();
      await goto(p, "/gaming/");
      assert.ok(await p.locator("#journal-storage-warning").isVisible());
      await addSession(p);
      assert.equal(await p.locator("#journal-count").textContent(), "01");
      assert.equal(
        await p.evaluate(() => localStorage.getItem("ap.gaming.journal.v1")),
        "{broken json",
      );
      await corrupt.close();
    },
  );

  await check("Journal enforces the documented 200-entry limit", async () => {
    const full = await context();
    await full.addInitScript(() => {
      if (/^https?:$/.test(location.protocol))
        localStorage.setItem(
          "ap.gaming.journal.v1",
          JSON.stringify({
            version: 1,
            entries: Array.from({ length: 200 }, (_, i) => ({
              id: String(i),
              date: "2026-10-06",
              result: "unrecorded",
              champion: "",
              focus: `Session ${i}`,
              notes: "",
            })),
          }),
        );
    });
    const p = await full.newPage();
    await goto(p, "/gaming/");
    await addSession(p);
    assert.equal(await p.locator("#journal-count").textContent(), "200");
    assert.match(
      await p.locator("#journal-form-error").textContent(),
      /200 sessions/,
    );
    await full.close();
  });

  await check(
    "Portfolio and OP.GG links remain usable with JavaScript disabled",
    async () => {
      const noJS = await context({
        javaScriptEnabled: false,
        viewport: { width: 390, height: 844 },
      });
      const p = await noJS.newPage();
      await p.goto(`${base}/`, { waitUntil: "networkidle" });
      assert.ok(await p.locator("h1").isVisible());
      assert.ok(await p.locator("#about").isVisible());
      assert.ok(
        await p
          .getByRole("link", { name: "Enter the gaming corner" })
          .isVisible(),
      );
      await p.goto(`${base}/gaming/`, { waitUntil: "networkidle" });
      for (const account of ["KataFlix", "EvelynnFlix"])
        assert.ok(
          await p
            .locator(
              `a[href="https://op.gg/lol/summoners/eune/${account}-EUNE"]`,
            )
            .first()
            .isVisible(),
        );
      assert.ok(await p.locator("#journal-save").isDisabled());
      assert.ok(await p.locator("#journal-import").isDisabled());
      await noJS.close();
    },
  );

  await check("Capture desktop and mobile portfolio screenshots", async () => {
    await fs.mkdir(screenshots, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await goto(page);
    await page.screenshot({
      path: path.join(screenshots, "portfolio-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await goto(page);
    await page.screenshot({
      path: path.join(screenshots, "portfolio-mobile.png"),
      fullPage: true,
    });
  });

  await ctx.close();
  await check(
    "No browser JavaScript exceptions or local HTTP errors",
    async () => {
      assert.deepEqual(pageErrors, []);
      assert.deepEqual(assetFailures, []);
    },
  );
} finally {
  await browser.close();
}
console.log(
  `\n${checks.length} browser checks passed; ${failures.length} failed.`,
);
if (failures.length) process.exitCode = 1;
