/* OP.GG account switcher. No account API, cookies, or stored player data. */
(() => {
  "use strict";

  const accounts = {
    kataflix: {
      name: "KataFlix",
      tag: "EUNE",
      region: "EUNE",
      url: "https://op.gg/lol/summoners/eune/KataFlix-EUNE",
    },
    evelynnflix: {
      name: "EvelynnFlix",
      tag: "EUW",
      region: "EUW",
      url: "https://op.gg/lol/summoners/euw/EvelynnFlix-EUW",
    },
  };
  const accountName = document.getElementById("account-name");
  const accountLink = document.getElementById("account-profile-link");
  const accountButtons = [...document.querySelectorAll("[data-account]")];
  accountButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const account = accounts[button.dataset.account];
      if (!account) return;
      accountButtons.forEach((other) => {
        const active = other === button;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-pressed", String(active));
      });
      const tag = document.createElement("span");
      tag.textContent = `#${account.tag}`;
      document.getElementById("account-region").textContent =
        `SUMMONER / ${account.region}`;
      accountName.replaceChildren(document.createTextNode(account.name), tag);
      accountLink.href = account.url;
      const arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      const newTab = document.createElement("span");
      newTab.className = "sr-only";
      newTab.textContent = " (opens in a new tab)";
      accountLink.replaceChildren(
        document.createTextNode(`View ${account.name} on OP.GG `),
        arrow,
        newTab,
      );
    });
  });
})();
