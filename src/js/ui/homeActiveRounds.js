(function () {
  "use strict";

  const state = {
    wired: false,
    observer: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function readText(node) {
    return node ? String(node.textContent || "").trim() : "";
  }

  function isUnavailable(text) {
    const normalized = String(text || "").trim().toLowerCase();
    return !normalized
      || normalized === "-"
      || normalized === "unavailable"
      || normalized === "progress unavailable"
      || normalized === "location unavailable"
      || normalized === "n/a";
  }

  function createPill(text) {
    const pill = document.createElement("span");
    pill.className = "home-active-round-pill";
    pill.textContent = text;
    return pill;
  }

  function buildEntries() {
    const entries = [];
    const seenTitles = new Set();

    const activeRoundLabel = readText(byId("home-status-active-round"));
    const syncLabel = readText(byId("home-status-sync"));
    if (!isUnavailable(activeRoundLabel)) {
      const title = activeRoundLabel;
      seenTitles.add(title.toLowerCase());
      entries.push({
        stateLabel: "In Progress",
        title: title,
        subtitle: "Live Round",
        progress: syncLabel ? `Sync: ${syncLabel}` : "Sync: Unavailable",
        meta: ["Leaderboard: Unavailable", "Live Preview"]
      });
    }

    const savedCard = byId("home-saved-session-card");
    const savedVisible = Boolean(savedCard && !savedCard.classList.contains("hidden"));
    const savedRoundName = readText(byId("home-saved-round-name"));
    const savedProgress = readText(byId("home-saved-hole-progress"));
    const savedPlayers = readText(byId("home-saved-player-count"));
    if (savedVisible && !isUnavailable(savedRoundName)) {
      const key = savedRoundName.toLowerCase();
      if (!seenTitles.has(key)) {
        entries.push({
          stateLabel: "Paused",
          title: savedRoundName,
          subtitle: "Saved Session",
          progress: isUnavailable(savedProgress) ? "Progress unavailable" : savedProgress,
          meta: [
            isUnavailable(savedPlayers) ? "Players: Unavailable" : savedPlayers,
            "Leaderboard: Unavailable"
          ]
        });
        seenTitles.add(key);
      }
    }

    return entries.slice(0, 4);
  }

  function renderUnavailable(listNode, statusNode) {
    if (statusNode) {
      statusNode.textContent = "Unavailable";
      statusNode.classList.add("is-unavailable");
    }

    listNode.innerHTML = "";
    const unavailable = document.createElement("article");
    unavailable.className = "home-active-round-item is-unavailable";
    unavailable.setAttribute("role", "listitem");

    const main = document.createElement("div");
    main.className = "home-active-round-main";

    const title = document.createElement("p");
    title.className = "home-active-round-title";
    title.textContent = "Live round preview";

    const subtitle = document.createElement("p");
    subtitle.className = "home-active-round-subtitle";
    subtitle.textContent = "Unavailable";

    const progress = document.createElement("p");
    progress.className = "home-active-round-progress";
    progress.textContent = "No in-progress leaderboard data is currently available.";

    main.append(title, subtitle);
    unavailable.append(main, progress);
    listNode.appendChild(unavailable);
  }

  function renderEntries() {
    const listNode = byId("home-active-rounds-list");
    const statusNode = byId("home-active-rounds-status");
    if (!listNode) return;

    const entries = buildEntries();
    if (!entries.length) {
      renderUnavailable(listNode, statusNode);
      return;
    }

    if (statusNode) {
      statusNode.textContent = `${entries.length} ${entries.length === 1 ? "round" : "rounds"} tracked`;
      statusNode.classList.remove("is-unavailable");
    }

    listNode.innerHTML = "";

    entries.forEach((entry, index) => {
      const row = document.createElement("article");
      row.className = "home-active-round-item";
      row.setAttribute("role", "listitem");
      if (entry.stateLabel === "Paused") {
        row.classList.add("is-paused");
      } else {
        row.classList.add("is-live");
      }

      const head = document.createElement("div");
      head.className = "home-active-round-row-head";

      const rank = document.createElement("span");
      rank.className = "home-active-round-rank";
      rank.textContent = `#${index + 1}`;

      const stateBadge = document.createElement("span");
      stateBadge.className = "home-active-round-state";
      if (entry.stateLabel === "Paused") stateBadge.classList.add("is-paused");
      stateBadge.textContent = entry.stateLabel;
      head.append(rank, stateBadge);

      const main = document.createElement("div");
      main.className = "home-active-round-main";

      const title = document.createElement("p");
      title.className = "home-active-round-title";
      title.textContent = entry.title;

      const subtitle = document.createElement("p");
      subtitle.className = "home-active-round-subtitle";
      subtitle.textContent = entry.subtitle;

      const progress = document.createElement("p");
      progress.className = "home-active-round-progress";
      progress.textContent = entry.progress;

      const meta = document.createElement("p");
      meta.className = "home-active-round-meta";
      entry.meta.forEach((value) => {
        meta.appendChild(createPill(value));
      });

      main.append(title, subtitle);
      row.append(head, main, progress, meta);
      listNode.appendChild(row);
    });
  }

  function watchNode(observer, node, options) {
    if (!node) return;
    observer.observe(node, options);
  }

  function wireObservers() {
    if (state.observer) state.observer.disconnect();
    state.observer = new MutationObserver(() => {
      renderEntries();
    });

    const observer = state.observer;
    const textWatch = { childList: true, characterData: true, subtree: true };
    watchNode(observer, byId("home-status-active-round"), textWatch);
    watchNode(observer, byId("home-status-sync"), textWatch);
    watchNode(observer, byId("home-saved-round-name"), textWatch);
    watchNode(observer, byId("home-saved-player-count"), textWatch);
    watchNode(observer, byId("home-saved-hole-progress"), textWatch);

    const savedCard = byId("home-saved-session-card");
    watchNode(observer, savedCard, { attributes: true, attributeFilter: ["class"] });

    const homeView = byId("home-view");
    watchNode(observer, homeView, { attributes: true, attributeFilter: ["class"] });
  }

  function init() {
    if (state.wired) return;
    state.wired = true;
    renderEntries();
    wireObservers();

    window.addEventListener("pocketcaddy:runtime-ready", () => {
      renderEntries();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
