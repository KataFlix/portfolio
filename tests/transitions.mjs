/** Local browser regression checks for navigation and larger text.
 * Run with the preview server: node tests/transitions.mjs */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = (process.env.BASE_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
});
let passed = 0;
const failures = [],
  errors = [];
async function fresh(options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
    ...options,
  });
  context.on("page", (page) =>
    page.on("pageerror", (error) => errors.push(error.message)),
  );
  const page = await context.newPage();
  return { context, page };
}
async function check(name, task) {
  try {
    await task();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`FAIL: ${name}: ${error.message}`);
  }
}
async function settled(page) {
  await page.waitForFunction(
    () =>
      !document.querySelector(
        ".page-curtain.is-entering, .page-curtain.is-leaving",
      ) && !document.documentElement.classList.contains("page-arriving"),
  );
}
async function clickTo(page, selector, target) {
  await Promise.all([
    page.waitForURL(`${base}${target}`),
    page.locator(selector).first().click(),
  ]);
  await settled(page);
}
try {
  await check(
    "Portfolio → gaming → portfolio uses departure and arrival curtains",
    async () => {
      const { context, page } = await fresh();
      try {
        await page.goto(`${base}/#main`);
        await page.locator('.header-nav a[href="gaming/"]').click();
        assert.ok(
          await page
            .locator(".page-curtain")
            .evaluate((el) => el.classList.contains("is-leaving")),
        );
        await page.waitForURL(`${base}/gaming/`);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.dataset.pageArrival,
          ),
          "true",
        );
        await settled(page);
        await clickTo(page, ".gaming-back", "/index.html");
        assert.equal(
          await page.locator("#site-intro").evaluate((el) => el.open),
          false,
        );
        assert.equal(
          await page.evaluate(() =>
            sessionStorage.getItem("ap.portfolio.intro.v2"),
          ),
          "1",
        );
        await page.reload();
        assert.equal(
          await page.locator("#site-intro").evaluate((el) => el.open),
          false,
        );
      } finally {
        await context.close();
      }
    },
  );
  await check(
    "A first visit to gaming can enter the portfolio without an extra intro",
    async () => {
      const { context, page } = await fresh();
      try {
        await page.goto(`${base}/gaming/`);
        await clickTo(page, ".gaming-back", "/index.html");
        assert.equal(
          await page.locator("#site-intro").evaluate((el) => el.open),
          false,
        );
        assert.equal(
          await page.evaluate(() =>
            document.body.classList.contains("intro-open"),
          ),
          false,
        );
      } finally {
        await context.close();
      }
    },
  );
  await check(
    "Contact deep links keep their fragment and bypass the intro",
    async () => {
      const { context, page } = await fresh();
      try {
        await page.goto(`${base}/gaming/`);
        await clickTo(page, ".nav-link--contact", "/index.html#contact");
        assert.equal(
          await page.locator("#site-intro").evaluate((el) => el.open),
          false,
        );
        await page.waitForFunction(() => window.scrollY > 100);
        assert.ok(await page.locator("#contact").isVisible());
      } finally {
        await context.close();
      }
    },
  );
  await check(
    "Back and Forward leave both pages visible and scrollable",
    async () => {
      const { context, page } = await fresh();
      try {
        await page.goto(`${base}/#main`);
        await clickTo(page, '.header-nav a[href="gaming/"]', "/gaming/");
        await page.goBack();
        await settled(page);
        assert.equal(
          await page.locator("#site-intro").evaluate((el) => el.open),
          false,
        );
        assert.equal(
          await page.evaluate(
            () =>
              document.body.classList.contains("intro-open") ||
              document.body.classList.contains("menu-open"),
          ),
          false,
        );
        await page.goForward();
        await settled(page);
        assert.ok(await page.locator("#gaming-title").isVisible());
      } finally {
        await context.close();
      }
    },
  );
  await check(
    "Mobile keyboard navigation closes the menu and transitions",
    async () => {
      const { context, page } = await fresh({
        viewport: { width: 390, height: 844 },
      });
      try {
        await page.goto(`${base}/#main`);
        await page.locator("[data-menu-toggle]").click();
        await page.locator('.header-nav a[href="gaming/"]').focus();
        await Promise.all([
          page.waitForURL(`${base}/gaming/`),
          page.keyboard.press("Enter"),
        ]);
        await settled(page);
        assert.equal(
          await page
            .locator("[data-menu-toggle]")
            .getAttribute("aria-expanded"),
          "false",
        );
        assert.equal(
          await page.evaluate(() =>
            document.body.classList.contains("menu-open"),
          ),
          false,
        );
      } finally {
        await context.close();
      }
    },
  );
  await check(
    "Section links, downloads, external links, and modified clicks keep browser behavior",
    async () => {
      const { context, page } = await fresh();
      try {
        await page.goto(`${base}/#main`);
        for (const [selector, options] of [
          ['.header-nav a[href="#work"]', {}],
          [".hero-actions a[download]", {}],
          ['.contact-copy a[href^="mailto:"]', {}],
          ['.footer-links a[target="_blank"]', {}],
          ['.header-nav a[href="gaming/"]', { ctrlKey: true }],
          ['.header-nav a[href="gaming/"]', { button: 1 }],
        ]) {
          const intercepted = await page.evaluate(
            ({ selector, options }) => {
              let intercepted;
              const observer = (event) => {
                intercepted = event.defaultPrevented;
                event.preventDefault();
              };
              window.addEventListener("click", observer, { once: true });
              document
                .querySelector(selector)
                .dispatchEvent(
                  new MouseEvent("click", {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    ...options,
                  }),
                );
              return intercepted;
            },
            { selector, options },
          );
          assert.equal(intercepted, false, selector);
          assert.equal(
            await page.locator(".page-curtain.is-leaving").count(),
            0,
          );
        }
        await page.locator('.header-nav a[href="#work"]').click();
        assert.equal(new URL(page.url()).hash, "#work");
      } finally {
        await context.close();
      }
    },
  );
  await check(
    "Reduced motion and denied storage never block page navigation",
    async () => {
      for (const mode of ["reduced", "storage-denied"]) {
        const { context, page } = await fresh({
          reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
        });
        try {
          if (mode === "storage-denied")
            await context.addInitScript(() => {
              Object.defineProperty(window, "sessionStorage", {
                get() {
                  throw new Error("Storage denied");
                },
              });
            });
          await page.goto(`${base}/#main`);
          await clickTo(page, '.header-nav a[href="gaming/"]', "/gaming/");
          assert.ok(await page.locator("#gaming-title").isVisible());
        } finally {
          await context.close();
        }
      }
    },
  );
  await check(
    "Escape cancels a pending departure without trapping the page",
    async () => {
      const { context, page } = await fresh();
      try {
        await page.goto(`${base}/gaming/`);
        await page.evaluate(() => {
          document.querySelector(".gaming-back").click();
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
          );
        });
        await page.waitForTimeout(450);
        assert.equal(page.url(), `${base}/gaming/`);
        await settled(page);
        assert.equal(
          await page.evaluate(() => sessionStorage.getItem("ap.navigation.v1")),
          null,
        );
      } finally {
        await context.close();
      }
    },
  );
  await check(
    "Changing to reduced motion mid-departure still completes the requested navigation",
    async () => {
      const { context, page } = await fresh();
      try {
        await page.goto(`${base}/gaming/`);
        await page.locator(".gaming-back").click();
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.waitForURL(`${base}/index.html`);
        await settled(page);
        assert.equal(
          await page.locator("#site-intro").evaluate((el) => el.open),
          false,
        );
      } finally {
        await context.close();
      }
    },
  );
  await check(
    "Larger text remains readable and the removed journal never accesses old notes",
    async () => {
      const { context, page } = await fresh({ reducedMotion: "reduce" });
      try {
        await context.addInitScript(() => {
          const original = Storage.prototype.getItem;
          Storage.prototype.getItem = function (key) {
            if (key === "ap.gaming.journal.v1")
              throw new Error("Removed journal accessed");
            return original.call(this, key);
          };
        });
        for (const width of [320, 390, 640, 1024, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          for (const route of ["/", "/gaming/", "/404.html"]) {
            await page.goto(`${base}${route}`);
            const result = await page.evaluate(() => {
              const labels = [
                ...document.querySelectorAll(
                  "p, a, button, .eyebrow, .mono, .console-label, .tags span",
                ),
              ].filter(
                (el) => el.getClientRects().length && el.textContent.trim(),
              );
              return {
                min: Math.min(
                  ...labels.map((el) =>
                    parseFloat(getComputedStyle(el).fontSize),
                  ),
                ),
                width: document.documentElement.clientWidth,
                scroll: document.documentElement.scrollWidth,
              };
            });
            assert.ok(
              result.min >= 13,
              `${route}: small text at ${width}px: ${result.min}`,
            );
            assert.ok(
              result.scroll <= result.width + 1,
              `${route}: overflow at ${width}px`,
            );
            assert.equal(
              await page
                .locator('[id^="journal"], [id^="session"], .gaming-journal')
                .count(),
              0,
            );
          }
        }
        await page.goto(`${base}/gaming/`);
        await page.locator('[data-account="evelynnflix"]').click();
        assert.equal(
          await page.locator("#account-region").textContent(),
          "SUMMONER / EUW",
        );
        await page.locator('[data-account="kataflix"]').click();
        assert.equal(
          await page.locator("#account-region").textContent(),
          "SUMMONER / EUNE",
        );
      } finally {
        await context.close();
      }
    },
  );
  await check(
    "Intro controls stay inside a short landscape viewport",
    async () => {
      const { context, page } = await fresh({
        viewport: { width: 844, height: 390 },
        reducedMotion: "reduce",
      });
      try {
        await page.goto(`${base}/`);
        await page.locator("[data-replay-intro]").click();
        for (const selector of [
          ".intro-skip",
          ".intro-enter",
          ".intro-caption",
          "#intro-name",
        ]) {
          const box = await page.locator(selector).boundingBox();
          assert.ok(box && box.y >= 0 && box.y + box.height <= 391, selector);
        }
        await page.locator(".intro-skip").click();
      } finally {
        await context.close();
      }
    },
  );
  await check("No navigation JavaScript exceptions", async () =>
    assert.deepEqual(errors, []),
  );
} finally {
  await browser.close();
}
console.log(
  `\n${passed} navigation and readability checks passed; ${failures.length} failed.`,
);
if (failures.length) process.exitCode = 1;
