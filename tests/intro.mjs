/** Run with the preview server: node tests/intro.mjs
 * Requires Playwright. BASE_URL and CHROMIUM_EXECUTABLE are optional. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = (process.env.BASE_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);
const systemBrowser = await fs
  .access("/usr/bin/chromium")
  .then(() => "/usr/bin/chromium")
  .catch(() => undefined);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE || systemBrowser,
});
const failures = [];
const errors = [];
let passed = 0;
const artifacts = process.env.SCREENSHOT_DIR || path.resolve("..", "artifacts");
await fs.mkdir(artifacts, { recursive: true });

async function fresh(options = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
    ...options,
  });
  ctx.on("page", (page) =>
    page.on("pageerror", (error) => errors.push(error.message)),
  );
  const page = await ctx.newPage();
  return { ctx, page };
}
async function load(page, fragment = "") {
  await page.goto(`${base}/${fragment}`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
}
async function isOpen(page) {
  return page.locator("#site-intro").evaluate((el) => el.open);
}
async function isUnlocked(page) {
  return page.evaluate(() => !document.body.classList.contains("intro-open"));
}
async function check(name, action) {
  try {
    await action();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`FAIL: ${name}: ${error.message}`);
  }
}

try {
  await check(
    "First-visit intro opens, contains the name, and skips immediately at desktop and mobile widths",
    async () => {
      for (const width of [1440, 390, 320]) {
        const { ctx, page } = await fresh({
          viewport: { width, height: width > 760 ? 900 : 844 },
        });
        try {
          await load(page);
          assert.equal(await isOpen(page), true);
          assert.equal(await isUnlocked(page), false);
          assert.match(
            await page.locator("#intro-name").innerText(),
            /Andreas[\s\S]*Paraskeva/,
          );
          assert.equal(
            await page
              .locator(".intro-skip")
              .evaluate((el) => el === document.activeElement),
            true,
          );
          const layout = await page.evaluate(() => ({
            width: innerWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          assert.ok(layout.scroll <= layout.width + 1, `Overflow at ${width}`);
          if (width !== 320) {
            await page.waitForTimeout(1500);
            assert.equal(await isOpen(page), true);
            await page.screenshot({
              path: path.join(
                artifacts,
                `intro-red-${width > 760 ? "desktop" : "mobile"}.png`,
              ),
            });
          }
          await page.locator(".intro-skip").click();
          assert.equal(await isOpen(page), false);
          assert.equal(await isUnlocked(page), true);
          assert.equal(
            await page.evaluate(() =>
              sessionStorage.getItem("ap.portfolio.intro.v2"),
            ),
            "1",
          );
          assert.equal(
            await page
              .locator("#hero-title")
              .evaluate((el) => el === document.activeElement),
            true,
          );
        } finally {
          await ctx.close();
        }
      }
    },
  );
  await check(
    "Enter portfolio closes immediately and the footer replay supports Escape and focus restoration",
    async () => {
      const { ctx, page } = await fresh();
      try {
        await load(page);
        await page.locator(".intro-enter").click();
        assert.equal(await isOpen(page), false);
        const replay = page.locator("[data-replay-intro]");
        assert.equal(await replay.isVisible(), true);
        await replay.click();
        assert.equal(await isOpen(page), true);
        await page.keyboard.press("Escape");
        assert.equal(await isOpen(page), false);
        assert.equal(await isUnlocked(page), true);
        assert.equal(
          await replay.evaluate((el) => el === document.activeElement),
          true,
        );
      } finally {
        await ctx.close();
      }
    },
  );
  await check(
    "Timed intro enters automatically and does not repeat on reload in the same tab",
    async () => {
      const { ctx, page } = await fresh();
      try {
        await load(page);
        assert.equal(await isOpen(page), true);
        await page.waitForFunction(
          () => !document.getElementById("site-intro").open,
          undefined,
          { timeout: 7000 },
        );
        assert.equal(await isUnlocked(page), true);
        assert.equal(
          await page.evaluate(() =>
            sessionStorage.getItem("ap.portfolio.intro.v2"),
          ),
          "1",
        );
        await page.reload({ waitUntil: "domcontentloaded" });
        assert.equal(await isOpen(page), false);
        assert.equal(await page.locator("#hero-title").isVisible(), true);
      } finally {
        await ctx.close();
      }
    },
  );
  await check(
    "Reduced motion bypasses autoplay and manual replay has no animation",
    async () => {
      const { ctx, page } = await fresh({ reducedMotion: "reduce" });
      try {
        await load(page);
        assert.equal(await isOpen(page), false);
        await page.locator("[data-replay-intro]").click();
        assert.equal(await isOpen(page), true);
        assert.equal(
          await page
            .locator("#site-intro")
            .evaluate((el) => el.classList.contains("is-static")),
          true,
        );
        assert.equal(
          await page
            .locator(".intro-word")
            .first()
            .evaluate((el) => getComputedStyle(el).animationName),
          "none",
        );
        await page.locator(".intro-enter").click();
        assert.equal(await isUnlocked(page), true);
      } finally {
        await ctx.close();
      }
    },
  );
  await check("Direct section links bypass the opening", async () => {
    const { ctx, page } = await fresh();
    try {
      await load(page, "#contact");
      assert.equal(await isOpen(page), false);
      assert.equal(await isUnlocked(page), true);
      assert.equal(new URL(page.url()).hash, "#contact");
    } finally {
      await ctx.close();
    }
  });
  await check("Unavailable browser storage never prevents entry", async () => {
    const { ctx, page } = await fresh();
    try {
      await ctx.addInitScript(() => {
        Storage.prototype.getItem = () => {
          throw new Error("Storage disabled");
        };
        Storage.prototype.setItem = () => {
          throw new Error("Storage disabled");
        };
      });
      await load(page);
      assert.equal(await isOpen(page), true);
      await page.locator(".intro-skip").click();
      assert.equal(await isOpen(page), false);
      assert.equal(await isUnlocked(page), true);
    } finally {
      await ctx.close();
    }
  });
  await check(
    "Changing to reduced motion during playback immediately releases the page",
    async () => {
      const { ctx, page } = await fresh();
      try {
        await load(page);
        assert.equal(await isOpen(page), true);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.waitForFunction(
          () => !document.getElementById("site-intro").open,
        );
        assert.equal(await isUnlocked(page), true);
      } finally {
        await ctx.close();
      }
    },
  );
  await check(
    "Navigating away during playback and returning never restores a scroll lock",
    async () => {
      const { ctx, page } = await fresh();
      try {
        await load(page);
        assert.equal(await isOpen(page), true);
        await page.goto(`${base}/gaming/`, { waitUntil: "domcontentloaded" });
        await page.goBack({ waitUntil: "domcontentloaded" });
        assert.equal(await isOpen(page), false);
        assert.equal(await isUnlocked(page), true);
      } finally {
        await ctx.close();
      }
    },
  );
  await check("A missing artwork request does not block entry", async () => {
    const { ctx, page } = await fresh();
    try {
      await page.route("**/hero-art-red.webp", (route) => route.abort());
      await load(page);
      assert.equal(await isOpen(page), true);
      await page.locator(".intro-enter").click();
      assert.equal(await isOpen(page), false);
      assert.equal(await isUnlocked(page), true);
    } finally {
      await ctx.close();
    }
  });
  await check(
    "Without JavaScript the homepage and mobile navigation remain accessible",
    async () => {
      const { ctx, page } = await fresh({
        javaScriptEnabled: false,
        viewport: { width: 390, height: 844 },
      });
      try {
        await load(page);
        assert.equal(await page.locator("#site-intro").isVisible(), false);
        assert.equal(await page.locator("#hero-title").isVisible(), true);
        assert.equal(await page.locator("[data-nav]").isVisible(), true);
        assert.equal(
          await page.locator("[data-replay-intro]").isVisible(),
          false,
        );
      } finally {
        await ctx.close();
      }
    },
  );
  await check("No intro JavaScript exceptions", async () =>
    assert.deepEqual(errors, []),
  );
} finally {
  await browser.close();
}
console.log(`\n${passed} intro checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
