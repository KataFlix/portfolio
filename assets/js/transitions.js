/* Run in the head to prepare incoming navigation before the first paint.
   All links still work without JS, storage, or animation support. */
(() => {
  "use strict";
  const KEY = "ap.navigation.v1";
  const DEPART_MS = 360;
  const ARRIVE_MS = 600;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;
  let arrival = false;
  function pageKey(url) {
    return url.pathname.replace(/index\.html$/, "") + url.search;
  }
  try {
    const pending = JSON.parse(sessionStorage.getItem(KEY) || "null");
    sessionStorage.removeItem(KEY);
    arrival =
      !!pending &&
      pending.page === pageKey(new URL(location.href)) &&
      Date.now() - pending.time < 15000;
  } catch {
    /* Storage is optional. */
  }
  if (arrival) {
    root.dataset.pageArrival = "true";
    if (!reduced.matches) root.classList.add("page-arriving");
  }
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const curtain = document.createElement("div");
      curtain.className = "page-curtain";
      curtain.setAttribute("aria-hidden", "true");
      curtain.innerHTML =
        '<span class="page-curtain-mark">ap<span>✳</span></span><span class="page-curtain-label">SYSTEMS / WEB / PLAY</span>';
      document.body.append(curtain);
      let departing = false;
      let navigationTimer;
      let cleanupTimer;
      function reset() {
        clearTimeout(navigationTimer);
        clearTimeout(cleanupTimer);
        departing = false;
        curtain.classList.remove("is-leaving", "is-entering");
        root.classList.remove("page-arriving", "transition-ready");
        try {
          sessionStorage.removeItem(KEY);
        } catch {
          /* Optional. */
        }
      }
      if (arrival && !reduced.matches) {
        curtain.classList.add("is-entering");
        root.classList.add("transition-ready");
        cleanupTimer = setTimeout(reset, ARRIVE_MS);
      }
      document.addEventListener("click", (event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          reduced.matches
        )
          return;
        const link =
          event.target instanceof Element
            ? event.target.closest("a[href]")
            : null;
        if (
          !link ||
          link.hasAttribute("download") ||
          (link.target && link.target.toLowerCase() !== "_self")
        )
          return;
        let destination;
        try {
          destination = new URL(link.href);
        } catch {
          return;
        }
        if (
          !/^https?:$/.test(destination.protocol) ||
          destination.origin !== location.origin ||
          pageKey(destination) === pageKey(new URL(location.href)) ||
          !(
            /\/$/.test(destination.pathname) ||
            /\.html$/.test(destination.pathname)
          )
        )
          return;
        event.preventDefault();
        if (departing) return;
        reset();
        departing = true;
        try {
          sessionStorage.setItem(
            KEY,
            JSON.stringify({ page: pageKey(destination), time: Date.now() }),
          );
        } catch {
          /* Optional. */
        }
        curtain.classList.add("is-leaving");
        navigationTimer = setTimeout(() => {
          // A failed or very slow navigation must not leave the page covered.
          cleanupTimer = setTimeout(reset, 1800);
          location.assign(destination.href);
        }, DEPART_MS);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && departing) reset();
      });
      reduced.addEventListener("change", (event) => {
        if (!event.matches) return;
        // Pending user navigation still completes if the preference changes.
        curtain.classList.remove("is-leaving", "is-entering");
        root.classList.remove("page-arriving", "transition-ready");
      });
      window.addEventListener("pagehide", () => {
        clearTimeout(navigationTimer);
        clearTimeout(cleanupTimer);
      });
      window.addEventListener("pageshow", (event) => {
        if (event.persisted) reset();
      });
    },
    { once: true },
  );
})();
