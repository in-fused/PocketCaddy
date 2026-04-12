(function () {
  "use strict";

  const RENDER_DEBOUNCE_MS = 80;

  const state = {
    wired: false,
    observer: null,
    isRendering: false,
    renderQueued: false,
    debounceTimer: 0,
    needsRender: false,
    lastSnapshot: ""
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

  function normalizeDisplayText(value) {
    const text = String(value == null ? "" : value).trim();
    return text && !isUnavailable(text) ? text : "Unavailable";
  }

  function createPill(text) {
    const pill = document.createElement("span");
    pill.className = "home-active-round-pill";
    pill.textContent = text;
    return pill;
  }

  function setText(node, text) {
    if (!node) return;
    if (node.textContent !== text) {
      node.textContent = text;
    }
  }

  function setUnavailableClass(node, isUnavailableValue) {
    if (!node) return;
    node.classList.toggle("is-unavailable", Boolean(isUnavailableValue));
  }

  function getSessionSnapshot() {
    const stateApi = window.PocketCaddyState || {};
    if (typeof stateApi.getSession !== "function") return null;
    try {
      return stateApi.getSession();
    } catch (_err) {
      return null;
    }
  }

  function parsePositiveInt(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    const rounded = Math.floor(num);
    return rounded > 0 ? rounded : null;
  }

  function getPlayerCountLabel(...values) {
    for (let i = 0; i < values.length; i += 1) {
      const value = values[i];
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        return `${value} ${value === 1 ? "player" : "players"}`;
      }
      const text = String(value == null ? "" : value).trim();
      if (!text) continue;
      const match = text.match(/(\d+)/);
      if (!match) continue;
      const count = parsePositiveInt(match[1]);
      if (count != null) return `${count} ${count === 1 ? "player" : "players"}`;
    }
    return "Unavailable";
  }

  function parseProgressText(text) {
    const normalized = String(text || "").trim();
    const through = normalized.match(/through\s+(\d+)\s+of\s+(\d+)/i);
    if (!through) return { complete: null, total: null };
    const complete = parsePositiveInt(through[1]);
    const total = parsePositiveInt(through[2]);
    if (complete == null || total == null) return { complete: null, total: null };
    return { complete: Math.min(complete, total), total: total };
  }

  function buildCurrentHoleLabel(complete, total) {
    if (total == null || total < 1) return "Unavailable";
    const safeComplete = Number.isFinite(Number(complete)) ? Math.max(0, Number(complete)) : 0;
    if (safeComplete >= total) return `Completed ${total} holes`;
    const hole = Math.min(total, safeComplete + 1);
    return `Hole ${hole} of ${total}`;
  }

  function readLeaderContext() {
    const leaderboardBody = byId("leaderboard-body");
    if (!leaderboardBody) {
      return { leaderName: "Unavailable", scoreVsPar: "Unavailable" };
    }
    const firstRow = leaderboardBody.querySelector("tr");
    if (!firstRow) {
      return { leaderName: "Unavailable", scoreVsPar: "Unavailable" };
    }
    const cells = firstRow.querySelectorAll("td");
    const leaderName = cells[1] ? normalizeDisplayText(cells[1].textContent) : "Unavailable";
    const relativeNode = firstRow.querySelector(".leader-relative");
    const relativeText = normalizeDisplayText(relativeNode ? relativeNode.textContent : "");
    return {
      leaderName: leaderName,
      scoreVsPar: relativeText
    };
  }

  function buildLiveEntry(session, seenTitles) {
    const activeRoundLabel = readText(byId("home-status-active-round"));
    if (isUnavailable(activeRoundLabel)) return null;

    const syncLabel = readText(byId("home-status-sync"));
    const metaPlayerCount = readText(byId("meta-player-count"));
    const savedPlayers = readText(byId("home-saved-player-count"));
    const sessionPlayersCount = session && Number.isFinite(Number(session.playersCount))
      ? Math.max(0, Number(session.playersCount))
      : null;
    const playersLabel = getPlayerCountLabel(sessionPlayersCount, metaPlayerCount, savedPlayers);

    const sessionHolesTotal = session && Number.isFinite(Number(session.holesTotal))
      ? Math.max(0, Number(session.holesTotal))
      : null;
    const sessionHolesComplete = session && Number.isFinite(Number(session.holesComplete))
      ? Math.max(0, Number(session.holesComplete))
      : null;

    const savedProgress = readText(byId("home-saved-hole-progress"));
    const parsedProgress = parseProgressText(savedProgress);
    const holesTotal = sessionHolesTotal || parsedProgress.total;
    const holesComplete = sessionHolesComplete != null ? sessionHolesComplete : parsedProgress.complete;
    const currentHole = buildCurrentHoleLabel(holesComplete, holesTotal);

    const leaderContext = readLeaderContext();
    const title = activeRoundLabel;
    seenTitles.add(title.toLowerCase());

    return {
      stateLabel: "In Progress",
      title: title,
      subtitle: "Live Round",
      progress: syncLabel ? `Sync: ${syncLabel}` : "Sync: Unavailable",
      intel: {
        roundName: title,
        players: playersLabel,
        currentHole: currentHole,
        leader: leaderContext.leaderName,
        scoreVsPar: leaderContext.scoreVsPar
      },
      meta: [
        syncLabel ? `Connection: ${syncLabel}` : "Connection: Unavailable",
        leaderContext.leaderName === "Unavailable" ? "Leaderboard: Unavailable" : "Leaderboard: Live"
      ]
    };
  }

  function buildSavedEntry(session, seenTitles) {
    const savedCard = byId("home-saved-session-card");
    const savedVisible = Boolean(savedCard && !savedCard.classList.contains("hidden"));
    if (!savedVisible) return null;

    const savedRoundName = readText(byId("home-saved-round-name"));
    if (isUnavailable(savedRoundName)) return null;
    const key = savedRoundName.toLowerCase();
    if (seenTitles.has(key)) return null;

    const savedProgress = readText(byId("home-saved-hole-progress"));
    const savedPlayers = readText(byId("home-saved-player-count"));
    const parsedProgress = parseProgressText(savedProgress);
    const sessionHolesTotal = session && Number.isFinite(Number(session.holesTotal))
      ? Math.max(0, Number(session.holesTotal))
      : null;
    const sessionHolesComplete = session && Number.isFinite(Number(session.holesComplete))
      ? Math.max(0, Number(session.holesComplete))
      : null;
    const currentHole = buildCurrentHoleLabel(
      sessionHolesComplete != null ? sessionHolesComplete : parsedProgress.complete,
      sessionHolesTotal || parsedProgress.total
    );

    seenTitles.add(key);
    return {
      stateLabel: "Paused",
      title: savedRoundName,
      subtitle: "Saved Session",
      progress: isUnavailable(savedProgress) ? "Progress unavailable" : savedProgress,
      intel: {
        roundName: savedRoundName,
        players: normalizeDisplayText(savedPlayers),
        currentHole: currentHole,
        leader: "Unavailable",
        scoreVsPar: "Unavailable"
      },
      meta: ["Session: Local Save", "Leaderboard: Unavailable"]
    };
  }

  function buildEntries() {
    const entries = [];
    const seenTitles = new Set();
    const session = getSessionSnapshot();

    const liveEntry = buildLiveEntry(session, seenTitles);
    if (liveEntry) entries.push(liveEntry);

    const savedEntry = buildSavedEntry(session, seenTitles);
    if (savedEntry) entries.push(savedEntry);

    return entries.slice(0, 4);
  }

  function setBoardPriorityClasses(hasLiveRound, hasSavedRound) {
    const homeView = byId("home-view");
    const liveBoard = byId("home-active-rounds-section");
    if (homeView) {
      homeView.classList.toggle("home-has-live", hasLiveRound);
      homeView.classList.toggle("home-no-live", !hasLiveRound);
      homeView.classList.toggle("home-has-saved", hasSavedRound);
      homeView.classList.toggle("home-no-saved", !hasSavedRound);
    }
    if (liveBoard) {
      liveBoard.classList.toggle("home-priority-live", hasLiveRound);
    }
  }

  function updateHeroIntelligence(entries) {
    const hasLiveRound = entries.some((entry) => entry.stateLabel === "In Progress");
    const hasSavedRound = entries.some((entry) => entry.stateLabel === "Paused");

    const statusActiveRound = byId("home-status-active-round");
    const statusLocalSession = byId("home-status-local-session");
    const statusHistory = byId("home-status-history");
    const nextActionNote = byId("home-next-action-note");

    if (statusActiveRound) {
      const activeEntry = entries.find((entry) => entry.stateLabel === "In Progress");
      if (activeEntry && !isUnavailable(activeEntry.title)) {
        setText(statusActiveRound, activeEntry.title);
        setUnavailableClass(statusActiveRound, false);
      } else if (isUnavailable(readText(statusActiveRound))) {
        setText(statusActiveRound, "Unavailable");
        setUnavailableClass(statusActiveRound, true);
      }
    }

    if (statusLocalSession) {
      if (hasSavedRound) {
        const savedEntry = entries.find((entry) => entry.stateLabel === "Paused");
        setText(statusLocalSession, savedEntry && !isUnavailable(savedEntry.title)
          ? `Saved: ${savedEntry.title}`
          : "Resume available");
        setUnavailableClass(statusLocalSession, false);
      } else {
        setText(statusLocalSession, "No saved session");
        setUnavailableClass(statusLocalSession, false);
      }
    }

    if (statusHistory) {
      const current = readText(statusHistory);
      const countMatch = current.match(/(\d+)/);
      if (countMatch) {
        const count = parsePositiveInt(countMatch[1]);
        if (count != null) {
          setText(statusHistory, `${count} ${count === 1 ? "completed round" : "completed rounds"}`);
          setUnavailableClass(statusHistory, false);
        }
      } else {
        setText(statusHistory, "No completed rounds yet");
        setUnavailableClass(statusHistory, false);
      }
    }

    if (nextActionNote) {
      if (hasSavedRound) {
        setText(nextActionNote, "Next best action: Resume Saved Round to continue where you left off.");
      } else if (hasLiveRound) {
        setText(nextActionNote, "Next best action: Check Live Clubhouse Board for current hole pace and leader context.");
      } else {
        setText(nextActionNote, "Next best action: Create Round to launch a new scorecard.");
      }
    }
  }

  function renderEmptyState(listNode, statusNode) {
    if (statusNode) {
      setText(statusNode, "No active rounds yet");
      setUnavailableClass(statusNode, false);
    }
    setBoardPriorityClasses(false, false);
    updateHeroIntelligence([]);

    listNode.innerHTML = "";
    const unavailable = document.createElement("article");
    unavailable.className = "home-active-round-item is-unavailable";
    unavailable.setAttribute("role", "listitem");

    const main = document.createElement("div");
    main.className = "home-active-round-main";

    const title = document.createElement("p");
    title.className = "home-active-round-title";
    title.textContent = "No active rounds yet";

    const subtitle = document.createElement("p");
    subtitle.className = "home-active-round-subtitle";
    subtitle.textContent = "Live Board";

    const progress = document.createElement("p");
    progress.className = "home-active-round-progress";
    progress.textContent = "Start or join a round to populate the clubhouse board.";

    main.append(title, subtitle);
    unavailable.append(main, progress);
    listNode.appendChild(unavailable);
  }

  function createIntelItem(label, value) {
    const item = document.createElement("p");
    item.className = "home-active-round-intel-item";

    const labelNode = document.createElement("span");
    labelNode.className = "home-active-round-intel-label";
    labelNode.textContent = label;

    const valueNode = document.createElement("span");
    valueNode.className = "home-active-round-intel-value";
    const safeValue = normalizeDisplayText(value);
    valueNode.textContent = safeValue;
    valueNode.classList.toggle("is-unavailable", safeValue === "Unavailable");

    item.append(labelNode, valueNode);
    return item;
  }

  function renderEntriesNow(entries) {
    const listNode = byId("home-active-rounds-list");
    const statusNode = byId("home-active-rounds-status");
    if (!listNode) return;

    const hasLiveRound = entries.some((entry) => entry.stateLabel === "In Progress");
    const hasSavedRound = entries.some((entry) => entry.stateLabel === "Paused");

    if (!entries.length) {
      renderEmptyState(listNode, statusNode);
      return;
    }

    setBoardPriorityClasses(hasLiveRound, hasSavedRound);
    updateHeroIntelligence(entries);
    if (statusNode) {
      setText(statusNode, `${entries.length} ${entries.length === 1 ? "round" : "rounds"} tracked`);
      setUnavailableClass(statusNode, false);
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

      const intelGrid = document.createElement("div");
      intelGrid.className = "home-active-round-intel-grid";
      intelGrid.append(
        createIntelItem("Round", entry.intel && entry.intel.roundName),
        createIntelItem("Players", entry.intel && entry.intel.players),
        createIntelItem("Current Hole", entry.intel && entry.intel.currentHole),
        createIntelItem("Leader", entry.intel && entry.intel.leader),
        createIntelItem("Vs Par", entry.intel && entry.intel.scoreVsPar)
      );

      const meta = document.createElement("p");
      meta.className = "home-active-round-meta";
      (Array.isArray(entry.meta) ? entry.meta : []).forEach((value) => {
        meta.appendChild(createPill(value));
      });

      main.append(title, subtitle);
      row.append(head, main, progress, intelGrid, meta);
      listNode.appendChild(row);
    });
  }

  function disconnectObserver() {
    if (state.observer) {
      state.observer.disconnect();
    }
  }

  function watchNode(node, options) {
    if (!state.observer || !node) return;
    state.observer.observe(node, options);
  }

  function reconnectObserver() {
    if (!state.observer) return;

    const textWatch = { childList: true, characterData: true, subtree: true };
    watchNode(byId("home-status-sync"), textWatch);
    watchNode(byId("home-saved-round-name"), textWatch);

    const savedCard = byId("home-saved-session-card");
    watchNode(savedCard, { attributes: true, attributeFilter: ["class"] });
  }

  function renderEntries() {
    if (state.isRendering) {
      state.needsRender = true;
      return;
    }

    state.isRendering = true;
    disconnectObserver();

    try {
      const entries = buildEntries();
      const nextSnapshot = JSON.stringify(entries);
      if (nextSnapshot === state.lastSnapshot) {
        return;
      }

      state.lastSnapshot = nextSnapshot;
      renderEntriesNow(entries);
    } finally {
      state.isRendering = false;
      reconnectObserver();
      if (state.needsRender) {
        state.needsRender = false;
        scheduleRender();
      }
    }
  }

  function scheduleRender() {
    if (state.isRendering) {
      state.needsRender = true;
      return;
    }

    if (state.debounceTimer) {
      window.clearTimeout(state.debounceTimer);
      state.debounceTimer = 0;
    }

    state.renderQueued = true;

    state.debounceTimer = window.setTimeout(() => {
      state.debounceTimer = 0;
      state.renderQueued = false;
      renderEntries();
    }, RENDER_DEBOUNCE_MS);
  }

  function wireObservers() {
    if (state.observer) state.observer.disconnect();
    state.observer = new MutationObserver(() => {
      if (state.isRendering) return;
      scheduleRender();
    });

    reconnectObserver();
  }

  function init() {
    if (state.wired) return;
    state.wired = true;

    wireObservers();
    renderEntries();

    window.addEventListener("pocketcaddy:runtime-ready", () => {
      scheduleRender();
    });
  }

  function safeInit() {
    try {
      init();
    } catch (_err) {
      // Stability lock: never allow home board init failures to block page load.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeInit, { once: true });
  } else {
    safeInit();
  }
})();
