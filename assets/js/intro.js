/* A short visual introduction, rather than a loading screen.
   Plays once per tab. Deep links and reduced-motion preferences bypass it.
   No data leaves the browser. Editing timings changes only this sequence. */
(() => {
  "use strict";
  const dialog = document.getElementById("site-intro");
  if (!dialog || typeof dialog.showModal !== "function") return;
  const SEEN_KEY = "ap.portfolio.intro.v1";
  const SEQUENCE_MS = 3900;
  const EXIT_MS = 700;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const replayButtons = [...document.querySelectorAll("[data-replay-intro]")];
  const skipButtons = [...dialog.querySelectorAll("[data-intro-skip]")];
  let autoTimer;
  let exitTimer;
  let lastTrigger = null;
  let finishing = false;

  function wasSeen() {
    try {
      return sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      return false;
    }
  }
  function markSeen() {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* A disabled storage policy must not prevent entry. */
    }
  }
  function closeIntro() {
    clearTimeout(autoTimer);
    clearTimeout(exitTimer);
    // Release scrolling synchronously; the native close event is queued.
    document.body.classList.remove("intro-open");
    if (dialog.open) dialog.close();
  }
  function finish(immediate = false) {
    if (!dialog.open || finishing) return;
    finishing = true;
    clearTimeout(autoTimer);
    markSeen();
    if (immediate || reducedMotion.matches) {
      closeIntro();
      return;
    }
    dialog.classList.add("is-leaving");
    exitTimer = window.setTimeout(closeIntro, EXIT_MS);
  }
  function start(trigger = null) {
    if (dialog.open) return;
    lastTrigger = trigger;
    finishing = false;
    dialog.classList.remove("is-playing", "is-leaving", "is-static");
    document.body.classList.add("intro-open");
    try {
      dialog.showModal();
    } catch {
      document.body.classList.remove("intro-open");
      return;
    }
    // Reset CSS animations before a replay without rebuilding the DOM.
    void dialog.offsetWidth;
    dialog.classList.add(reducedMotion.matches ? "is-static" : "is-playing");
    skipButtons[0].focus({ preventScroll: true });
    if (!reducedMotion.matches)
      autoTimer = window.setTimeout(() => finish(), SEQUENCE_MS);
  }
  skipButtons.forEach((button) =>
    button.addEventListener("click", () => finish(true)),
  );
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    finish(true);
  });
  dialog.addEventListener("close", () => {
    clearTimeout(autoTimer);
    clearTimeout(exitTimer);
    document.body.classList.remove("intro-open");
    dialog.classList.remove("is-playing", "is-leaving", "is-static");
    finishing = false;
    (lastTrigger || document.getElementById("hero-title"))?.focus({
      preventScroll: true,
    });
  });
  reducedMotion.addEventListener("change", (event) => {
    if (event.matches && dialog.open) finish(true);
  });
  // Leaving the page mid-intro must not restore a scroll lock through bfcache.
  window.addEventListener("pagehide", () => {
    if (dialog.open) {
      markSeen();
      closeIntro();
    }
  });
  replayButtons.forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", () => start(button));
  });
  if (!reducedMotion.matches && !window.location.hash && !wasSeen()) start();
})();
