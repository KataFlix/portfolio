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
      for (const [key, name, region] of [
        ["evelynnflix", "EvelynnFlix", "EUW"],
        ["kataflix", "KataFlix", "EUNE"],
      ]) {
        await page.locator(`[data-account="${key}"]`).click();
        assert.equal(
          await page.locator("#account-name").textContent(),
          `${name}#${region}`,
        );
        assert.equal(
          await page.locator("#account-profile-link").getAttribute("href"),
          `https://op.gg/lol/summoners/${region.toLowerCase()}/${name}-${region}`,
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
      for (const [account, region] of [
        ["KataFlix", "EUNE"],
        ["EvelynnFlix", "EUW"],
      ])
        assert.ok(
          await p
            .locator(
              `a[href="https://op.gg/lol/summoners/${region.toLowerCase()}/${account}-${region}"]`,
            )
            .first()
            .isVisible(),
        );
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
