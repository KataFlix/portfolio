/* Shared interactions. All portfolio copy is editable in index.html, except
   the two project-detail descriptions below. No dependencies or API keys. */
(() => {
  "use strict";
  document.documentElement.classList.add("js");
  const menuButton = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-nav]");
  const setMenu = (open) => {
    if (!menuButton || !nav) return;
    menuButton.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  };
  menuButton?.addEventListener("click", () =>
    setMenu(menuButton.getAttribute("aria-expanded") !== "true"),
  );
  nav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menuButton?.getAttribute("aria-expanded") === "true"
    ) {
      setMenu(false);
      menuButton.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (
      menuButton?.getAttribute("aria-expanded") === "true" &&
      !nav?.contains(event.target) &&
      !menuButton.contains(event.target)
    )
      setMenu(false);
  });
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  mobileQuery.addEventListener("change", () => setMenu(false));

  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
  const clock = document.querySelector("[data-local-time]");
  if (clock) {
    const updateClock = () => {
      clock.textContent = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Nicosia",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
    };
    updateClock();
    window.setInterval(updateClock, 60000);
  }

  const progress = document.querySelector(".scroll-progress");
  if (progress) {
    let ticking = false;
    const updateProgress = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = `${total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0}%`;
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(updateProgress);
          ticking = true;
        }
      },
      { passive: true },
    );
    window.addEventListener("resize", updateProgress);
    updateProgress();
  }

  if (
    "IntersectionObserver" in window &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.06 },
    );
    document.querySelectorAll(".reveal").forEach((el) => {
      el.classList.add("will-reveal");
      observer.observe(el);
    });
  }

  const copyButton = document.querySelector("[data-copy-email]");
  copyButton?.addEventListener("click", async () => {
    const status = document.querySelector("[data-copy-status]");
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard not available");
      await navigator.clipboard.writeText("andreas.paraskeva2711@hotmail.com");
      if (status) status.textContent = "Email address copied.";
    } catch {
      if (status)
        status.textContent =
          "Select the email address above to copy, or click it to write to me.";
    }
  });

  const projects = {
    "better-schools": {
      title: "Better Schools",
      category: "01 / FULL-STACK EDUCATIONAL PLATFORM",
      intro:
        "Bringing the everyday needs of a school together in one connected web platform.",
      description:
        "Developed as part of my work at INOTECHMENT LTD. Better Schools combines learning workflows and communication with a full-stack approach.",
      heading: "What the platform includes",
      points: [
        "Authentication and role-based access control.",
        "Assignments and attendance workflows.",
        "Real-time chat for connected communication.",
      ],
      tags: ["PHP", "MySQL", "JavaScript", "Firebase"],
      href: "https://betterschools.eu",
      link: "Visit Better Schools ↗",
      note: "The portfolio artwork is an original interface illustration, rather than a screenshot of the live platform.",
    },
    v2go: {
      title: "V2Go",
      category: "02 / FINAL-YEAR MOBILE APPLICATION",
      intro:
        "Exploring electric-vehicle energy requirements through a mobile-first experience.",
      description:
        "My final-year Computer Science project at Frederick University: a React Native application bringing route planning and energy analysis together.",
      heading: "The project explores",
      points: [
        "Route planning for electric-vehicle journeys.",
        "Battery consumption analysis and energy requirements.",
        "Vehicle-to-Grid concepts and their role in electric mobility.",
      ],
      tags: [
        "React Native",
        "Route planning",
        "Battery analysis",
        "Vehicle-to-Grid",
      ],
      href: "mailto:andreas.paraskeva2711@hotmail.com?subject=Tell%20me%20about%20V2Go",
      link: "Ask me about the project ↗",
      note: "A university project; no public demo is currently linked. The artwork is an original interface illustration.",
    },
  };
  const dialog = document.querySelector("#project-dialog");
  if (dialog && typeof dialog.showModal === "function") {
    let lastTrigger = null;
    document.querySelectorAll("[data-project]").forEach((trigger) => {
      trigger.disabled = false;
      trigger.addEventListener("click", () => {
        const project = projects[trigger.dataset.project];
        if (!project) return;
        lastTrigger = trigger;
        document.querySelector("#dialog-title").textContent = project.title;
        document.querySelector("#dialog-category").textContent =
          project.category;
        document.querySelector("#dialog-intro").textContent = project.intro;
        document.querySelector("#dialog-note").textContent = project.note;
        const body = document.querySelector("#dialog-body");
        body.replaceChildren();
        const paragraph = document.createElement("p");
        paragraph.textContent = project.description;
        const heading = document.createElement("h3");
        heading.textContent = project.heading;
        const list = document.createElement("ul");
        project.points.forEach((point) => {
          const item = document.createElement("li");
          item.textContent = point;
          list.append(item);
        });
        body.append(paragraph, heading, list);
        const tags = document.querySelector("#dialog-tags");
        tags.replaceChildren();
        project.tags.forEach((tag) => {
          const el = document.createElement("span");
          el.textContent = tag;
          tags.append(el);
        });
        const link = document.querySelector("#dialog-link");
        link.href = project.href;
        link.textContent = project.link;
        if (project.href.startsWith("https://")) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        } else {
          link.removeAttribute("target");
          link.removeAttribute("rel");
        }
        dialog.showModal();
      });
    });
    dialog
      .querySelector(".dialog-close")
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      if (
        event.target === dialog &&
        (event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom)
      )
        dialog.close();
    });
    dialog.addEventListener("close", () => lastTrigger?.focus());
  }
})();
