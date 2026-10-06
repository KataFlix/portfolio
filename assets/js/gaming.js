/* Personal practice notes: no account API, cookies, or remote storage. */
(() => {
  "use strict";

  const accounts = {
    kataflix: {
      name: "KataFlix",
      url: "https://op.gg/lol/summoners/eune/KataFlix-EUNE",
    },
    evelynnflix: {
      name: "EvelynnFlix",
      url: "https://op.gg/lol/summoners/eune/EvelynnFlix-EUNE",
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
      tag.textContent = "#EUNE";
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

  const STORAGE_KEY = "ap.gaming.journal.v1";
  const MAX_ENTRIES = 200;
  const form = document.getElementById("journal-form");
  const entryList = document.getElementById("journal-entries");
  const emptyState = document.getElementById("journal-empty");
  const errorMessage = document.getElementById("journal-form-error");
  const status = document.getElementById("journal-status");
  const storageWarning = document.getElementById("journal-storage-warning");
  const exportButton = document.getElementById("journal-export");
  const importButton = document.getElementById("journal-import");
  const importInput = document.getElementById("journal-import-file");
  const clearButton = document.getElementById("journal-clear");
  const clearDialog = document.getElementById("journal-clear-dialog");
  const dateInput = document.getElementById("session-date");
  const focusInput = document.getElementById("session-focus");
  const championInput = document.getElementById("session-champion");
  const notesInput = document.getElementById("session-notes");
  const resultInput = document.getElementById("session-result");
  let entries = [];
  let storageAvailable = true;

  const localDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };

  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return false;
    const date = new Date(`${value}T12:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }

  function validEntry(entry) {
    return (
      entry &&
      typeof entry === "object" &&
      typeof entry.id === "string" &&
      entry.id.length > 0 &&
      entry.id.length <= 80 &&
      validDate(entry.date) &&
      ["win", "loss", "unrecorded"].includes(entry.result) &&
      typeof entry.champion === "string" &&
      entry.champion.length <= 40 &&
      typeof entry.focus === "string" &&
      entry.focus.trim().length > 0 &&
      entry.focus.length <= 80 &&
      typeof entry.notes === "string" &&
      entry.notes.length <= 600
    );
  }

  function warn(message) {
    storageWarning.textContent = message;
    storageWarning.hidden = false;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const saved = JSON.parse(stored);
      if (
        !saved ||
        saved.version !== 1 ||
        !Array.isArray(saved.entries) ||
        saved.entries.length > MAX_ENTRIES ||
        !saved.entries.every(validEntry) ||
        new Set(saved.entries.map((entry) => entry.id)).size !==
          saved.entries.length
      ) {
        throw new Error("Invalid stored journal");
      }
      entries = saved.entries.map((entry) => ({
        id: entry.id,
        date: entry.date,
        result: entry.result,
        champion: entry.champion,
        focus: entry.focus,
        notes: entry.notes,
      }));
    }
  } catch (error) {
    storageAvailable = false;
    warn(
      "Your saved journal could not be read. New entries will work for this visit only. Export them to keep a backup.",
    );
  }

  function persist() {
    if (!storageAvailable) return;
    try {
      if (entries.length)
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: 1, entries }),
        );
      else localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      storageAvailable = false;
      warn(
        "Browser storage is unavailable or full. Your entries work for this visit only. Export them to keep a backup.",
      );
    }
  }

  function readableDate(value) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T12:00:00`));
  }

  function announce(message, isError = false) {
    status.classList.toggle("is-error", isError);
    status.textContent = message;
  }

  function render() {
    entryList.replaceChildren();
    const ordered = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    ordered.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "journal-entry";
      const meta = document.createElement("div");
      meta.className = "journal-entry-meta";
      const date = document.createElement("time");
      date.dateTime = entry.date;
      date.textContent = readableDate(entry.date);
      const result = document.createElement("span");
      result.className = `journal-result journal-result--${entry.result}`;
      result.textContent =
        entry.result === "unrecorded"
          ? "RESULT NOT RECORDED"
          : entry.result.toUpperCase();
      meta.append(date, result);
      if (entry.champion) {
        const champion = document.createElement("span");
        champion.textContent = entry.champion;
        meta.append(champion);
      }
      const focus = document.createElement("h4");
      focus.textContent = entry.focus;
      item.append(meta, focus);
      if (entry.notes) {
        const notes = document.createElement("p");
        notes.className = "journal-entry-notes";
        notes.textContent = entry.notes;
        item.append(notes);
      }
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "journal-entry-delete";
      deleteButton.textContent = "Delete entry";
      deleteButton.setAttribute(
        "aria-label",
        `Delete entry: session from ${readableDate(entry.date)}: ${entry.focus}`,
      );
      deleteButton.addEventListener("click", () => {
        const next = item.nextElementSibling || item.previousElementSibling;
        const nextId = next && next.dataset.entryId;
        entries = entries.filter((saved) => saved.id !== entry.id);
        persist();
        render();
        announce(
          `Session from ${readableDate(entry.date)} deleted from this journal.`,
        );
        const nextItem = [...entryList.children].find(
          (saved) => saved.dataset.entryId === nextId,
        );
        (nextItem ? nextItem.querySelector("button") : focusInput).focus();
      });
      item.dataset.entryId = entry.id;
      item.append(deleteButton);
      entryList.append(item);
    });
    emptyState.hidden = entries.length > 0;
    exportButton.disabled = entries.length === 0;
    clearButton.disabled = entries.length === 0;
    document.getElementById("journal-count").textContent = String(
      entries.length,
    ).padStart(2, "0");
    document.getElementById("journal-wins").textContent = String(
      entries.filter((entry) => entry.result === "win").length,
    ).padStart(2, "0");
    document.getElementById("journal-last").textContent = ordered.length
      ? readableDate(ordered[0].date)
      : "—";
  }

  function showError(message, field) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    field.setAttribute("aria-invalid", "true");
    field.focus();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    errorMessage.hidden = true;
    dateInput.removeAttribute("aria-invalid");
    focusInput.removeAttribute("aria-invalid");
    if (!validDate(dateInput.value))
      return showError("Choose a valid session date.", dateInput);
    if (!focusInput.value.trim())
      return showError(
        "Add a practice focus before saving your session.",
        focusInput,
      );
    if (entries.length >= MAX_ENTRIES)
      return showError(
        "This journal holds up to 200 sessions. Export a backup, then delete older entries to make room.",
        focusInput,
      );
    const entry = {
      id:
        window.crypto && typeof window.crypto.randomUUID === "function"
          ? window.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date: dateInput.value,
      result: resultInput.value,
      champion: championInput.value.trim(),
      focus: focusInput.value.trim(),
      notes: notesInput.value.trim(),
    };
    if (!validEntry(entry))
      return showError(
        "Check the field lengths and result, then try saving again.",
        focusInput,
      );
    entries.unshift(entry);
    persist();
    render();
    form.reset();
    dateInput.value = localDate();
    announce(
      storageAvailable
        ? "Session saved in this browser."
        : "Session added for this visit. Export it to keep a backup.",
    );
    focusInput.focus();
  });

  [dateInput, focusInput].forEach((field) => {
    field.addEventListener("input", () => {
      field.removeAttribute("aria-invalid");
      errorMessage.hidden = true;
    });
  });

  exportButton.addEventListener("click", () => {
    if (!entries.length) return;
    const snapshot = {
      version: 1,
      exportedAt: new Date().toISOString(),
      site: "antreasparaskeva.com",
      entries,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `andreas-gaming-journal-${localDate()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce(
      "Journal exported as a JSON backup. Keep the downloaded file somewhere safe.",
    );
  });

  // Backups merge with current notes. Validate every record before changing anything.
  const entryFields = ["id", "date", "result", "champion", "focus", "notes"];
  function sameEntry(a, b) {
    return entryFields.every((field) => a[field] === b[field]);
  }

  function importFailure(message) {
    const error = new Error(message);
    error.name = "JournalImportError";
    return error;
  }

  importButton.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;
    importButton.disabled = true;
    announce("Reading your journal backup…");
    try {
      if (file.size > 1024 * 1024)
        throw importFailure("Choose a JSON backup no larger than 1 MB.");
      let snapshot;
      try {
        snapshot = JSON.parse(await file.text());
      } catch (error) {
        if (error instanceof SyntaxError)
          throw importFailure(
            "The file is not valid JSON. Choose an exported journal backup.",
          );
        throw importFailure(
          "The file could not be read. Try selecting it again.",
        );
      }
      if (
        !snapshot ||
        snapshot.version !== 1 ||
        !Array.isArray(snapshot.entries) ||
        snapshot.entries.length > MAX_ENTRIES ||
        !snapshot.entries.every(validEntry)
      ) {
        throw importFailure(
          "This file is not a supported journal backup. It must contain valid version 1 entries, with no more than 200 sessions.",
        );
      }
      const records = new Map(entries.map((entry) => [entry.id, entry]));
      const additions = [];
      for (const raw of snapshot.entries) {
        const entry = {
          id: raw.id,
          date: raw.date,
          result: raw.result,
          champion: raw.champion,
          focus: raw.focus,
          notes: raw.notes,
        };
        const previous = records.get(entry.id);
        if (previous && !sameEntry(previous, entry)) {
          throw importFailure(
            "A session ID conflicts with another entry. Nothing was imported; your existing journal was kept.",
          );
        }
        if (!previous) {
          records.set(entry.id, entry);
          additions.push(entry);
        }
      }
      if (records.size > MAX_ENTRIES)
        throw importFailure(
          "Merging this backup would exceed the 200-session limit. Export your current journal, then delete older sessions before importing.",
        );
      if (!additions.length) {
        announce(
          "No new sessions were added. These entries are already in your journal.",
        );
      } else {
        entries = [...additions, ...entries];
        persist();
        render();
        const count = additions.length;
        announce(
          `${count} ${count === 1 ? "session" : "sessions"} imported. ${storageAvailable ? "Existing entries were kept, and the journal was saved in this browser." : "Existing entries were kept for this visit. Export a backup because browser storage is unavailable."}`,
        );
      }
    } catch (error) {
      announce(
        error.name === "JournalImportError"
          ? `Backup not imported. ${error.message}`
          : "Backup not imported. The file could not be processed. Your existing journal was kept.",
        true,
      );
    } finally {
      importInput.value = "";
      importButton.disabled = false;
      importButton.focus();
    }
  });

  function clearEntries() {
    entries = [];
    persist();
    render();
    announce(
      storageAvailable
        ? "All entries were deleted from this browser’s journal."
        : "All entries were removed from this visit’s journal. Previously saved browser data could not be changed.",
    );
    focusInput.focus();
  }

  clearButton.addEventListener("click", () => {
    if (!entries.length) return;
    if (typeof clearDialog.showModal === "function") {
      clearDialog.showModal();
      document.getElementById("journal-clear-cancel").focus();
    } else if (
      window.confirm(
        "Delete all journal entries from this browser? This cannot be undone. Export a backup first if you want to keep them.",
      )
    ) {
      clearEntries();
    }
  });
  document
    .getElementById("journal-clear-cancel")
    .addEventListener("click", () => {
      clearDialog.close();
      clearButton.focus();
    });
  document
    .getElementById("journal-clear-confirm")
    .addEventListener("click", () => {
      clearDialog.close();
      clearEntries();
    });

  dateInput.value = localDate();
  document.getElementById("journal-save").disabled = false;
  importButton.disabled = false;
  render();
})();
