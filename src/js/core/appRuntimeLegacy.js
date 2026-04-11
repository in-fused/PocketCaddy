(function () {
  "use strict";

  const MAX_PLAYERS = 30;
  const MIN_SCORE = 1;
  const MAX_SCORE = 15;
  const WEATHER_FETCH_TIMEOUT_MS = 4500;
  const INTEL_UNAVAILABLE = "Unavailable";
  const INTEL_LOADING = "Loading...";
  const ROUND_HISTORY_EXPORT_COOLDOWN_MS = 850;
  const ROUND_HISTORY_ACTION_FEEDBACK_COOLDOWN_MS = 900;
  const CLOSE_FINISH_MARGIN = 2;
  const BLOWOUT_MARGIN = 8;
  const BACK_NINE_COMEBACK_SWING = 2;
  const stateHelpers = window.PocketCaddyState || {};
  const {
    safeClone,
    getSession,
    saveSession,
    clearLocalSavedSessionState,
    persistSessionSnapshot,
    identityKey,
    readRoundHistoryFromStorage,
    writeRoundHistoryToStorage,
    loadRoundHistoryFromStorage,
    capRoundHistory,
    ROUND_HISTORY_LIMIT
  } = stateHelpers;
  const ROUND_HISTORY_MAX = Number.isInteger(ROUND_HISTORY_LIMIT) ? ROUND_HISTORY_LIMIT : 50;

  const dom = {
    homeView: document.getElementById("home-view"),
    homeTitle: document.getElementById("home-title"),
    homeTagline: document.getElementById("home-tagline"),
    homeNextActionNote: document.getElementById("home-next-action-note"),
    homeStatusActiveRound: document.getElementById("home-status-active-round"),
    homeStatusLocalSession: document.getElementById("home-status-local-session"),
    homeStatusHistory: document.getElementById("home-status-history"),
    homeStatusSync: document.getElementById("home-status-sync"),
    homeHistoryPreviewStatus: document.getElementById("home-history-preview-status"),
    homeGolfPreviewStatus: document.getElementById("home-golf-preview-status"),
    homeSavedSessionCard: document.getElementById("home-saved-session-card"),
    homeSavedSessionCopy: document.getElementById("home-saved-session-copy"),
    homeSavedSessionProgress: document.getElementById("home-saved-session-progress"),
    homeSavedRoundName: document.getElementById("home-saved-round-name"),
    homeSavedPlayerCount: document.getElementById("home-saved-player-count"),
    homeSavedHoleProgress: document.getElementById("home-saved-hole-progress"),
    roundName: document.getElementById("round-name"),
    courseSearchInput: document.getElementById("course-search"),
    courseSearchList: document.getElementById("course-search-list"),
    courseSearchStatus: document.getElementById("course-search-status"),
    selectedCourseCard: document.getElementById("selected-course-card"),
    courseName: document.getElementById("course-name"),
    tee: document.getElementById("tee"),
    holes: document.getElementById("holes"),
    newPlayer: document.getElementById("new-player"),
    addPlayerBtn: document.getElementById("add-player-btn"),
    playerCount: document.getElementById("player-count"),
    setupPlayerList: document.getElementById("setup-player-list"),
    homeError: document.getElementById("home-error"),
    createRoundBtn: document.getElementById("create-round-btn"),
    joinInput: document.getElementById("join-input"),
    joinRoundBtn: document.getElementById("join-round-btn"),
    joinError: document.getElementById("join-error"),
    hubResumeBtn: document.getElementById("hub-resume-btn"),
    hubCreateBtn: document.getElementById("hub-create-btn"),
    hubJoinBtn: document.getElementById("hub-join-btn"),
    quickCreateBtn: document.getElementById("quick-create-btn"),
    quickJoinBtn: document.getElementById("quick-join-btn"),
    quickHistoryBtn: document.getElementById("quick-history-btn"),
    continuityHistoryBtn: document.getElementById("continuity-history-btn"),
    quickResumeBtn: document.getElementById("quick-resume-btn"),
    quickCancelSavedBtn: document.getElementById("quick-cancel-saved-btn"),
    homeOperationsSection: document.getElementById("home-operations-section"),
    createRoundSection: document.getElementById("create-round-section"),
    joinRoundSection: document.getElementById("join-round-section"),
    roundHistorySection: document.getElementById("round-history-section"),
    homeGolfDashboard: document.getElementById("home-golf-dashboard"),

    scoreView: document.getElementById("score-view"),
    metaRoundName: document.getElementById("meta-round-name"),
    metaCourse: document.getElementById("meta-course"),
    metaTee: document.getElementById("meta-tee"),
    metaHoles: document.getElementById("meta-holes"),
    metaPlayerCount: document.getElementById("meta-player-count"),
    metaUserName: document.getElementById("meta-user-name"),
    switchPlayerBtn: document.getElementById("switch-player-btn"),
    roundId: document.getElementById("round-id"),
    shareLink: document.getElementById("share-link"),
    qrBox: document.getElementById("qr-box"),
    copyLinkBtn: document.getElementById("copy-link-btn"),
    copyShareBtn: document.getElementById("copy-share-btn"),
    nativeShareBtn: document.getElementById("native-share-btn"),
    backHomeBtn: document.getElementById("back-home-btn"),
    newRoundBtn: document.getElementById("new-round-btn"),
    clearRoundBtn: document.getElementById("clear-round-btn"),
    leaderboardBackHead: document.getElementById("leaderboard-back-head"),
    leaderboardBody: document.getElementById("leaderboard-body"),
    parRow: document.getElementById("par-row"),
    parSaveStatus: document.getElementById("par-save-status"),
    scoreTable: document.getElementById("score-table"),
    scoreScrollContainer: document.getElementById("score-scroll-container"),
    payoutSettingsGrid: document.getElementById("payout-settings-grid"),
    potAmount: document.getElementById("pot-amount"),
    payoutFirst: document.getElementById("payout-first"),
    payoutSecond: document.getElementById("payout-second"),
    payoutThird: document.getElementById("payout-third"),
    payoutLockMessage: document.getElementById("payout-lock-message"),
    payoutWarning: document.getElementById("payout-warning"),
    payoutSaveStatus: document.getElementById("payout-save-status"),
    payoutPositionBody: document.getElementById("payout-position-body"),
    payoutPlayerBody: document.getElementById("payout-player-body"),
    holeIntelligenceStrip: document.getElementById("hole-intelligence-strip"),
    shotIntelHole: document.getElementById("shot-intel-hole"),
    shotIntelWind: document.getElementById("shot-intel-wind"),
    shotIntelClub: document.getElementById("shot-intel-club"),
    shotIntelWindNote: document.getElementById("shot-intel-wind-note"),
    shotIntelTip: document.getElementById("shot-intel-tip"),
    holeDetailEditorHole: document.getElementById("hole-detail-editor-hole"),
    holeDetailDistanceInput: document.getElementById("hole-detail-distance-input"),
    holeDetailDifficultySelect: document.getElementById("hole-detail-difficulty-select"),
    holeDetailSaveStatus: document.getElementById("hole-detail-save-status"),
    scoreHint: document.querySelector("#score-view .card.section .muted.tiny"),
    courseIntelCard: document.getElementById("course-intel-card"),
    courseIntelName: document.getElementById("course-intel-name"),
    courseIntelLocation: document.getElementById("course-intel-location"),
    courseIntelCoords: document.getElementById("course-intel-coords"),
    courseIntelMapped: document.getElementById("course-intel-mapped"),
    courseIntelWeather: document.getElementById("course-intel-weather"),
    courseIntelWind: document.getElementById("course-intel-wind"),
    courseIntelPreview: document.getElementById("course-intel-preview"),
    courseIntelPreviewFallback: document.getElementById("course-intel-preview-fallback"),

    nameModal: document.getElementById("name-modal"),
    nameModalInput: document.getElementById("name-modal-input"),
    nameModalError: document.getElementById("name-modal-error"),
    nameModalSubmit: document.getElementById("name-modal-submit"),

    picker: document.getElementById("score-picker"),
    pickerTitle: document.getElementById("picker-title"),
    pickerStatus: document.getElementById("picker-status"),
    pickerGrid: document.getElementById("picker-grid"),
    pickerMinus: document.getElementById("picker-minus"),
    pickerPlus: document.getElementById("picker-plus"),
    pickerClear: document.getElementById("picker-clear"),
    pickerDone: document.getElementById("picker-done"),

    scoreFeedback: document.getElementById("score-feedback")
  };

  const state = {
    setupPlayers: [],
    round: null,
    players: [],
    scoreMap: {},
    parMap: {},
    pendingScoreKeys: new Set(),
    pendingParHoles: new Set(),
    parSaveTimers: new Map(),
    pendingHoleDetailHoles: new Set(),
    holeDetailSaveTimers: new Map(),
    channel: null,
    activeCell: null,
    identityName: null,
    identityPlayerId: null,
    feedbackTimer: null,
    feedbackHideTimer: null,
    copyBtnTimer: null,
    settingsSaveTimer: null,
    courseSearchTimer: null,
    courseSearchResults: [],
    selectedCourseMetadata: null,
    courseContextRequestId: 0,
    courseIntelContext: null,
    courseIntelRoundKey: null,
    coursePreviewRequestId: 0,
    coursePreviewLoadedUrl: null,
    potSettingsLocked: false,
    holeDetails: {},
    selectedHole: null,
    selectedHolePulse: null,
    holePulseTimer: null,
    lastAutoScrollIdentityToken: null,
    recentScoreFlashKey: null,
    scoreFlashTimer: null,
    scoreTapKey: null,
    scoreTapTimer: null,
    activeCellPulseKey: null,
    activeCellPulseTimer: null,
    scoreAutoAdvanceTimer: null,
    pickerStatusTimer: null,
    pickerCloseTimer: null,
    pickerOpenRaf: null,
    lastLeaderSignature: null,
    leaderPulseOn: false,
    leaderPulseTimer: null,
    leaderboardOrderById: {},
    leaderboardShiftMap: {},
    leaderboardShiftTimer: null,
    roundCompletion: null,
    roundCompleteTransitionTimer: null,
    roundCompletionCandidateAt: null,
    roundSummaryExpandedPlayerId: null,
    roundSummaryReplayExpandedPlayerId: null,
    roundHistoryDraft: null,
    roundHistoryPreparedAt: null,
    roundHistory: [],
    roundHistoryExpandedRoundId: null,
    roundHistoryReplayRoundId: null,
    roundHistoryExportCooldownByKey: {},
    roundHistoryActionFeedback: {
      message: "",
      type: "",
      at: 0
    },
    roundHistoryPersistFingerprint: null,
    shareImageLoaderPromise: null,
    shareImageBlob: null,
    shareImageBlobKey: null,
    shareImageCanvas: null,
    shareImageCanvasKey: null,
    shareInFlight: false,
    shareSaveInFlight: false,
    shareButtonResetTimer: null,
    homeMode: "home",
    eventsWired: false
  };

  function init() {
    window.PocketCaddyRoundLifecycle.initializeAppFlow(buildRoundLifecycleDeps());





















  }

  function wireEvents() {
    if (state.eventsWired) return;
    state.eventsWired = true;
    dom.addPlayerBtn.addEventListener("click", addSetupPlayer);
    if (dom.courseSearchInput) {
      dom.courseSearchInput.addEventListener("input", onCourseSearchInput);
      dom.courseSearchInput.addEventListener("focus", onCourseSearchFocus);
      dom.courseSearchInput.addEventListener("blur", onCourseSearchBlur);
    }
    if (dom.courseSearchList) {
      dom.courseSearchList.addEventListener("click", onCourseSuggestionClick);
    }
    if (dom.selectedCourseCard) {
      dom.selectedCourseCard.addEventListener("click", onSelectedCourseCardClick);
    }
    if (dom.courseName) {
      dom.courseName.addEventListener("input", onCourseNameInput);
    }
    dom.newPlayer.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addSetupPlayer();
      }
    });

    dom.createRoundBtn.addEventListener("click", createRound);
    dom.joinRoundBtn.addEventListener("click", joinFromInput);
    initializeHomeHubNavigation();
    if (dom.hubResumeBtn) {
      dom.hubResumeBtn.addEventListener("click", resumeSession);
    }
    if (dom.quickResumeBtn) {
      dom.quickResumeBtn.addEventListener("click", resumeSession);
    }
    if (dom.quickCancelSavedBtn) {
      dom.quickCancelSavedBtn.addEventListener("click", cancelSavedRoundSession);
    }

    dom.copyLinkBtn.addEventListener("click", copyShareLink);
    dom.switchPlayerBtn.addEventListener("click", () => openNameModal(true));
    dom.backHomeBtn.addEventListener("click", () => {
      closePicker();
      showView("home");
    });
    dom.newRoundBtn.addEventListener("click", startNewRound);
    dom.clearRoundBtn.addEventListener("click", clearCurrentRoundData);

    dom.nameModalSubmit.addEventListener("click", submitIdentityName);
    dom.nameModalInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitIdentityName();
      }
    });

    dom.pickerMinus.addEventListener("click", () => adjustScore(-1));
    dom.pickerPlus.addEventListener("click", () => adjustScore(1));
    dom.pickerClear.addEventListener("click", clearActiveScore);
    dom.pickerDone.addEventListener("click", closePicker);
    dom.scoreTable.addEventListener("click", onScoreTableClick);
    dom.holeIntelligenceStrip.addEventListener("click", onHoleIntelligenceClick);
    dom.parRow.addEventListener("change", onParInputChanged);
    dom.parRow.addEventListener("blur", onParInputBlur, true);
    dom.holeDetailDistanceInput.addEventListener("input", onHoleDetailDistanceInput);
    dom.holeDetailDistanceInput.addEventListener("blur", onHoleDetailDistanceBlur);
    dom.holeDetailDifficultySelect.addEventListener("change", onHoleDetailDifficultyChanged);

    [dom.potAmount, dom.payoutFirst, dom.payoutSecond, dom.payoutThird].forEach((input) => {
      input.addEventListener("input", onPayoutInputChanged);
      input.addEventListener("blur", normalizePayoutInputValues);
    });

    const leaderboardSection = dom.leaderboardBody && dom.leaderboardBody.closest("section");
    if (leaderboardSection) leaderboardSection.addEventListener("click", onRoundSummaryPanelClick);
  }

  function ensureRoundHistorySection() {
    if (!dom.homeView) return null;
    let section = document.getElementById("round-history-section");
    if (!section) {
      section = document.createElement("section");
      section.id = "round-history-section";
      section.className = "home-history card-sub";
      section.innerHTML = `
        <h3>Round History</h3>
        <p class="muted tiny">Saved on this device only (last ${ROUND_HISTORY_MAX} rounds).</p>
        <div id="round-history-player-stats" class="round-history-player-stats"></div>
        <div id="round-history-insights" class="round-history-insights-wrap"></div>
        <div id="round-history-list" class="round-history-list"></div>
        <div id="round-history-replay" class="round-history-replay hidden"></div>
      `;
      const joinSection = dom.homeView.querySelector("#join-round-section");
      if (joinSection) {
        joinSection.insertAdjacentElement("afterend", section);
      } else {
        dom.homeView.appendChild(section);
      }
    }
    ensureRoundHistoryMountContract(section);
    if (!section.dataset.wired) {
      section.addEventListener("click", onRoundHistorySectionClick);
      section.dataset.wired = "true";
    }
    return section;
  }

  function ensureRoundHistoryMountContract(section) {
    if (!section) return;
    const insightsWrap = ensureRoundHistoryChild(section, {
      id: "round-history-insights",
      className: "round-history-insights-wrap",
      beforeId: "round-history-player-stats"
    });
    const statsWrap = ensureRoundHistoryChild(section, {
      id: "round-history-player-stats",
      className: "round-history-player-stats",
      beforeId: "round-history-list"
    });
    ensureRoundHistoryChild(section, {
      id: "round-history-list",
      className: "round-history-list",
      afterId: statsWrap ? statsWrap.id : (insightsWrap ? insightsWrap.id : "")
    });
    ensureRoundHistoryChild(section, {
      id: "round-history-replay",
      className: "round-history-replay",
      afterId: "round-history-list",
      addHiddenOnCreate: true
    });
  }

  function ensureRoundHistoryChild(section, options) {
    const opts = options || {};
    const id = String(opts.id || "").trim();
    if (!id) return null;
    let node = section.querySelector(`#${id}`);
    const className = String(opts.className || "").trim();
    const classNames = className ? className.split(/\s+/).filter(Boolean) : [];
    if (!node) {
      node = document.createElement("div");
      node.id = id;
      classNames.forEach((name) => node.classList.add(name));
      if (opts.addHiddenOnCreate) node.classList.add("hidden");

      const beforeId = String(opts.beforeId || "").trim();
      const afterId = String(opts.afterId || "").trim();
      const beforeNode = beforeId ? section.querySelector(`#${beforeId}`) : null;
      const afterNode = afterId ? section.querySelector(`#${afterId}`) : null;
      if (beforeNode && beforeNode.parentNode === section) {
        section.insertBefore(node, beforeNode);
      } else if (afterNode && afterNode.parentNode === section) {
        if (afterNode.nextSibling) {
          section.insertBefore(node, afterNode.nextSibling);
        } else {
          section.appendChild(node);
        }
      } else {
        section.appendChild(node);
      }
      return node;
    }

    classNames.forEach((name) => {
      if (!node.classList.contains(name)) node.classList.add(name);
    });
    return node;
  }

  function onRoundHistorySectionClick(event) {
    const actionNode = event.target.closest("[data-action]");
    if (actionNode) {
      const action = String(actionNode.getAttribute("data-action") || "").trim();
      const roundId = String(actionNode.getAttribute("data-round-id") || "").trim();
      event.preventDefault();
      event.stopPropagation();

      if (action === "export-history-json") {
        triggerRoundHistoryExport("json", roundId);
        return;
      }
      if (action === "export-history-csv") {
        triggerRoundHistoryExport("csv", roundId);
        return;
      }
      if (action === "export-history-summary-json") {
        triggerRoundHistorySummaryExport("json");
        return;
      }
      if (action === "export-history-summary-csv") {
        triggerRoundHistorySummaryExport("csv");
        return;
      }
      if (action === "toggle-history-row") {
        if (!roundId) {
          showRoundHistoryActionFeedback("This history row is unavailable.", "error");
          return;
        }
        const entry = findRoundHistoryEntry(roundId);
        if (!entry) {
          showRoundHistoryActionFeedback("This history row is unavailable.", "error");
          return;
        }
        const normalizedRoundId = String(entry.roundId).trim();
        state.roundHistoryExpandedRoundId = String(state.roundHistoryExpandedRoundId) === normalizedRoundId ? null : normalizedRoundId;
        renderRoundHistorySection();
        return;
      }
      if (action === "replay-history-round") {
        if (!roundId) {
          showRoundHistoryActionFeedback("Replay unavailable for this round.", "error");
          return;
        }
        const entry = findRoundHistoryEntry(roundId);
        if (!entry) {
          showRoundHistoryActionFeedback("Replay unavailable for this round.", "error");
          return;
        }
        const normalizedRoundId = String(entry.roundId).trim();
        state.roundHistoryReplayRoundId = String(state.roundHistoryReplayRoundId) === normalizedRoundId ? null : normalizedRoundId;
        state.roundSummaryReplayExpandedPlayerId = null;
        renderRoundHistorySection();
        return;
      }
    }

    const replayPlayerBtn = event.target.closest(".round-history-replay .round-summary-row[data-player-id]");
    if (replayPlayerBtn) {
      const playerId = replayPlayerBtn.getAttribute("data-player-id");
      if (!playerId) return;
      state.roundSummaryReplayExpandedPlayerId = String(state.roundSummaryReplayExpandedPlayerId) === String(playerId) ? null : playerId;
      renderRoundHistorySection();
    }
  }

  function findRoundHistoryEntry(roundId) {
    const normalizedRoundId = String(roundId == null ? "" : roundId).trim();
    if (!normalizedRoundId) return null;
    const history = Array.isArray(state.roundHistory) ? state.roundHistory : [];
    return history.find((entry) => String(entry && entry.roundId).trim() === normalizedRoundId) || null;
  }

  function showRoundHistoryActionFeedback(message, type) {
    const safeMessage = String(message == null ? "" : message).trim();
    if (!safeMessage) return;
    const safeType = String(type == null ? "neutral" : type).trim().toLowerCase() || "neutral";
    const now = Date.now();
    const previous = state.roundHistoryActionFeedback || { message: "", type: "", at: 0 };
    if (
      previous &&
      previous.message === safeMessage &&
      previous.type === safeType &&
      now - Number(previous.at || 0) < ROUND_HISTORY_ACTION_FEEDBACK_COOLDOWN_MS
    ) {
      return;
    }
    state.roundHistoryActionFeedback = {
      message: safeMessage,
      type: safeType,
      at: now
    };
    showFeedback(safeMessage, safeType);
  }

  function canTriggerRoundHistoryExport(type, roundId) {
    const normalizedType = String(type == null ? "" : type).trim().toLowerCase();
    const normalizedScope = String(roundId == null ? "" : roundId).trim();
    if (!normalizedType || !normalizedScope) return false;
    const key = `${normalizedType}:${normalizedScope}`;
    const now = Date.now();
    const previous = Number(state.roundHistoryExportCooldownByKey[key] || 0);
    if (now - previous < ROUND_HISTORY_EXPORT_COOLDOWN_MS) return false;
    state.roundHistoryExportCooldownByKey[key] = now;
    return true;
  }

  function triggerRoundHistoryExport(type, roundId) {
    const normalizedType = String(type == null ? "" : type).trim().toLowerCase();
    const normalizedRoundId = String(roundId == null ? "" : roundId).trim();
    if (normalizedType !== "json" && normalizedType !== "csv") {
      showRoundHistoryActionFeedback("Unsupported export format.", "error");
      return;
    }
    if (!normalizedRoundId) {
      showRoundHistoryActionFeedback("Export unavailable for this round.", "error");
      return;
    }
    if (!canTriggerRoundHistoryExport(normalizedType, normalizedRoundId)) return;

    const entry = findRoundHistoryEntry(normalizedRoundId);
    if (!entry) {
      showRoundHistoryActionFeedback("Export unavailable for this round.", "error");
      return;
    }
    const renderApi = window.PocketCaddyRender;
    if (!renderApi) {
      showRoundHistoryActionFeedback("Export unavailable right now.", "error");
      return;
    }

    try {
      if (normalizedType === "json") {
        renderApi.downloadRoundAsJSON(entry);
        showRoundHistoryActionFeedback("JSON downloaded.", "success");
        return;
      }
      if (normalizedType === "csv") {
        renderApi.downloadRoundAsCSV(entry);
        showRoundHistoryActionFeedback("CSV downloaded.", "success");
        return;
      }
      showRoundHistoryActionFeedback("Unsupported export format.", "error");
    } catch (err) {
      console.error("Round history export failed:", err);
      showRoundHistoryActionFeedback("Export failed. Try again.", "error");
    }
  }

  function triggerRoundHistorySummaryExport(type) {
    const normalizedType = String(type == null ? "" : type).trim().toLowerCase();
    if (normalizedType !== "json" && normalizedType !== "csv") {
      showRoundHistoryActionFeedback("Unsupported export format.", "error");
      return;
    }
    if (!canTriggerRoundHistoryExport(normalizedType, "history-summary")) return;

    const history = capRoundHistory(Array.isArray(state.roundHistory) ? state.roundHistory : []);
    state.roundHistory = history;
    if (!history.length) {
      showRoundHistoryActionFeedback("History export unavailable. No saved rounds yet.", "neutral");
      return;
    }

    const renderApi = window.PocketCaddyRender;
    if (!renderApi) {
      showRoundHistoryActionFeedback("Export unavailable right now.", "error");
      return;
    }

    try {
      if (normalizedType === "json") {
        renderApi.downloadHistorySummaryAsJSON(history);
        showRoundHistoryActionFeedback("History JSON downloaded.", "success");
        return;
      }
      if (normalizedType === "csv") {
        renderApi.downloadHistorySummaryAsCSV(history);
        showRoundHistoryActionFeedback("History CSV downloaded.", "success");
        return;
      }
      showRoundHistoryActionFeedback("Unsupported export format.", "error");
    } catch (err) {
      console.error("Round history summary export failed:", err);
      showRoundHistoryActionFeedback("History export failed. Try again.", "error");
    }
  }

  function formatHistoryDate(isoDate) {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "-";
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(date);
    } catch (_err) {
      return date.toISOString().slice(0, 10);
    }
  }

  function getWinnerNamesFromHistory(entry) {
    const winners = Array.isArray(entry && entry.winnerNames) ? entry.winnerNames.filter(Boolean) : [];
    if (winners.length) return winners;
    const winnerIds = new Set(Array.isArray(entry && entry.winnerIds) ? entry.winnerIds.map((id) => String(id)) : []);
    if (!winnerIds.size) return [];
    const standings = Array.isArray(entry && entry.standings) ? entry.standings : [];
    return standings.filter((row) => winnerIds.has(String(row.id))).map((row) => row.name);
  }

  function buildCompletionFromHistoryEntry(entry) {
    if (!entry) return null;
    const standings = safeClone(Array.isArray(entry.standings) ? entry.standings : []);
    const winners = getWinnerNamesFromHistory(entry);
    const winnerLabel = entry.winnerLabel || (winners.length > 1 ? "Winners (Tie)" : "Winner");
    return {
      isComplete: true,
      holes: Number(entry.holes) || 0,
      playersCount: Array.isArray(entry.players) ? entry.players.length : standings.length,
      totalRequiredScores: 0,
      enteredScores: 0,
      missingScores: 0,
      pendingScoreCount: 0,
      standings: standings,
      leaders: standings.filter((row) => winners.includes(row.name)),
      winnerLabel: winnerLabel,
      winnerNames: winners,
      topThree: standings.slice(0, 3).map((row) => ({
        id: row.id,
        name: row.name,
        rank: row.rank,
        total: row.total,
        relative: row.relative
      })),
      competitiveTags: safeClone(Array.isArray(entry.competitiveTags) ? entry.competitiveTags : []),
      playerInsightsById: entry.insights && typeof entry.insights === "object" ? safeClone(entry.insights) : {},
      highlights: entry.highlights && typeof entry.highlights === "object" ? safeClone(entry.highlights) : {}
    };
  }

  function buildRoundHistoryFingerprint(entry) {
    if (!entry) return null;
    const players = Array.isArray(entry.standings) ? entry.standings : [];
    const totals = players.map((row) => `${row.id}:${row.total == null ? "-" : row.total}`).join("|");
    return [String(entry.roundId || ""), String(entry.date || ""), totals].join("::");
  }

  function persistRoundHistoryFromCompletion(completion) {
    if (!completion || !completion.isComplete) {
      state.roundHistoryPersistFingerprint = null;
      return;
    }
    const draft = buildRoundHistoryDraft(completion);
    if (!draft) return;
    const fingerprint = buildRoundHistoryFingerprint(draft);
    if (fingerprint && state.roundHistoryPersistFingerprint === fingerprint) return;
    const current = capRoundHistory(readRoundHistoryFromStorage());
    const existingIdx = current.findIndex((entry) => String(entry.roundId) === String(draft.roundId));
    if (existingIdx >= 0) current.splice(existingIdx, 1);
    current.unshift(draft);
    state.roundHistory = capRoundHistory(current);
    state.roundHistoryPersistFingerprint = fingerprint;
    writeRoundHistoryToStorage(state.roundHistory);
    renderRoundHistorySection();
  }

  function computePlayerProgressionStats(history) {
    const map = new Map();
    const rounds = Array.isArray(history) ? history : [];
    for (const entry of rounds) {
      const standings = Array.isArray(entry && entry.standings) ? entry.standings : [];
      const winnerIds = new Set(Array.isArray(entry && entry.winnerIds) ? entry.winnerIds.map((id) => String(id)) : []);
      for (const row of standings) {
        const name = String(row && row.name ? row.name : "").trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            key: key,
            name: name,
            roundsPlayed: 0,
            wins: 0,
            scoreSum: 0,
            scoredRounds: 0,
            bestRound: null
          });
        }
        const stat = map.get(key);
        stat.name = name;
        stat.roundsPlayed += 1;
        if (winnerIds.has(String(row.id))) stat.wins += 1;
        if (Number.isFinite(Number(row.total))) {
          const total = Number(row.total);
          stat.scoreSum += total;
          stat.scoredRounds += 1;
          if (stat.bestRound == null || total < stat.bestRound) stat.bestRound = total;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.bestRound == null && b.bestRound != null) return 1;
      if (b.bestRound == null && a.bestRound != null) return -1;
      if (a.bestRound != null && b.bestRound != null && a.bestRound !== b.bestRound) return a.bestRound - b.bestRound;
      return a.name.localeCompare(b.name);
    });
  }

  function renderRoundHistorySection() {
    const section = ensureRoundHistorySection();
    if (!section) return;
    const insightsWrap = document.getElementById("round-history-insights");
    const statsWrap = document.getElementById("round-history-player-stats");
    const historyList = document.getElementById("round-history-list");
    const replayWrap = document.getElementById("round-history-replay");
    if (!insightsWrap || !statsWrap || !historyList || !replayWrap) {
      const missingNodes = [];
      if (!insightsWrap) missingNodes.push("round-history-insights");
      if (!statsWrap) missingNodes.push("round-history-player-stats");
      if (!historyList) missingNodes.push("round-history-list");
      if (!replayWrap) missingNodes.push("round-history-replay");
      console.warn("Round history mount contract incomplete. Missing nodes:", missingNodes.join(", "));
      return;
    }
    window.PocketCaddyRender.renderRoundHistory({
      insightsWrap: insightsWrap,
      historyList: historyList,
      statsWrap: statsWrap,
      replayWrap: replayWrap,
      state: state,
      capRoundHistory: capRoundHistory,
      computePlayerProgressionStats: computePlayerProgressionStats,
      getWinnerNamesFromHistory: getWinnerNamesFromHistory,
      formatHistoryDate: formatHistoryDate,
      escapeHtml: escapeHtml,
      formatDecimal: formatDecimal,
      buildCompletionFromHistoryEntry: buildCompletionFromHistoryEntry,
      buildRoundSummaryPanelMarkup: buildRoundSummaryPanelMarkup
    });
  }

  function showView(name) {
    dom.homeView.classList.add("hidden");
    dom.scoreView.classList.add("hidden");
    if (name === "home") {
      dom.homeView.classList.remove("hidden");
      setHomeMode("home", { skipFocus: true });
      updateHomeQuickActions();
      renderRoundHistorySection();
    }
    if (name === "score") dom.scoreView.classList.remove("hidden");
  }

  function showError(node, message) {
    window.PocketCaddyRender.showError({ node: node, message: message });
  }

  function showFeedback(message, type) {
    window.PocketCaddyRender.showFeedback({
      message: message,
      type: type,
      state: state,
      dom: dom
    });
  }

  function updateHomeQuickActions() {
    window.PocketCaddyRender.updateUIStatus({
      state: state,
      dom: dom,
      getSession: getSession
    });
  }

  function cancelSavedRoundSession() {
    window.PocketCaddyRoundLifecycle.cancelSession(buildRoundLifecycleDeps());














  }

  function initializeHomeHubNavigation() {
    const hubModule = window.PocketCaddyHomeHubModule;
    if (!hubModule || typeof hubModule.initializeHomeHub !== "function") return;
    hubModule.initializeHomeHub({
      homeView: dom.homeView,
      onModeChange: function (mode) {
        state.homeMode = mode;
      }
    });
  }

  function setHomeMode(mode, options) {
    const hubApi = window.PocketCaddyHomeHub || window.PocketCaddyHomeHubModule;
    if (!hubApi || typeof hubApi.setMode !== "function") return;
    hubApi.setMode(mode, options);
    if (typeof hubApi.getMode === "function") {
      state.homeMode = hubApi.getMode();
    }
  }

  function addSetupPlayer() {
    const name = dom.newPlayer.value.trim();
    if (!name) return;
    if (state.setupPlayers.length >= MAX_PLAYERS) {
      showError(dom.homeError, `Maximum ${MAX_PLAYERS} players.`);
      return;
    }
    state.setupPlayers.push({ id: `local-${Date.now()}-${Math.random()}`, name: name.trim() });
    dom.newPlayer.value = "";
    dom.newPlayer.focus();
    showError(dom.homeError, "");
    renderSetupPlayers();
  }

  function onCourseSearchInput() {
    if (!dom.courseSearchInput) return;
    const query = dom.courseSearchInput.value.trim();
    if (query.length < 2) {
      state.courseSearchResults = [];
      renderCourseSuggestions([]);
      setCourseSearchStatus(query.length === 0 ? "" : "Type at least 2 characters, or enter course name manually.");
      return;
    }
    clearTimeout(state.courseSearchTimer);
    setCourseSearchStatus("Searching courses...");
    state.courseSearchTimer = setTimeout(() => {
      searchCourses(query);
    }, 220);
  }

  function onCourseSearchFocus() {
    if (state.courseSearchResults.length > 0) {
      renderCourseSuggestions(state.courseSearchResults);
    }
  }

  function onCourseSearchBlur() {
    setTimeout(() => {
      if (dom.courseSearchList) dom.courseSearchList.classList.add("hidden");
    }, 130);
  }

  function onCourseSuggestionClick(event) {
    const button = event.target.closest(".course-suggestion");
    if (!button) return;
    const idx = Number(button.getAttribute("data-index"));
    if (!Number.isInteger(idx)) return;
    const selected = state.courseSearchResults[idx];
    if (!selected) return;
    applySelectedCourse(selected);
  }

  function onSelectedCourseCardClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    if (action === "clear") {
      clearSelectedCourse();
      if (dom.courseSearchInput) dom.courseSearchInput.focus();
    }
  }

  function onCourseNameInput() {
    if (!state.selectedCourseMetadata || !dom.courseName) return;
    const typed = dom.courseName.value.trim().toLowerCase();
    const selectedName = String(state.selectedCourseMetadata.displayName || "").trim().toLowerCase();
    if (!typed || typed !== selectedName) {
      clearSelectedCourse({
        keepCourseName: true,
        statusMessage: "Using manual course name entry.",
        keepSuggestions: true
      });
    }
  }

  async function searchCourses(query) {
    try {
      const results = await window.SupabaseAPI.searchCourses(query);
      state.courseSearchResults = rankCourseResults(Array.isArray(results) ? results : [], query);
      renderCourseSuggestions(state.courseSearchResults);
      if (state.courseSearchResults.length === 0) {
        setCourseSearchStatus("No matches found. Enter course name manually to continue.");
      } else {
        setCourseSearchStatus(`${state.courseSearchResults.length} result${state.courseSearchResults.length === 1 ? "" : "s"} found. Tap to select.`);
      }
    } catch (_err) {
      state.courseSearchResults = [];
      renderCourseSuggestions([]);
      setCourseSearchStatus("Search unavailable. Enter course name manually.");
    }
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasCourseCoords(item) {
    return Number.isFinite(Number(item && item.lat)) && Number.isFinite(Number(item && item.lng));
  }

  function hasCourseLocation(item) {
    return String(item && item.locationText ? item.locationText : "").trim().length > 0;
  }

  function hasCourseSource(item) {
    return normalizeCourseSource(item ? item.source : null) != null;
  }

  function getCourseNameRank(name, query) {
    const n = normalizeSearchText(name);
    const q = normalizeSearchText(query);
    if (!n || !q) return 0;
    if (n === q) return 5;
    if (n.startsWith(q)) return 4;
    if (n.includes(q)) return 3;
    const nTokens = n.split(" ").filter(Boolean);
    const qTokens = q.split(" ").filter(Boolean);
    if (qTokens.length && qTokens.every((token) => nTokens.includes(token))) return 2;
    return 1;
  }

  function rankCourseResults(results, query) {
    const rows = Array.isArray(results) ? results : [];
    return rows
      .map((item, index) => ({
        item: item,
        index: index,
        nameRank: getCourseNameRank(item && item.displayName, query),
        hasCoords: hasCourseCoords(item),
        hasLocation: hasCourseLocation(item),
        hasSource: hasCourseSource(item)
      }))
      .sort((a, b) => {
        if (b.nameRank !== a.nameRank) return b.nameRank - a.nameRank;
        if (a.hasCoords !== b.hasCoords) return a.hasCoords ? -1 : 1;
        if (a.hasLocation !== b.hasLocation) return a.hasLocation ? -1 : 1;
        if (a.hasSource !== b.hasSource) return a.hasSource ? -1 : 1;
        return a.index - b.index;
      })
      .map((row) => row.item);
  }

  function getCourseSuggestionHint(item) {
    const hints = [];
    if (hasCourseCoords(item)) hints.push("Coordinates available");
    const source = normalizeCourseSource(item ? item.source : null);
    if (source) hints.push(`Source: ${source}`);
    if (hints.length === 0) return "Limited metadata";
    return hints.join(" • ");
  }

  function renderCourseSuggestions(results) {
    window.PocketCaddyRender.renderCourseSuggestions({
      dom: dom,
      results: results,
      escapeHtml: escapeHtml,
      getCourseSuggestionHint: getCourseSuggestionHint
    });
  }

  function setCourseSearchStatus(message) {
    window.PocketCaddyRender.setCourseSearchStatus({
      dom: dom,
      message: message
    });
  }

  function applySelectedCourse(course) {
    if (!course) return;
    state.selectedCourseMetadata = {
      displayName: String(course.displayName || "").trim(),
      locationText: course.locationText ? String(course.locationText) : null,
      lat: Number.isFinite(Number(course.lat)) ? Number(course.lat) : null,
      lng: Number.isFinite(Number(course.lng)) ? Number(course.lng) : null,
      placeId: course.placeId ? String(course.placeId) : null,
      source: course.source ? String(course.source) : null
    };
    if (dom.courseName) dom.courseName.value = state.selectedCourseMetadata.displayName;
    if (dom.courseSearchInput) dom.courseSearchInput.value = state.selectedCourseMetadata.displayName;
    state.courseSearchResults = [];
    renderCourseSuggestions([]);
    setCourseSearchStatus("Course selected. Ready for round setup.");
    renderSelectedCourseCard();
  }

  function clearSelectedCourse(options) {
    const opts = options || {};
    state.selectedCourseMetadata = null;
    if (!opts.keepCourseName && dom.courseName) dom.courseName.value = "";
    if (dom.courseSearchInput) dom.courseSearchInput.value = "";
    if (!opts.keepSuggestions) {
      state.courseSearchResults = [];
      renderCourseSuggestions([]);
    } else if (state.courseSearchResults.length > 0) {
      renderCourseSuggestions(state.courseSearchResults);
    }
    setCourseSearchStatus(typeof opts.statusMessage === "string" ? opts.statusMessage : "");
    renderSelectedCourseCard();
  }

  function renderSelectedCourseCard() {
    window.PocketCaddyRender.renderSelectedCourseCard({
      dom: dom,
      selectedCourseMetadata: state.selectedCourseMetadata,
      normalizeCourseSource: normalizeCourseSource,
      escapeHtml: escapeHtml
    });
  }

  function removeSetupPlayer(localId) {
    state.setupPlayers = state.setupPlayers.filter((p) => p.id !== localId);
    renderSetupPlayers();
  }

  function renderSetupPlayers() {
    window.PocketCaddyRender.renderPlayerList({
      dom: dom,
      setupPlayers: state.setupPlayers,
      maxPlayers: MAX_PLAYERS,
      escapeHtml: escapeHtml,
      onRemoveSetupPlayer: removeSetupPlayer
    });
  }

  function validateCreateInputs() {
    const roundName = dom.roundName.value.trim();
    const courseName = dom.courseName.value.trim();
    const tee = dom.tee.value.trim();
    dom.roundName.value = roundName;
    dom.courseName.value = courseName;
    dom.tee.value = tee;
    const holes = Number(dom.holes.value) === 9 ? 9 : 18;
    if (!roundName) return { error: "Round name is required." };
    if (!courseName) return { error: "Course name is required." };
    if (!state.setupPlayers.length) return { error: "Add at least one player." };
    if (state.setupPlayers.some((p) => !p.name.trim())) return { error: "All players need a name." };
    return {
      roundName: roundName,
      courseName: courseName,
      courseMetadata: state.selectedCourseMetadata ? {
        displayName: state.selectedCourseMetadata.displayName,
        locationText: state.selectedCourseMetadata.locationText,
        lat: state.selectedCourseMetadata.lat,
        lng: state.selectedCourseMetadata.lng,
        placeId: state.selectedCourseMetadata.placeId,
        source: state.selectedCourseMetadata.source
      } : null,
      tee: tee,
      holes: holes,
      players: state.setupPlayers
        .map((p) => p.name.trim())
        .filter((name) => name.length > 0)
    };
  }

  function buildRoundLifecycleDeps() {
    return {
      dom: dom,
      state: state,
      validateCreateInputs: validateCreateInputs,
      createRoundWithPlayers: window.SupabaseAPI.createRoundWithPlayers,
      findRoundByCodeOrLink: window.SupabaseAPI.findRoundByCodeOrLink,
      loadRound: loadRound,
      saveSession: saveSession,
      updateUrlRoundParam: updateUrlRoundParam,
      showView: showView,
      showError: showError,
      getSession: getSession,
      clearLocalSavedSessionState: clearLocalSavedSessionState,
      updateHomeQuickActions: updateHomeQuickActions,
      showFeedback: showFeedback,
      wireEvents: wireEvents,
      ensureRoundHistorySection: ensureRoundHistorySection,
      loadRoundHistoryFromStorage: loadRoundHistoryFromStorage,
      renderSetupPlayers: renderSetupPlayers,
      renderSelectedCourseCard: renderSelectedCourseCard,
      renderCourseSuggestions: renderCourseSuggestions,
      ensureShareActionButtons: ensureShareActionButtons,
      renderRoundHistorySection: renderRoundHistorySection,
      getRoundIdFromUrl: getRoundIdFromUrl
    };
  }

  async function createRound() {
    return window.PocketCaddyRoundLifecycle.createRound(buildRoundLifecycleDeps());




















  }

  async function joinFromInput() {
    return window.PocketCaddyRoundLifecycle.joinRound(buildRoundLifecycleDeps());



  }

  async function loadRound(roundId) {
    stopRealtime();
    resetIntelligenceState({ invalidateRequests: true, resetSelectedHole: true });
    const [round, players, scores, pars] = await Promise.all([
      window.SupabaseAPI.getRoundById(roundId),
      window.SupabaseAPI.getPlayers(roundId),
      window.SupabaseAPI.getScores(roundId),
      window.SupabaseAPI.getRoundHoles(roundId)
    ]);
    if (!round) throw new Error("Round not found.");

    state.round = normalizeRoundCourseMetadata(round);
    if (state.round.pot_amount == null) state.round.pot_amount = 0;
    if (state.round.payout_first == null) state.round.payout_first = 60;
    if (state.round.payout_second == null) state.round.payout_second = 30;
    if (state.round.payout_third == null) state.round.payout_third = 10;
    state.players = players;
    state.scoreMap = buildScoreMap(scores);
    state.parMap = buildParMap(pars, round.holes);
    state.holeDetails = buildHoleDetails(pars, round.holes);
    state.selectedHole = clampHoleSelection(state.selectedHole, round.holes);
    if (state.selectedHole == null && round.holes >= 1) state.selectedHole = 1;
    state.pendingScoreKeys.clear();
    state.pendingParHoles.clear();
    state.pendingHoleDetailHoles.clear();
    state.parSaveTimers.forEach((timerId) => clearTimeout(timerId));
    state.parSaveTimers.clear();
    state.holeDetailSaveTimers.forEach((timerId) => clearTimeout(timerId));
    state.holeDetailSaveTimers.clear();
    state.activeCell = null;
    state.roundCompletion = null;
    state.roundCompletionCandidateAt = null;
    state.roundHistoryDraft = null;
    state.roundHistoryPreparedAt = null;
    state.roundHistoryPersistFingerprint = null;
    state.roundSummaryReplayExpandedPlayerId = null;
    state.roundSummaryExpandedPlayerId = null;
    clearTimeout(state.roundCompleteTransitionTimer);
    dom.scoreView.classList.remove("round-complete-enter");

    applyStoredIdentityOrPrompt();
    renderRound({ scrollToIdentity: true });
    startRealtime(roundId);
  }

  function resetIntelligenceState(options) {
    const opts = options || {};
    if (opts.invalidateRequests) {
      state.courseContextRequestId += 1;
      state.coursePreviewRequestId += 1;
    }
    state.courseIntelContext = null;
    state.courseIntelRoundKey = null;
    state.coursePreviewLoadedUrl = null;
    if (opts.resetSelectedHole) state.selectedHole = null;
  }

  function buildScoreMap(scoreRows) {
    const map = {};
    scoreRows.forEach((row) => {
      map[scoreKey(row.player_id, row.hole)] = row.value;
    });
    return map;
  }

  function normalizeRoundCourseMetadata(round) {
    if (!round) return round;
    const next = { ...round };
    if (!Object.prototype.hasOwnProperty.call(next, "course_place_id")) next.course_place_id = null;
    if (!Object.prototype.hasOwnProperty.call(next, "course_location_text")) next.course_location_text = null;
    if (!Object.prototype.hasOwnProperty.call(next, "course_lat")) next.course_lat = null;
    if (!Object.prototype.hasOwnProperty.call(next, "course_lng")) next.course_lng = null;
    if (!Object.prototype.hasOwnProperty.call(next, "course_source")) next.course_source = null;
    return next;
  }

  function buildParMap(parRows, holes) {
    const map = {};
    for (let hole = 1; hole <= holes; hole += 1) map[hole] = 4;
    (parRows || []).forEach((row) => {
      const hole = Number(row.hole);
      const par = clampPar(row.par);
      if (Number.isInteger(hole) && hole >= 1 && hole <= holes && par != null) {
        map[hole] = par;
      }
    });
    return map;
  }

  function buildHoleDetails(holeRows, holes) {
    const next = {};
    for (let hole = 1; hole <= holes; hole += 1) {
      next[hole] = { distance: null, difficulty: null };
    }
    (holeRows || []).forEach((row) => {
      const hole = Number(row.hole);
      if (!Number.isInteger(hole) || hole < 1 || hole > holes) return;
      const distance = parseDistanceYards(row.distance_yards);
      const difficulty = isValidDifficulty(row.difficulty) ? row.difficulty : null;
      next[hole] = { distance: distance, difficulty: difficulty };
    });
    return next;
  }

  function normalizeHoleDetails(holes, currentMap) {
    const normalized = {};
    const source = currentMap || {};
    for (let hole = 1; hole <= holes; hole += 1) {
      const current = source[hole] || {};
      normalized[hole] = {
        distance: parseDistanceYards(current.distance),
        difficulty: isValidDifficulty(current.difficulty) ? current.difficulty : null
      };
    }
    return normalized;
  }

  function clampHoleSelection(hole, holes) {
    const n = Number(hole);
    if (!Number.isInteger(n) || n < 1 || n > holes) return null;
    return n;
  }

  function isValidDifficulty(value) {
    return value === "easy" || value === "medium" || value === "hard";
  }

  function getHoleDetail(hole) {
    const detail = state.holeDetails[hole] || {};
    const distance = Number.isFinite(Number(detail.distance)) ? Math.round(Number(detail.distance)) : null;
    const difficulty = isValidDifficulty(detail.difficulty) ? detail.difficulty : null;
    return { distance: distance, difficulty: difficulty };
  }

  function getSafeSelectedHole() {
    if (!state.round) return null;
    return clampHoleSelection(state.selectedHole, state.round.holes);
  }

  function displayUnavailableOrValue(value, fallbackValue) {
    const text = String(value == null ? "" : value).trim();
    if (!text) return fallbackValue || INTEL_UNAVAILABLE;
    if (text.toLowerCase() === "nan" || text.toLowerCase() === "undefined" || text.toLowerCase() === "null") {
      return fallbackValue || INTEL_UNAVAILABLE;
    }
    return text;
  }

  function normalizeCourseSource(source) {
    const text = String(source == null ? "" : source).trim();
    if (!text) return null;
    const lower = text.toLowerCase();
    if (lower === "nan" || lower === "undefined" || lower === "null") return null;
    return text;
  }

  function formatHoleDistance(detail) {
    if (!detail || detail.distance == null || !Number.isFinite(Number(detail.distance))) return INTEL_UNAVAILABLE;
    return `${Math.round(Number(detail.distance))} yds`;
  }

  function formatHoleDifficulty(detail) {
    if (!detail || !isValidDifficulty(detail.difficulty)) return INTEL_UNAVAILABLE;
    return capitalize(detail.difficulty);
  }

  function renderHoleIntelligenceStrip() {
    if (!state.round || !dom.holeIntelligenceStrip) return;
    const holes = state.round.holes;
    let html = "";
    for (let hole = 1; hole <= holes; hole += 1) {
      const par = getPar(hole);
      const detail = getHoleDetail(hole);
      const selected = state.selectedHole === hole;
      const pulse = state.selectedHolePulse === hole;
      html += `
        <button
          class="hole-intelligence-tile ${selected ? "active" : ""} ${pulse ? "hole-context-pulse" : ""}"
          type="button"
          data-hole="${hole}"
          role="option"
          aria-selected="${selected ? "true" : "false"}"
          title="Jump to hole ${hole}">
          <div class="hole-intelligence-top">
            <span class="hole-intelligence-hole">H${hole}</span>
            <span class="hole-intelligence-par">${par == null ? "Par Unavailable" : `Par ${par}`}</span>
          </div>
          <div class="hole-intelligence-distance">Distance: ${formatHoleDistance(detail)}</div>
          <div class="hole-intelligence-difficulty ${detail.difficulty || ""}">Difficulty: ${formatHoleDifficulty(detail)}</div>
        </button>
      `;
    }
    dom.holeIntelligenceStrip.innerHTML = html;
  }

  function onHoleIntelligenceClick(event) {
    const tile = event.target.closest(".hole-intelligence-tile");
    if (!tile || !dom.holeIntelligenceStrip.contains(tile) || !state.round) return;
    const hole = Number(tile.getAttribute("data-hole"));
    if (!Number.isInteger(hole) || hole < 1 || hole > state.round.holes) return;
    selectHoleForIntelligence(hole);
  }

  function selectHoleForIntelligence(hole) {
    syncSelectedHole(hole, { scrollTable: true, scrollTile: true, smooth: true });
  }

  function syncSelectedHole(hole, options) {
    if (!state.round) return;
    const opts = options || {};
    const prevHole = state.selectedHole;
    const nextHole = clampHoleSelection(hole, state.round.holes);
    if (!nextHole) return;
    state.selectedHole = nextHole;
    if (prevHole !== nextHole) {
      state.selectedHolePulse = nextHole;
      clearTimeout(state.holePulseTimer);
      state.holePulseTimer = setTimeout(() => {
        state.selectedHolePulse = null;
        if (state.round) {
          renderHoleIntelligenceStrip();
          renderScoreTable();
        }
      }, 320);
    }
    renderHoleIntelligenceStrip();
    renderShotIntelligencePanel();
    renderHoleDetailEditor();
    renderScoreTable();
    if (opts.scrollTable) scrollScoreTableToHole(nextHole, { smooth: opts.smooth, force: opts.forceScroll });
    if (opts.scrollTile) scrollHoleTileIntoView(nextHole);
  }

  function scrollScoreTableToHole(hole, options) {
    if (!dom.scoreScrollContainer || !dom.scoreTable) return;
    const opts = options || {};
    const target = dom.scoreTable.querySelector(`th[data-hole="${hole}"]`);
    if (!target) return;
    const container = dom.scoreScrollContainer;
    const currentLeft = container.scrollLeft;
    const viewportLeft = currentLeft + 18;
    const viewportRight = currentLeft + container.clientWidth - 18;
    const targetLeft = target.offsetLeft;
    const targetRight = targetLeft + target.offsetWidth;
    if (!opts.force && targetLeft >= viewportLeft && targetRight <= viewportRight) return;

    const centered = targetLeft - Math.max(0, (container.clientWidth - target.offsetWidth) / 2);
    const left = Math.max(0, centered);
    const behavior = opts.smooth === false ? "auto" : "smooth";
    try {
      container.scrollTo({ left: left, behavior: behavior });
    } catch (_err) {
      container.scrollLeft = left;
    }
  }

  function scrollHoleTileIntoView(hole) {
    if (!dom.holeIntelligenceStrip) return;
    const tile = dom.holeIntelligenceStrip.querySelector(`.hole-intelligence-tile[data-hole="${hole}"]`);
    if (!tile) return;
    try {
      tile.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
    } catch (_err) {
      tile.scrollIntoView();
    }
  }

  function getSuggestedClub(distance) {
    if (!Number.isFinite(distance)) return "Unavailable";
    if (distance < 110) return "Wedge";
    if (distance <= 140) return "PW / 9 Iron";
    if (distance <= 170) return "8 / 7 Iron";
    if (distance <= 200) return "6 / 5 Iron";
    if (distance <= 230) return "Hybrid";
    return "Fairway / Driver";
  }

  function parseWindMph(windText) {
    const source = displayUnavailableOrValue(windText, INTEL_UNAVAILABLE);
    if (source === INTEL_UNAVAILABLE) return null;
    const match = source.match(/(\d+(?:\.\d+)?)\s*mph/i);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  }

  function ensureShotIntelExtraLines() {
    let shotTypeNode = document.getElementById("shot-intel-shot-type");
    let playStyleNode = document.getElementById("shot-intel-play-style");
    const parent = dom.shotIntelTip ? dom.shotIntelTip.parentElement : null;
    if (!parent) return { shotTypeNode: null, playStyleNode: null };

    if (!shotTypeNode) {
      shotTypeNode = document.createElement("div");
      shotTypeNode.id = "shot-intel-shot-type";
      shotTypeNode.className = "muted tiny";
      parent.appendChild(shotTypeNode);
    }
    if (!playStyleNode) {
      playStyleNode = document.createElement("div");
      playStyleNode.id = "shot-intel-play-style";
      playStyleNode.className = "muted tiny";
      parent.appendChild(playStyleNode);
    }
    return { shotTypeNode: shotTypeNode, playStyleNode: playStyleNode };
  }

  function getDifficultyTone(difficulty) {
    if (!isValidDifficulty(difficulty)) return "neutral";
    if (difficulty === "hard") return "conservative";
    if (difficulty === "easy") return "aggressive";
    return "balanced";
  }

  function getWindAdjustedClub(baseClub, windMph) {
    const base = displayUnavailableOrValue(baseClub, INTEL_UNAVAILABLE);
    if (base === INTEL_UNAVAILABLE || windMph == null) return { club: base, adjusted: false };
    if (windMph <= 5) return { club: base, adjusted: false };
    if (windMph < 15) return { club: base, adjusted: false };

    const ladder = ["Wedge", "PW / 9 Iron", "8 / 7 Iron", "6 / 5 Iron", "Hybrid", "Fairway / Driver"];
    const idx = ladder.indexOf(base);
    if (idx < 0 || idx >= ladder.length - 1) return { club: base, adjusted: false };
    return { club: ladder[idx + 1], adjusted: true };
  }

  function getShotType(distance, par) {
    if (!Number.isFinite(Number(distance)) || !Number.isInteger(par)) return INTEL_UNAVAILABLE;
    const d = Number(distance);
    if ((par === 3 && d >= 120) || (par >= 4 && d >= 170)) return "Tee Shot";
    if (d <= 100) return "Short Game";
    return "Approach";
  }

  function getPlayStyle(distance, difficulty, windMph) {
    const hasDistance = Number.isFinite(Number(distance));
    const tone = getDifficultyTone(difficulty);
    const hasWind = Number.isFinite(Number(windMph));
    if (!hasDistance && tone === "neutral" && !hasWind) return INTEL_UNAVAILABLE;
    if (tone === "conservative") return "Conservative";
    if (tone === "aggressive" && (!hasWind || windMph <= 10) && (!hasDistance || Number(distance) <= 165)) return "Aggressive";
    if (hasWind && windMph >= 15) return "Conservative";
    if (hasDistance && Number(distance) >= 210) return "Conservative";
    if (tone === "aggressive") return "Aggressive";
    return "Balanced";
  }

  function getStrategyNote(distance, par, difficulty, windMph) {
    const hasDistance = Number.isFinite(Number(distance));
    const hasPar = Number.isInteger(par);
    const hasDifficulty = isValidDifficulty(difficulty);
    if (!hasDistance && !hasPar && !hasDifficulty) return `Strategy Note: ${INTEL_UNAVAILABLE}`;

    const tone = getDifficultyTone(difficulty);
    let firstSentence = "Strategy Note: ";
    if (tone === "conservative") firstSentence += "Favor safe placement.";
    else if (tone === "aggressive") firstSentence += "Aggressive line possible.";
    else firstSentence += "Risk/reward hole.";

    let secondSentence = "";
    if (hasDistance && Number(distance) <= 110) secondSentence = "Keep tempo for a scoring look.";
    else if (hasDistance && Number(distance) >= 205) secondSentence = "Commit to your line and avoid trouble.";
    else if (hasPar && par === 5) secondSentence = tone === "aggressive" ? "Consider attacking if lie is clean." : "Build position before attacking.";
    else if (hasPar && par === 3) secondSentence = tone === "conservative" ? "Center-green target is preferred." : "Pin hunt only with the right wind.";

    if (!secondSentence && Number.isFinite(Number(windMph)) && windMph >= 15) {
      secondSentence = "Use controlled ball flight in the wind.";
    }

    if (!secondSentence) return firstSentence;
    return `${firstSentence} ${secondSentence}`;
  }

  function renderShotIntelligencePanel() {
    if (!state.round || !dom.shotIntelHole || !dom.shotIntelWind || !dom.shotIntelClub || !dom.shotIntelWindNote || !dom.shotIntelTip) return;
    const extraLines = ensureShotIntelExtraLines();
    const selectedHole = getSafeSelectedHole();
    if (!selectedHole) {
      dom.shotIntelHole.textContent = "Hole: Unavailable";
      dom.shotIntelWind.textContent = `Wind: ${INTEL_UNAVAILABLE}`;
      dom.shotIntelClub.textContent = `Estimated Club: ${INTEL_UNAVAILABLE}`;
      dom.shotIntelWindNote.textContent = `Wind Note: ${INTEL_UNAVAILABLE}`;
      dom.shotIntelTip.textContent = `Strategy Note: ${INTEL_UNAVAILABLE}`;
      if (extraLines.shotTypeNode) extraLines.shotTypeNode.textContent = `Shot Type: ${INTEL_UNAVAILABLE}`;
      if (extraLines.playStyleNode) extraLines.playStyleNode.textContent = `Play Style: ${INTEL_UNAVAILABLE}`;
      dom.shotIntelWindNote.classList.remove("wind-adjust");
      return;
    }
    const detail = getHoleDetail(selectedHole);
    const distanceLabel = formatHoleDistance(detail);
    const windTextRaw = state.courseIntelContext ? state.courseIntelContext.windText : null;
    const windText = displayUnavailableOrValue(
      windTextRaw && windTextRaw !== INTEL_LOADING ? windTextRaw : INTEL_UNAVAILABLE,
      INTEL_UNAVAILABLE
    );
    const windMph = parseWindMph(windText);
    const hasDistance = detail.distance != null && Number.isFinite(Number(detail.distance));
    const par = getPar(selectedHole);
    const hasPar = Number.isInteger(par);
    const hasDifficulty = isValidDifficulty(detail.difficulty);
    const baseClub = hasDistance ? getSuggestedClub(detail.distance) : INTEL_UNAVAILABLE;
    const windClub = getWindAdjustedClub(baseClub, windMph);
    const difficultyTone = getDifficultyTone(detail.difficulty);
    let clubText = windClub.club;
    if (clubText !== INTEL_UNAVAILABLE && windClub.adjusted) clubText = `${clubText} (Adjusted for wind)`;
    if (clubText !== INTEL_UNAVAILABLE && !windClub.adjusted && difficultyTone === "conservative") clubText = `${clubText} (Safer on hard hole)`;
    if (clubText !== INTEL_UNAVAILABLE && !windClub.adjusted && difficultyTone === "aggressive") clubText = `${clubText} (Attack line available)`;

    let windNote = `Wind Note: ${INTEL_UNAVAILABLE}`;
    if (windMph != null) {
      if (windMph < 8) windNote = "Wind Note: Light wind";
      else if (windMph <= 14) windNote = "Wind Note: Wind present. Verify direction before choosing club.";
      else windNote = "Wind Note: Strong wind. Verify direction and consider extra adjustment.";
    }

    const strategyNote = getStrategyNote(detail.distance, par, detail.difficulty, windMph);
    const shotType = hasDistance && hasPar ? getShotType(detail.distance, par) : INTEL_UNAVAILABLE;
    const playStyle = getPlayStyle(detail.distance, detail.difficulty, windMph);

    dom.shotIntelHole.textContent = `Hole ${selectedHole} - Distance: ${distanceLabel}`;
    dom.shotIntelWind.textContent = `Wind: ${windText}`;
    dom.shotIntelClub.textContent = `Estimated Club: ${clubText}`;
    dom.shotIntelWindNote.textContent = windNote;
    dom.shotIntelTip.textContent = strategyNote;
    if (extraLines.shotTypeNode) extraLines.shotTypeNode.textContent = `Shot Type: ${shotType}`;
    if (extraLines.playStyleNode) extraLines.playStyleNode.textContent = `Play Style: ${playStyle}`;
    dom.shotIntelWindNote.classList.toggle("wind-adjust", windMph != null && windMph >= 15);
  }

  function capitalize(value) {
    const text = String(value || "");
    if (!text) return "";
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
  }

  function renderHoleDetailEditor() {
    if (!state.round || !dom.holeDetailEditorHole || !dom.holeDetailDistanceInput || !dom.holeDetailDifficultySelect || !dom.holeDetailSaveStatus) return;
    const hole = clampHoleSelection(state.selectedHole, state.round.holes) || 1;
    const detail = getHoleDetail(hole);
    const pending = state.pendingHoleDetailHoles.has(hole);
    const distanceValue = detail.distance == null ? "" : String(detail.distance);
    const difficultyValue = detail.difficulty == null ? "" : detail.difficulty;

    dom.holeDetailEditorHole.textContent = `Hole ${hole}`;
    dom.holeDetailDistanceInput.value = distanceValue;
    dom.holeDetailDifficultySelect.value = difficultyValue;
    dom.holeDetailDistanceInput.disabled = pending;
    dom.holeDetailDifficultySelect.disabled = pending;
    if (pending) {
      dom.holeDetailSaveStatus.classList.remove("hidden");
      dom.holeDetailSaveStatus.textContent = "Saving hole details...";
    } else if (dom.holeDetailSaveStatus.textContent === "Saving hole details...") {
      dom.holeDetailSaveStatus.classList.add("hidden");
    }
  }

  function onHoleDetailDistanceInput(event) {
    if (!state.round) return;
    const hole = clampHoleSelection(state.selectedHole, state.round.holes);
    if (!hole || state.pendingHoleDetailHoles.has(hole)) return;
    const parsedDistance = parseDistanceYards(event.target.value);
    const existing = getHoleDetail(hole);
    const nextDetail = {
      distance: parsedDistance,
      difficulty: existing.difficulty
    };
    state.holeDetails[hole] = nextDetail;
    renderHoleIntelligenceStrip();
    renderShotIntelligencePanel();
    queueHoleDetailSave(hole);
  }

  function onHoleDetailDistanceBlur() {
    if (!state.round) return;
    const hole = clampHoleSelection(state.selectedHole, state.round.holes);
    if (!hole) return;
    const detail = getHoleDetail(hole);
    dom.holeDetailDistanceInput.value = detail.distance == null ? "" : String(detail.distance);
  }

  function onHoleDetailDifficultyChanged(event) {
    if (!state.round) return;
    const hole = clampHoleSelection(state.selectedHole, state.round.holes);
    if (!hole || state.pendingHoleDetailHoles.has(hole)) return;
    const selected = isValidDifficulty(event.target.value) ? event.target.value : null;
    const existing = getHoleDetail(hole);
    const nextDetail = {
      distance: existing.distance,
      difficulty: selected
    };
    state.holeDetails[hole] = nextDetail;
    renderHoleIntelligenceStrip();
    renderShotIntelligencePanel();
    queueHoleDetailSave(hole);
  }

  function queueHoleDetailSave(hole) {
    if (!state.round || !Number.isInteger(hole)) return;
    const pendingTimer = state.holeDetailSaveTimers.get(hole);
    if (pendingTimer) clearTimeout(pendingTimer);
    dom.holeDetailSaveStatus.classList.remove("hidden");
    dom.holeDetailSaveStatus.textContent = "Saving hole details...";

    const timerId = setTimeout(async () => {
      state.pendingHoleDetailHoles.add(hole);
      renderHoleDetailEditor();
      try {
        const detail = getHoleDetail(hole);
        const saved = await window.SupabaseAPI.upsertRoundHoleDetails({
          roundId: state.round.id,
          hole: hole,
          par: getPar(hole) || 4,
          distanceYards: detail.distance,
          difficulty: detail.difficulty
        });
        if (!saved) throw new Error("Hole detail columns unavailable");
        dom.holeDetailSaveStatus.textContent = "Hole details saved";
        setTimeout(() => {
          dom.holeDetailSaveStatus.classList.add("hidden");
        }, 900);
      } catch (err) {
        dom.holeDetailSaveStatus.classList.remove("hidden");
        dom.holeDetailSaveStatus.textContent = "Hole detail save failed. Try again.";
        showFeedback("Could not save hole details.", true);
        console.error(err);
      } finally {
        state.pendingHoleDetailHoles.delete(hole);
        state.holeDetailSaveTimers.delete(hole);
        renderHoleDetailEditor();
      }
    }, 320);
    state.holeDetailSaveTimers.set(hole, timerId);
  }

  function scoreKey(playerId, hole) {
    return `${playerId}:${hole}`;
  }

  function getScore(playerId, hole) {
    const v = state.scoreMap[scoreKey(playerId, hole)];
    return Number.isInteger(v) ? v : null;
  }

  function applyStoredIdentityOrPrompt() {
    state.identityName = null;
    state.identityPlayerId = null;
    const key = identityKey(state.round.id);
    const stored = localStorage.getItem(key);
    if (stored) {
      const found = findPlayerByName(stored);
      if (found) {
        state.identityName = found.name;
        state.identityPlayerId = found.id;
      }
    }
    if (!state.identityPlayerId) openNameModal(false);
    else closeNameModal();
  }

  function openNameModal(fromSwitch) {
    dom.nameModal.classList.remove("hidden");
    dom.nameModal.setAttribute("aria-hidden", "false");
    dom.nameModalInput.value = fromSwitch ? (state.identityName || "") : "";
    showError(dom.nameModalError, "");
    setTimeout(() => dom.nameModalInput.focus(), 0);
  }

  function closeNameModal() {
    dom.nameModal.classList.add("hidden");
    dom.nameModal.setAttribute("aria-hidden", "true");
  }

  function findPlayerByName(name) {
    const needle = String(name || "").trim().toLowerCase();
    if (!needle) return null;
    return state.players.find((p) => p.name.trim().toLowerCase() === needle) || null;
  }

  function submitIdentityName() {
    const typed = dom.nameModalInput.value.trim();
    dom.nameModalInput.value = typed;
    const found = findPlayerByName(typed);
    if (!found) {
      showError(dom.nameModalError, "Name not in this round");
      return;
    }
    state.identityName = found.name;
    state.identityPlayerId = found.id;
    localStorage.setItem(identityKey(state.round.id), found.name);
    closeNameModal();
    showFeedback(`Scoring as ${found.name}.`);
    renderRound({ scrollToIdentity: true, forceScroll: true });
  }

  function renderRound(options) {
    if (!state.round) return;
    const opts = options || {};
    dom.metaRoundName.textContent = state.round.name;
    dom.metaCourse.textContent = state.round.course || "-";
    dom.metaTee.textContent = state.round.tee || "-";
    dom.metaHoles.textContent = String(state.round.holes);
    dom.metaPlayerCount.textContent = String(state.players.length);
    dom.metaUserName.textContent = state.identityName || "Select your name";
    dom.roundId.value = state.round.id;

    const link = buildShareLink(state.round.id);
    dom.shareLink.value = link;
    renderQr(link);
    ensureShareActionButtons();
    syncCopyShareButtons();
    updateNativeShareButtonAvailability();

    const showBack = state.round.holes === 18;
    dom.leaderboardBackHead.classList.toggle("hidden", !showBack);

    dom.potAmount.value = formatMoneyInput(state.round.pot_amount);
    dom.payoutFirst.value = formatPercentInput(state.round.payout_first);
    dom.payoutSecond.value = formatPercentInput(state.round.payout_second);
    dom.payoutThird.value = formatPercentInput(state.round.payout_third);
    syncPotSettingsLockState();
    renderPayouts();
    renderCourseIntelligence();
    renderHoleIntelligenceStrip();
    renderShotIntelligencePanel();
    renderHoleDetailEditor();

    const completion = renderRoundCompletionExperience();
    syncRoundShareButtonState();
    renderScoreUxMeta();
    renderParRow();
    renderLeaderboard(completion.standings);
    renderScoreTable(completion.standings);
    maybeShowScoreTooltipOnce();
    if (opts.scrollToIdentity) scheduleScrollToIdentityRow(Boolean(opts.forceScroll));
    const holesTotal = Number(state.round && state.round.holes) === 9 ? 9 : 18;
    persistSessionSnapshot({
      roundId: String(state.round.id),
      roundName: String((state.round && state.round.name) || "").trim(),
      playersCount: Array.isArray(state.players) ? state.players.length : 0,
      holesTotal: holesTotal,
      holesComplete: getThroughHoleCount(holesTotal),
      updatedAt: new Date().toISOString()
    });
  }

  function getCourseIntelRoundKey(round) {
    if (!round) return "no-round";
    const lat = Number(round.course_lat);
    const lng = Number(round.course_lng);
    const latText = Number.isFinite(lat) ? lat.toFixed(6) : "na";
    const lngText = Number.isFinite(lng) ? lng.toFixed(6) : "na";
    const sourceText = normalizeCourseSource(round.course_source) || "na";
    return [
      String(round.id || ""),
      displayUnavailableOrValue(round.course, "-"),
      displayUnavailableOrValue(round.course_location_text, INTEL_UNAVAILABLE),
      latText,
      lngText,
      sourceText
    ].join("|");
  }

  function buildUnavailableCourseContext() {
    return {
      name: "-",
      locationText: INTEL_UNAVAILABLE,
      coordsText: INTEL_UNAVAILABLE,
      mappedDetailText: INTEL_UNAVAILABLE,
      weatherText: INTEL_UNAVAILABLE,
      windText: INTEL_UNAVAILABLE,
      sourceText: null,
      previewUrl: null
    };
  }

  function formatMappedDetailWithSource(mappedDetailText, sourceText) {
    const mapped = displayUnavailableOrValue(mappedDetailText, INTEL_UNAVAILABLE);
    const source = normalizeCourseSource(sourceText);
    if (!source) return mapped;
    if (mapped === INTEL_UNAVAILABLE) return `Source: ${source}`;
    return `Source: ${source} • ${mapped}`;
  }

  function sanitizeCourseIntelContext(context) {
    const raw = context || {};
    const safe = buildUnavailableCourseContext();
    safe.name = displayUnavailableOrValue(raw.name, "-");
    safe.locationText = displayUnavailableOrValue(raw.locationText, INTEL_UNAVAILABLE);
    safe.coordsText = displayUnavailableOrValue(raw.coordsText, INTEL_UNAVAILABLE);
    safe.sourceText = normalizeCourseSource(raw.sourceText);
    safe.mappedDetailText = formatMappedDetailWithSource(raw.mappedDetailText, safe.sourceText);
    safe.weatherText = displayUnavailableOrValue(raw.weatherText, INTEL_UNAVAILABLE);
    safe.windText = displayUnavailableOrValue(raw.windText, INTEL_UNAVAILABLE);
    safe.previewUrl = isValidPreviewUrl(raw.previewUrl) ? raw.previewUrl : null;
    return safe;
  }

  async function getCourseContext() {
    if (!state.round) {
      return buildUnavailableCourseContext();
    }
    const round = state.round;
    const name = displayUnavailableOrValue(round.course, "-");
    const locationText = displayUnavailableOrValue(round.course_location_text, INTEL_UNAVAILABLE);
    const sourceText = normalizeCourseSource(round.course_source);
    const lat = Number(round.course_lat);
    const lng = Number(round.course_lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const coordsText = hasCoords ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : INTEL_UNAVAILABLE;
    const previewUrl = hasCoords ? buildCoursePreviewUrl(lat, lng) : null;

    if (!hasCoords) {
      return sanitizeCourseIntelContext({
        name: name,
        locationText: locationText,
        coordsText: coordsText,
        mappedDetailText: INTEL_UNAVAILABLE,
        weatherText: INTEL_UNAVAILABLE,
        windText: INTEL_UNAVAILABLE,
        sourceText: sourceText,
        previewUrl: previewUrl
      });
    }

    const [weather, enrichment] = await Promise.all([
      fetchCourseWeather(lat, lng),
      fetchCourseEnrichment(lat, lng)
    ]);
    return sanitizeCourseIntelContext({
      name: name,
      locationText: locationText,
      coordsText: coordsText,
      mappedDetailText: summarizeMappedDetail(enrichment),
      weatherText: weather.temperatureText || INTEL_UNAVAILABLE,
      windText: weather.windText || INTEL_UNAVAILABLE,
      sourceText: sourceText,
      previewUrl: previewUrl
    });
  }

  async function fetchCourseEnrichment(lat, lng) {
    try {
      if (!window.SupabaseAPI || typeof window.SupabaseAPI.getCourseEnrichment !== "function") return null;
      return await window.SupabaseAPI.getCourseEnrichment(lat, lng);
    } catch (_err) {
      return null;
    }
  }

  function summarizeMappedDetail(enrichment) {
    if (!enrichment || !enrichment.hasMappedDetail) return INTEL_UNAVAILABLE;
    const hasGreens = Number(enrichment.greenCount || 0) > 0;
    const hasHazards = Number(enrichment.bunkerCount || 0) > 0;
    const hasTees = Number(enrichment.teeCount || 0) > 0;
    const hasFairways = Number(enrichment.fairwayCount || 0) > 0;
    if (hasGreens && hasHazards) return "Mapped detail: Greens and hazards available";
    if (hasGreens || hasHazards || hasTees || hasFairways) return "Mapped detail: Limited course mapping";
    return INTEL_UNAVAILABLE;
  }

  function buildCoursePreviewUrl(lat, lng) {
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${encodeURIComponent(`${lat},${lng}`)}&zoom=12&size=640x240&markers=${encodeURIComponent(`${lat},${lng},red-pushpin`)}`;
  }

  function isValidPreviewUrl(url) {
    if (!url || typeof url !== "string") return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (_err) {
      return false;
    }
  }

  function showCoursePreviewFallback() {
    if (!dom.courseIntelPreview || !dom.courseIntelPreviewFallback) return;
    dom.courseIntelPreview.onload = null;
    dom.courseIntelPreview.onerror = null;
    dom.courseIntelPreview.classList.add("hidden");
    dom.courseIntelPreview.removeAttribute("src");
    dom.courseIntelPreviewFallback.classList.remove("hidden");
    dom.courseIntelPreviewFallback.textContent = "No course preview available";
    state.coursePreviewLoadedUrl = null;
  }

  function renderCoursePreviewImage(previewUrl) {
    if (!dom.courseIntelPreview || !dom.courseIntelPreviewFallback) return;
    if (!isValidPreviewUrl(previewUrl)) {
      state.coursePreviewRequestId += 1;
      showCoursePreviewFallback();
      return;
    }

    if (state.coursePreviewLoadedUrl === previewUrl && dom.courseIntelPreview.getAttribute("src") === previewUrl) {
      dom.courseIntelPreview.classList.remove("hidden");
      dom.courseIntelPreviewFallback.classList.add("hidden");
      return;
    }

    const requestId = state.coursePreviewRequestId + 1;
    state.coursePreviewRequestId = requestId;
    dom.courseIntelPreview.onload = null;
    dom.courseIntelPreview.onerror = null;
    dom.courseIntelPreview.classList.add("hidden");
    dom.courseIntelPreviewFallback.classList.add("hidden");

    const loader = new Image();
    loader.decoding = "async";
    loader.onload = function onPreviewLoad() {
      if (requestId !== state.coursePreviewRequestId) return;
      dom.courseIntelPreview.onload = null;
      dom.courseIntelPreview.onerror = function onDisplayedPreviewError() {
        dom.courseIntelPreview.onerror = null;
        if (requestId !== state.coursePreviewRequestId) return;
        showCoursePreviewFallback();
      };
      dom.courseIntelPreview.src = previewUrl;
      dom.courseIntelPreview.classList.remove("hidden");
      dom.courseIntelPreviewFallback.classList.add("hidden");
      state.coursePreviewLoadedUrl = previewUrl;
    };
    loader.onerror = function onPreviewError() {
      if (requestId !== state.coursePreviewRequestId) return;
      showCoursePreviewFallback();
    };
    loader.src = previewUrl;
  }

  function unavailableWeatherContext() {
    return {
      temperatureText: INTEL_UNAVAILABLE,
      windText: INTEL_UNAVAILABLE
    };
  }

  function parseValidatedWeather(currentWeather) {
    if (!currentWeather || typeof currentWeather !== "object") return null;
    const temperature = Number(currentWeather.temperature);
    const windspeed = Number(currentWeather.windspeed);
    if (!Number.isFinite(temperature) || !Number.isFinite(windspeed)) return null;
    return {
      temperature: temperature,
      windspeed: windspeed
    };
  }

  async function fetchCourseWeather(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return unavailableWeatherContext();
    let timeoutId = null;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(lat));
      url.searchParams.set("longitude", String(lng));
      url.searchParams.set("current_weather", "true");
      url.searchParams.set("temperature_unit", "fahrenheit");
      url.searchParams.set("windspeed_unit", "mph");
      timeoutId = setTimeout(() => {
        if (controller) controller.abort();
      }, WEATHER_FETCH_TIMEOUT_MS);
      const response = await fetch(url.toString(), {
        method: "GET",
        signal: controller ? controller.signal : undefined
      });
      if (!response.ok) throw new Error("Weather request failed");
      const data = await response.json();
      const current = data && data.current_weather ? data.current_weather : null;
      const parsed = parseValidatedWeather(current);
      if (!parsed) return unavailableWeatherContext();
      return {
        temperatureText: `${Math.round(parsed.temperature)}F`,
        windText: `${Math.round(parsed.windspeed)} mph`
      };
    } catch (_err) {
      return unavailableWeatherContext();
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  function renderCourseIntelligenceCard(context) {
    if (!dom.courseIntelCard) return;
    const safeContext = sanitizeCourseIntelContext(context);
    state.courseIntelContext = safeContext;
    dom.courseIntelCard.classList.remove("hidden");
    dom.courseIntelName.textContent = safeContext.name;
    dom.courseIntelLocation.textContent = safeContext.locationText;
    dom.courseIntelCoords.textContent = safeContext.coordsText;
    if (dom.courseIntelMapped) dom.courseIntelMapped.textContent = safeContext.mappedDetailText;
    dom.courseIntelWeather.textContent = safeContext.weatherText;
    dom.courseIntelWind.textContent = safeContext.windText;

    renderCoursePreviewImage(safeContext.previewUrl);
    renderShotIntelligencePanel();
  }

  async function renderCourseIntelligence() {
    if (!dom.courseIntelCard) return;
    const roundKey = getCourseIntelRoundKey(state.round);
    if (state.courseIntelContext && state.courseIntelRoundKey === roundKey) {
      renderCourseIntelligenceCard(state.courseIntelContext);
      return;
    }
    const hasCoords = state.round && Number.isFinite(Number(state.round.course_lat)) && Number.isFinite(Number(state.round.course_lng));
    const requestId = (state.courseContextRequestId || 0) + 1;
    state.courseContextRequestId = requestId;
    state.courseIntelRoundKey = roundKey;
    renderCourseIntelligenceCard({
      name: state.round && state.round.course ? state.round.course : "-",
      locationText: state.round && state.round.course_location_text ? state.round.course_location_text : INTEL_UNAVAILABLE,
      coordsText: hasCoords
        ? `${Number(state.round.course_lat).toFixed(4)}, ${Number(state.round.course_lng).toFixed(4)}`
        : INTEL_UNAVAILABLE,
      mappedDetailText: INTEL_UNAVAILABLE,
      weatherText: hasCoords ? INTEL_LOADING : INTEL_UNAVAILABLE,
      windText: hasCoords ? INTEL_LOADING : INTEL_UNAVAILABLE,
      sourceText: state.round ? normalizeCourseSource(state.round.course_source) : null,
      previewUrl: hasCoords
        ? buildCoursePreviewUrl(Number(state.round.course_lat), Number(state.round.course_lng))
        : null
    });
    const context = await getCourseContext();
    if (requestId !== state.courseContextRequestId) return;
    renderCourseIntelligenceCard(context);
  }

  function renderScoreUxMeta() {
    if (!dom.scoreHint) return;
    const selectedHole = getSafeSelectedHole();
    const selectedText = selectedHole ? ` (Hole ${selectedHole})` : "";
    const completion = state.roundCompletion || buildRoundCompletionState();
    dom.scoreHint.textContent = completion.isComplete
      ? `Round complete. Tap a hole to edit if needed${selectedText}`
      : `Tap a hole to enter score${selectedText}`;
    dom.scoreHint.classList.add("score-entry-hint");
    const scoreSection = dom.scoreScrollContainer && dom.scoreScrollContainer.closest("section");
    if (!scoreSection) return;

    let summary = document.getElementById("score-summary-bar");
    if (!summary) {
      summary = document.createElement("div");
      summary.id = "score-summary-bar";
      summary.className = "score-summary-bar hidden";
      scoreSection.insertBefore(summary, dom.scoreHint);
    }

    const standings = Array.isArray(completion.standings) && completion.standings.length
      ? completion.standings
      : buildStandings();
    let target = null;
    if (state.identityPlayerId) {
      target = standings.find((r) => String(r.id) === String(state.identityPlayerId)) || null;
    }
    if (!target && standings.length) target = standings.find((r) => r.total != null) || standings[0];

    if (!target || target.total == null) {
      summary.classList.add("hidden");
      summary.textContent = "";
      return;
    }
    const birdies = countBirdies(target.id);
    summary.textContent = completion.isComplete
      ? `Final: ${target.name} ${formatRelativeToPar(target.relative)} (${target.total} strokes, Birdies: ${birdies})`
      : `${target.name}: ${formatRelativeToPar(target.relative)} (Birdies: ${birdies})`;
    summary.classList.remove("hidden");
  }

  function maybeShowScoreTooltipOnce() {
    if (!state.round || !dom.scoreScrollContainer) return;
    const key = `pocketcaddy_score_tooltip_seen_${state.round.id}`;
    if (sessionStorage.getItem(key)) return;
    const scoreSection = dom.scoreScrollContainer.closest("section");
    if (!scoreSection) return;
    scoreSection.style.position = "relative";
    let tip = document.getElementById("score-entry-tooltip");
    if (!tip) {
      tip = document.createElement("div");
      tip.id = "score-entry-tooltip";
      tip.className = "score-entry-tooltip";
      tip.textContent = "Tap any hole cell to open the score picker";
      scoreSection.appendChild(tip);
    }
    tip.classList.add("show");
    sessionStorage.setItem(key, "1");
    setTimeout(() => {
      tip.classList.remove("show");
    }, 3600);
  }

  function renderParRow() {
    window.PocketCaddyRender.renderParRow({
      state: state,
      dom: dom,
      getPar: getPar
    });
  }

  function onParInputChanged(event) {
    const input = event.target;
    if (!input.classList.contains("par-input") || !state.round) return;
    const hole = Number(input.getAttribute("data-hole"));
    if (!Number.isInteger(hole) || hole < 1 || hole > state.round.holes) return;
    const nextPar = clampPar(input.value);
    if (nextPar == null) {
      input.value = String(getPar(hole) || 4);
      return;
    }
    state.parMap[hole] = nextPar;
    renderHoleIntelligenceStrip();
    const completion = renderRoundCompletionExperience();
    renderLeaderboard(completion.standings);
    renderScoreTable(completion.standings);
    queueParSave(hole, nextPar);
  }

  function onParInputBlur(event) {
    const input = event.target;
    if (!input.classList.contains("par-input") || !state.round) return;
    const hole = Number(input.getAttribute("data-hole"));
    if (!Number.isInteger(hole)) return;
    input.value = String(getPar(hole) || 4);
  }

  function queueParSave(hole, par) {
    if (!state.round) return;
    const pendingTimer = state.parSaveTimers.get(hole);
    if (pendingTimer) clearTimeout(pendingTimer);
    dom.parSaveStatus.classList.remove("hidden");
    dom.parSaveStatus.textContent = "Saving par settings...";
    const timerId = setTimeout(async () => {
      state.pendingParHoles.add(hole);
      renderParRow();
      try {
        await window.SupabaseAPI.upsertRoundHolePar({
          roundId: state.round.id,
          hole: hole,
          par: par
        });
        dom.parSaveStatus.textContent = "Par saved";
        setTimeout(() => {
          dom.parSaveStatus.classList.add("hidden");
        }, 900);
      } catch (err) {
        dom.parSaveStatus.classList.remove("hidden");
        dom.parSaveStatus.textContent = "Par save failed. Try again.";
        showFeedback("Could not save par settings.", true);
        console.error(err);
      } finally {
        state.pendingParHoles.delete(hole);
        state.parSaveTimers.delete(hole);
        renderParRow();
      }
    }, 300);
    state.parSaveTimers.set(hole, timerId);
  }

  function renderQr(link) {
    dom.qrBox.innerHTML = "";
    try {
      if (!window.LocalQR || typeof window.LocalQR.render !== "function") {
        throw new Error("LocalQR renderer missing");
      }
      window.LocalQR.render(dom.qrBox, link, { modules: 33, scale: 4, quietZone: 2 });
      if (!dom.qrBox.firstChild) {
        throw new Error("QR output empty");
      }
    } catch (_err) {
      const fallback = document.createElement("div");
      fallback.className = "qr-fallback";
      fallback.textContent = link;
      dom.qrBox.appendChild(fallback);
    }
  }

  function buildShareLink(roundId) {
    const url = new URL(window.location.href);
    url.searchParams.set("round", roundId);
    return url.toString();
  }

  function getRoundIdFromUrl() {
    const url = new URL(window.location.href);
    const round = url.searchParams.get("round");
    if (!round) return null;
    return window.SupabaseAPI.extractRoundId(round);
  }

  function updateUrlRoundParam(roundId) {
    const url = new URL(window.location.href);
    url.searchParams.set("round", roundId);
    window.history.replaceState({}, "", url.toString());
  }

  function clearUrlRoundParam() {
    const url = new URL(window.location.href);
    url.searchParams.delete("round");
    window.history.replaceState({}, "", url.toString());
  }

  function getTotals(playerId) {
    const holes = state.round.holes;
    const front = sumRange(playerId, 1, Math.min(9, holes));
    const back = holes === 18 ? sumRange(playerId, 10, 18) : null;
    const total = holes === 18 ? sumNullable(front, back) : front;
    return { front: front, back: back, total: total };
  }

  function getRelativeToParTotals(playerId) {
    const holes = state.round.holes;
    let totalDelta = 0;
    let has = false;
    for (let h = 1; h <= holes; h += 1) {
      const score = getScore(playerId, h);
      const delta = getScoreDelta(score, h);
      if (delta == null) continue;
      totalDelta += delta;
      has = true;
    }
    return has ? totalDelta : null;
  }

  function countBirdies(playerId) {
    const holes = state.round ? state.round.holes : 0;
    let count = 0;
    for (let h = 1; h <= holes; h += 1) {
      const term = getGolfTerm(getScore(playerId, h), getPar(h));
      if (term === "Birdie" || term === "Eagle" || term === "Albatross" || term === "Ace") count += 1;
    }
    return count;
  }

  function sumRange(playerId, from, to) {
    let sum = 0;
    let has = false;
    for (let h = from; h <= to; h += 1) {
      const v = getScore(playerId, h);
      if (Number.isInteger(v)) {
        sum += v;
        has = true;
      }
    }
    return has ? sum : null;
  }

  function sumNullable(a, b) {
    if (a == null && b == null) return null;
    return (a || 0) + (b || 0);
  }

  function buildStandings() {
    const rows = state.players.map((p) => {
      const t = getTotals(p.id);
      const relative = getRelativeToParTotals(p.id);
      return { id: p.id, name: p.name, front: t.front, back: t.back, total: t.total, relative: relative };
    });

    rows.sort((a, b) => {
      const av = a.total == null ? Number.POSITIVE_INFINITY : a.total;
      const bv = b.total == null ? Number.POSITIVE_INFINITY : b.total;
      if (av !== bv) return av - bv;
      return a.name.localeCompare(b.name);
    });

    const played = rows.filter((r) => r.total != null);
    const rankMap = new Map();
    for (let i = 0; i < played.length; i += 1) {
      const score = played[i].total;
      if (!rankMap.has(score)) rankMap.set(score, { pos: i + 1, count: 1 });
      else rankMap.get(score).count += 1;
    }

    rows.forEach((r) => {
      if (r.total == null) r.rank = "-";
      else {
        const info = rankMap.get(r.total);
        r.rank = info.count > 1 ? `T${info.pos}` : String(info.pos);
      }
    });

    const leadScore = played.length ? played[0].total : null;
    rows.forEach((r) => {
      r.isLeader = leadScore != null && r.total === leadScore;
    });

    return rows;
  }

  function parseRankPosition(rankValue) {
    if (rankValue == null) return null;
    const text = String(rankValue).trim();
    if (!text || text === "-") return null;
    const normalized = text.startsWith("T") ? text.slice(1) : text;
    const parsed = Number(normalized);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  function parseRankLabel(rankValue) {
    const pos = parseRankPosition(rankValue);
    if (!pos) return "-";
    if (pos === 1) return "1st";
    if (pos === 2) return "2nd";
    if (pos === 3) return "3rd";
    return `${pos}th`;
  }

  function buildCompetitiveTags(standings, playerInsightsById) {
    const tags = [];
    const played = (Array.isArray(standings) ? standings : []).filter((row) => row.total != null);
    if (played.length < 2) return tags;

    const first = played[0];
    const second = played[1];
    const margin = Math.max(0, Number(second.total) - Number(first.total));

    if (margin <= CLOSE_FINISH_MARGIN) {
      tags.push({
        key: "closest-finish",
        label: "Closest Finish",
        detail: margin === 0 ? "Tie at the top." : `${margin} stroke${margin === 1 ? "" : "s"} between 1st and 2nd.`
      });
    } else if (margin >= BLOWOUT_MARGIN) {
      tags.push({
        key: "blowout",
        label: "Blowout",
        detail: `${margin} stroke lead over 2nd place.`
      });
    }

    let comebackCandidate = null;
    for (const row of played) {
      if (row.front == null || row.back == null) continue;
      const insight = playerInsightsById ? playerInsightsById[String(row.id)] : null;
      if (!insight || !insight.front || !insight.back) continue;
      if (insight.front.relativeToPar == null || insight.back.relativeToPar == null) continue;
      const swing = Number(insight.front.relativeToPar) - Number(insight.back.relativeToPar);
      if (!Number.isFinite(swing) || swing < BACK_NINE_COMEBACK_SWING) continue;
      const rankPos = parseRankPosition(row.rank);
      if (rankPos == null || rankPos > 3) continue;
      if (!comebackCandidate || swing > comebackCandidate.swing) {
        comebackCandidate = { name: row.name, swing: swing };
      }
    }
    if (comebackCandidate) {
      tags.push({
        key: "back-nine-comeback",
        label: "Back Nine Comeback",
        detail: `${comebackCandidate.name} gained ${formatDecimal(comebackCandidate.swing, 1)} vs par on the back nine.`
      });
    }

    return tags;
  }

  function buildRoundCompletionState(standings) {
    if (!state.round) {
      return {
        isComplete: false,
        holes: 0,
        playersCount: 0,
        totalRequiredScores: 0,
        enteredScores: 0,
        missingScores: 0,
        pendingScoreCount: state.pendingScoreKeys.size,
        standings: [],
        leaders: [],
        playerInsightsById: {},
        highlights: null
      };
    }
    const holes = Number(state.round.holes) || 0;
    const players = Array.isArray(state.players) ? state.players : [];
    const totalRequiredScores = players.length * holes;
    let enteredScores = 0;
    let missingScores = 0;
    const playerInsightsById = {};
    const holeAverages = {};
    let bestRoundMoment = null;
    for (let hole = 1; hole <= holes; hole += 1) {
      holeAverages[hole] = { sum: 0, count: 0, deltaSum: 0, deltaCount: 0 };
    }
    for (const player of players) {
      const insight = {
        bestHole: null,
        worstHole: null,
        averageRelativeToPar: null,
        birdies: 0,
        eagles: 0,
        pars: 0,
        bogeysPlus: 0,
        front: { relativeToPar: null, count: 0 },
        back: { relativeToPar: null, count: 0 },
        consistency: null
      };
      let deltaSum = 0;
      let deltaCount = 0;
      let bestDelta = null;
      let worstDelta = null;
      let frontDeltaSum = 0;
      let frontDeltaCount = 0;
      let backDeltaSum = 0;
      let backDeltaCount = 0;
      let consistencyDeltaAbsSum = 0;
      let consistencyCount = 0;
      for (let hole = 1; hole <= holes; hole += 1) {
        const score = getScore(player.id, hole);
        if (!Number.isInteger(score)) {
          missingScores += 1;
          continue;
        }
        enteredScores += 1;
        const holeAgg = holeAverages[hole];
        holeAgg.sum += score;
        holeAgg.count += 1;
        const par = getPar(hole);
        const delta = getScoreDelta(score, hole);
        if (delta != null) {
          deltaSum += delta;
          deltaCount += 1;
          consistencyDeltaAbsSum += Math.abs(delta);
          consistencyCount += 1;
          holeAgg.deltaSum += delta;
          holeAgg.deltaCount += 1;
          if (bestDelta == null || delta < bestDelta) {
            bestDelta = delta;
            insight.bestHole = { hole: hole, delta: delta, score: score };
          }
          if (worstDelta == null || delta > worstDelta) {
            worstDelta = delta;
            insight.worstHole = { hole: hole, delta: delta, score: score };
          }
          if (hole <= 9) {
            frontDeltaSum += delta;
            frontDeltaCount += 1;
          } else {
            backDeltaSum += delta;
            backDeltaCount += 1;
          }
        }
        const term = getGolfTerm(score, par);
        if (term === "Birdie") insight.birdies += 1;
        if (term === "Par") insight.pars += 1;
        if (term === "Ace" || term === "Albatross" || term === "Eagle") insight.eagles += 1;
        if (delta != null && delta >= 1) insight.bogeysPlus += 1;
        if (!bestRoundMoment || score < bestRoundMoment.score) {
          bestRoundMoment = {
            playerId: player.id,
            playerName: player.name,
            hole: hole,
            score: score,
            delta: delta
          };
        }
      }
      insight.averageRelativeToPar = deltaCount > 0 ? (deltaSum / deltaCount) : null;
      insight.front.relativeToPar = frontDeltaCount > 0 ? (frontDeltaSum / frontDeltaCount) : null;
      insight.front.count = frontDeltaCount;
      insight.back.relativeToPar = backDeltaCount > 0 ? (backDeltaSum / backDeltaCount) : null;
      insight.back.count = backDeltaCount;
      insight.consistency = consistencyCount > 0 ? (consistencyDeltaAbsSum / consistencyCount) : null;
      playerInsightsById[String(player.id)] = insight;
    }
    let toughestHole = null;
    for (let hole = 1; hole <= holes; hole += 1) {
      const agg = holeAverages[hole];
      if (!agg || agg.count === 0) continue;
      const avgScore = agg.sum / agg.count;
      if (!toughestHole || avgScore > toughestHole.averageScore) {
        toughestHole = {
          hole: hole,
          averageScore: avgScore,
          averageDelta: agg.deltaCount > 0 ? (agg.deltaSum / agg.deltaCount) : null,
          sampleSize: agg.count
        };
      }
    }
    const safeStandings = Array.isArray(standings) ? standings : buildStandings();
    const leaders = safeStandings.filter((row) => row.isLeader && row.total != null);
    const topThree = safeStandings.filter((row) => row.total != null).slice(0, 3).map((row) => ({
      id: row.id,
      name: row.name,
      rank: row.rank,
      total: row.total,
      relative: row.relative
    }));
    const winnerNames = leaders.map((row) => row.name);
    const winnerLabel = leaders.length > 1 ? "Winners (Tie)" : "Winner";
    const competitiveTags = buildCompetitiveTags(safeStandings, playerInsightsById);
    const isComplete = holes > 0 && players.length > 0 && missingScores === 0 && state.pendingScoreKeys.size === 0;
    return {
      isComplete: isComplete,
      holes: holes,
      playersCount: players.length,
      totalRequiredScores: totalRequiredScores,
      enteredScores: enteredScores,
      missingScores: missingScores,
      pendingScoreCount: state.pendingScoreKeys.size,
      standings: safeStandings,
      leaders: leaders,
      winnerLabel: winnerLabel,
      winnerNames: winnerNames,
      topThree: topThree,
      competitiveTags: competitiveTags,
      playerInsightsById: playerInsightsById,
      highlights: {
        bestRoundMoment: bestRoundMoment,
        toughestHole: toughestHole
      }
    };
  }

  function applyRoundCompletionVisualState(completion) {
    if (!dom.scoreView) return;
    dom.scoreView.classList.toggle("round-complete", Boolean(completion && completion.isComplete));
    dom.scoreView.setAttribute("data-round-state", completion && completion.isComplete ? "complete" : "active");
    const scoreSection = dom.scoreScrollContainer && dom.scoreScrollContainer.closest("section");
    if (scoreSection) scoreSection.classList.toggle("round-locked-visual", Boolean(completion && completion.isComplete));
  }

  function ensureShareReadyNoteNode() {
    const existing = document.getElementById("share-ready-note");
    if (existing) return existing;
    const shareWrap = dom.shareLink && dom.shareLink.closest(".share-wrap");
    if (!shareWrap) return null;
    const note = document.createElement("p");
    note.id = "share-ready-note";
    note.className = "share-ready-note";
    shareWrap.appendChild(note);
    return note;
  }

  function renderShareReadyState(completion) {
    const note = ensureShareReadyNoteNode();
    if (!note) return;
    if (completion && completion.isComplete) {
      note.classList.add("complete");
      if (typeof navigator.share === "function") {
        note.textContent = "Round complete. Share Results opens your device share sheet.";
      } else if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        note.textContent = "Round complete. Share Results downloads an image and copies a summary.";
      } else {
        note.textContent = "Round complete. Share Results downloads a results image.";
      }
      return;
    }
    note.classList.remove("complete");
    note.textContent = "Round in progress. Finish all holes to enable final sharing.";
  }

  function ensureLeaderboardStateBadge() {
    const section = dom.leaderboardBody && dom.leaderboardBody.closest("section");
    if (!section) return null;
    const heading = section.querySelector("h3");
    if (!heading) return null;
    let badge = heading.querySelector(".leaderboard-state-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "leaderboard-state-badge";
      heading.appendChild(badge);
    }
    return badge;
  }

  function renderLeaderboardStateBadge(completion) {
    const badge = ensureLeaderboardStateBadge();
    if (!badge) return;
    badge.classList.toggle("complete", Boolean(completion && completion.isComplete));
    badge.textContent = completion && completion.isComplete ? "Final" : "Live";
  }

  function ensureRoundSummaryPanel() {
    const section = dom.leaderboardBody && dom.leaderboardBody.closest("section");
    if (!section) return null;
    let panel = section.querySelector("#round-summary-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "round-summary-panel";
      panel.className = "round-summary-panel pending";
      const leaderboardScroll = section.querySelector(".leaderboard-scroll");
      if (leaderboardScroll) section.insertBefore(panel, leaderboardScroll);
      else section.appendChild(panel);
    }
    return panel;
  }

  function ensureRoundShareCardPanel() {
    const section = dom.leaderboardBody && dom.leaderboardBody.closest("section");
    if (!section) return null;
    const summaryPanel = ensureRoundSummaryPanel();
    let shareCard = section.querySelector("#round-share-card");
    if (!shareCard) {
      shareCard = document.createElement("div");
      shareCard.id = "round-share-card";
      shareCard.className = "round-share-card hidden";
    }
    if (summaryPanel && summaryPanel.nextSibling !== shareCard) {
      summaryPanel.insertAdjacentElement("afterend", shareCard);
    } else if (!summaryPanel && !section.contains(shareCard)) {
      section.appendChild(shareCard);
    }
    return shareCard;
  }

  function getRoundCourseSubtitle() {
    if (!state.round) return "-";
    const parts = [];
    const roundName = String(state.round.name || "").trim();
    const courseName = String(state.round.course || "").trim();
    if (roundName) parts.push(roundName);
    if (courseName) parts.push(courseName);
    if (!parts.length) return "-";
    return parts.join(" • ");
  }

  function renderRoundShareCard(completion) {
    const shareCard = ensureRoundShareCardPanel();
    if (!shareCard) return;
    if (!completion || !completion.isComplete) {
      shareCard.classList.add("hidden");
      shareCard.innerHTML = "";
      return;
    }
    const winnerText = (completion.winnerNames || []).length
      ? completion.winnerNames.map((name) => escapeHtml(name)).join(", ")
      : "-";
    const topThree = Array.isArray(completion.topThree) ? completion.topThree.slice(0, 3) : [];
    const topThreeMarkup = topThree.map((row) => {
      return `
        <li class="round-share-standings-row">
          <span class="round-share-rank">${escapeHtml(parseRankLabel(row.rank))}</span>
          <span class="round-share-name">${escapeHtml(row.name)}</span>
          <span class="round-share-total">${display(row.total)}</span>
        </li>
      `;
    }).join("");
    shareCard.classList.remove("hidden");
    shareCard.innerHTML = `
      <div class="round-share-card-head">
        <p class="round-share-kicker">Shareable Round Card</p>
        <p class="round-share-title">${escapeHtml(getRoundCourseSubtitle())}</p>
      </div>
      <div class="round-share-winner">
        <span class="round-share-winner-label">${escapeHtml(completion.winnerLabel || "Winner")}</span>
        <strong class="round-share-winner-name">🏆 ${winnerText}</strong>
      </div>
      <div class="round-share-top3">
        <p class="round-share-top3-label">Top 3 Standings</p>
        <ol class="round-share-standings">${topThreeMarkup || "<li class=\"round-share-standings-row\"><span class=\"round-share-name\">No final standings</span></li>"}</ol>
      </div>
      <div class="round-share-actions">
        <button type="button" class="btn btn-secondary round-share-btn" data-action="share-round">Share Results</button>
        <button type="button" class="btn btn-secondary round-save-image-btn" data-action="save-share-image">Save Image</button>
        <button type="button" class="btn btn-primary round-rematch-btn" data-action="start-rematch">Start Rematch</button>
      </div>
    `;
  }

  function buildRoundSummaryPanelMarkup(completion, options) {
    const opts = options || {};
    if (!completion || !completion.isComplete) {
      return `
        <div class="round-summary-head">
          <p class="round-summary-kicker">Round Status</p>
          <p class="round-summary-title">Round in progress</p>
          <p class="round-summary-meta">${completion ? `${completion.enteredScores}/${completion.totalRequiredScores} scores entered` : "-"}</p>
        </div>
      `;
    }
    const leaders = Array.isArray(completion.leaders) ? completion.leaders : [];
    const tie = leaders.length > 1;
    const winnerLabel = completion.winnerLabel || (tie ? "Winners (Tie)" : "Winner");
    const winnerNames = (completion.winnerNames || leaders.map((row) => row.name))
      .map((name) => escapeHtml(name))
      .join(", ");
    const competitiveTags = Array.isArray(completion.competitiveTags) ? completion.competitiveTags : [];
    const competitiveTagMarkup = competitiveTags.map((tag) => {
      return `<span class="competitive-tag" title="${escapeHtml(tag.detail || "")}">${escapeHtml(tag.label)}</span>`;
    }).join("");
    const expandedPlayerId = opts.expandedPlayerId == null ? null : String(opts.expandedPlayerId);
    const insightsById = completion.playerInsightsById || {};
    const highlights = completion.highlights || {};
    const bestMoment = highlights.bestRoundMoment;
    const bestMomentText = bestMoment
      ? `${escapeHtml(bestMoment.playerName)} • H${bestMoment.hole} • ${bestMoment.score}${bestMoment.delta == null ? "" : ` (${formatRelativeToPar(bestMoment.delta)})`}`
      : "-";
    const toughestHole = highlights.toughestHole;
    const toughestHoleText = toughestHole
      ? `H${toughestHole.hole} • Avg ${formatDecimal(toughestHole.averageScore, 1)}${toughestHole.averageDelta == null ? "" : ` (${formatSignedDecimal(toughestHole.averageDelta, 1)})`}`
      : "-";
    const standings = Array.isArray(completion.standings) ? completion.standings : [];
    const standingsMarkup = standings.map((row) => {
      const isWinner = leaders.some((leader) => String(leader.id) === String(row.id));
      const insight = insightsById[String(row.id)] || {};
      const bestHoleText = insight.bestHole ? `H${insight.bestHole.hole} ${formatRelativeToPar(insight.bestHole.delta)}` : "-";
      const worstHoleText = insight.worstHole ? `H${insight.worstHole.hole} ${formatRelativeToPar(insight.worstHole.delta)}` : "-";
      const avgRelText = formatSignedDecimal(insight.averageRelativeToPar, 1);
      const birdies = Number.isInteger(insight.birdies) ? insight.birdies : 0;
      const eagles = Number.isInteger(insight.eagles) ? insight.eagles : 0;
      const pars = Number.isInteger(insight.pars) ? insight.pars : 0;
      const bogeysPlus = Number.isInteger(insight.bogeysPlus) ? insight.bogeysPlus : 0;
      const isExpanded = expandedPlayerId != null && expandedPlayerId === String(row.id);
      const frontRel = insight.front && insight.front.relativeToPar != null ? formatSignedDecimal(insight.front.relativeToPar, 1) : "-";
      const backRel = insight.back && insight.back.relativeToPar != null ? formatSignedDecimal(insight.back.relativeToPar, 1) : "-";
      const splitDelta = insight.front && insight.back && insight.front.relativeToPar != null && insight.back.relativeToPar != null
        ? (insight.back.relativeToPar - insight.front.relativeToPar)
        : null;
      const splitText = splitDelta == null ? "-" : formatSignedDecimal(splitDelta, 1);
      const consistencyText = insight.consistency == null ? "-" : formatDecimal(insight.consistency, 2);
      const interactiveAttrs = opts.interactive === false
        ? ""
        : ` data-player-id="${escapeHtml(row.id)}" aria-expanded="${isExpanded ? "true" : "false"}" aria-label="Toggle details for ${escapeHtml(row.name)}"`;
      return `
        <li class="round-summary-row-wrap ${isWinner ? "winner" : ""} ${isExpanded ? "expanded" : ""}">
          <button
            type="button"
            class="round-summary-row ${isWinner ? "winner" : ""}"
            ${interactiveAttrs}>
            <span class="round-summary-rank">${escapeHtml(row.rank)}</span>
            <span class="round-summary-name">${escapeHtml(row.name)}</span>
            <span class="round-summary-total">${display(row.total)} <span class="round-summary-total-label">strokes</span></span>
            <span class="leader-relative">${formatRelativeToPar(row.relative)}</span>
            <span class="round-summary-insights">
              <span class="insight-chip">Best ${bestHoleText}</span>
              <span class="insight-chip">Worst ${worstHoleText}</span>
              <span class="insight-chip">Avg ${avgRelText}</span>
              <span class="insight-chip insight-badge birdie" title="Birdies">${birdies}B</span>
              <span class="insight-chip insight-badge eagle" title="Eagles">${eagles}E</span>
              <span class="insight-chip insight-badge par" title="Pars">${pars}P</span>
              <span class="insight-chip insight-badge bogey" title="Bogeys and above">${bogeysPlus}B+</span>
            </span>
          </button>
          <div class="round-summary-detail ${isExpanded ? "" : "hidden"}">
            <p class="round-summary-detail-line">Front: ${frontRel} • Back: ${backRel} • Back vs Front: ${splitText}</p>
            <p class="round-summary-detail-line">Consistency (avg abs vs par): ${consistencyText}</p>
          </div>
        </li>
      `;
    }).join("");
    return `
      <div class="round-summary-head">
        <p class="round-summary-kicker">Round Complete</p>
        <p class="round-summary-title">Final Leaderboard</p>
        <p class="round-summary-meta">${completion.playersCount} players • ${completion.holes} holes completed</p>
      </div>
      <div class="round-summary-winner winner-celebrate">
        <span class="round-summary-winner-label">${winnerLabel}</span>
        <span class="round-summary-winner-name"><span aria-hidden="true">🏆</span> ${winnerNames}</span>
      </div>
      ${competitiveTagMarkup ? `<div class="competitive-tags">${competitiveTagMarkup}</div>` : ""}
      <div class="round-highlights">
        <div class="round-highlights-item">
          <span class="round-highlights-label">Best Round Moment</span>
          <span class="round-highlights-value">${bestMomentText}</span>
        </div>
        <div class="round-highlights-item">
          <span class="round-highlights-label">Toughest Hole</span>
          <span class="round-highlights-value">${toughestHoleText}</span>
        </div>
      </div>
      <ul class="round-summary-standings">${standingsMarkup}</ul>
    `;
  }

  function renderRoundSummaryPanel(completion) {
    const panel = ensureRoundSummaryPanel();
    if (!panel || !completion) return;
    if (!completion.isComplete) {
      state.roundSummaryExpandedPlayerId = null;
      panel.classList.remove("complete");
      panel.classList.add("pending");
      panel.innerHTML = buildRoundSummaryPanelMarkup(completion, {
        expandedPlayerId: null,
        interactive: false
      });
      return;
    }
    panel.classList.remove("pending");
    panel.classList.add("complete");
    panel.innerHTML = buildRoundSummaryPanelMarkup(completion, {
      expandedPlayerId: state.roundSummaryExpandedPlayerId,
      interactive: true
    });
  }

  function onRoundSummaryPanelClick(event) {
    const shareBtn = event.target.closest("[data-action='share-round']");
    if (shareBtn) {
      event.preventDefault();
      if (state.shareInFlight || shareBtn.disabled) return;
      shareRound();
      return;
    }
    const saveImageBtn = event.target.closest("[data-action='save-share-image']");
    if (saveImageBtn) {
      event.preventDefault();
      if (state.shareSaveInFlight || saveImageBtn.disabled) return;
      saveRoundShareImage();
      return;
    }
    const actionBtn = event.target.closest("[data-action='start-rematch']");
    if (actionBtn) {
      event.preventDefault();
      startRematch();
      return;
    }
    const trigger = event.target.closest(".round-summary-row[data-player-id]");
    if (!trigger) return;
    const playerId = trigger.getAttribute("data-player-id");
    if (!playerId || !state.roundCompletion || !state.roundCompletion.isComplete) return;
    state.roundSummaryExpandedPlayerId = String(state.roundSummaryExpandedPlayerId) === String(playerId) ? null : playerId;
    renderRoundSummaryPanel(state.roundCompletion);
  }

  function buildRematchCreateInput() {
    if (!state.round) return null;
    const players = (state.players || [])
      .map((player) => String(player && player.name ? player.name : "").trim())
      .filter((name) => name.length > 0);
    if (!players.length) return null;
    const safeRoundName = String(state.round.name || "Round").trim() || "Round";
    return {
      roundName: `${safeRoundName} Rematch`,
      courseName: String(state.round.course || "").trim(),
      courseMetadata: {
        displayName: state.round.course || null,
        locationText: state.round.course_location_text || null,
        lat: Number.isFinite(Number(state.round.course_lat)) ? Number(state.round.course_lat) : null,
        lng: Number.isFinite(Number(state.round.course_lng)) ? Number(state.round.course_lng) : null,
        placeId: state.round.course_place_id || null,
        source: state.round.course_source || null
      },
      tee: String(state.round.tee || "").trim(),
      holes: Number(state.round.holes) === 9 ? 9 : 18,
      players: players
    };
  }

  async function startRematch() {
    if (!state.round) return;
    const input = buildRematchCreateInput();
    if (!input || !input.courseName || !input.players.length) {
      showFeedback("Rematch setup is incomplete.", true);
      return;
    }
    const button = document.querySelector(".round-rematch-btn[data-action='start-rematch']");
    if (button) button.disabled = true;
    try {
      const created = await window.SupabaseAPI.createRoundWithPlayers(input);
      await loadRound(created.round.id);
      saveSession({ roundId: created.round.id });
      updateUrlRoundParam(created.round.id);
      showView("score");
      showFeedback("Rematch started.");
    } catch (err) {
      showFeedback("Could not start rematch.", true);
      console.error(err);
    } finally {
      const refreshedButton = document.querySelector(".round-rematch-btn[data-action='start-rematch']");
      if (refreshedButton) refreshedButton.disabled = false;
    }
  }

  function buildRoundHistoryDraft(completion) {
    if (!state.round || !completion || !completion.isComplete) return null;
    const standings = Array.isArray(completion.standings) ? completion.standings : [];
    const players = Array.isArray(state.players) ? state.players : [];
    const holes = Number(state.round.holes) || 0;
    const winnerIds = (Array.isArray(completion.leaders) ? completion.leaders : []).map((row) => String(row.id));
    const completedAt = new Date().toISOString();
    return {
      roundId: state.round.id,
      roundName: state.round.name || "",
      courseName: state.round.course || "",
      tee: state.round.tee || "",
      holes: holes,
      date: completedAt,
      completedAt: completedAt,
      players: players.map((player) => ({
        id: String(player.id),
        name: player.name
      })),
      scores: players.map((player) => {
        const playerStandings = standings.find((row) => String(row.id) === String(player.id)) || null;
        const holeScores = [];
        for (let hole = 1; hole <= holes; hole += 1) {
          const value = getScore(player.id, hole);
          holeScores.push(Number.isInteger(value) ? value : null);
        }
        return {
          playerId: String(player.id),
          playerName: player.name,
          holeScores: holeScores,
          front: playerStandings ? playerStandings.front : null,
          back: playerStandings ? playerStandings.back : null,
          total: playerStandings ? playerStandings.total : null,
          relative: playerStandings ? playerStandings.relative : null,
          rank: playerStandings ? playerStandings.rank : "-"
        };
      }),
      standings: standings.map((row) => ({
        id: String(row.id),
        name: row.name,
        rank: row.rank,
        front: row.front,
        back: row.back,
        total: row.total,
        relative: row.relative,
        holeScores: (() => {
          const values = [];
          for (let hole = 1; hole <= holes; hole += 1) {
            const score = getScore(row.id, hole);
            values.push(Number.isInteger(score) ? score : null);
          }
          return values;
        })()
      })),
      winnerNames: Array.isArray(completion.winnerNames) ? completion.winnerNames.slice() : [],
      winnerIds: winnerIds,
      winnerLabel: completion.winnerLabel || "Winner",
      highlights: completion.highlights && typeof completion.highlights === "object"
        ? JSON.parse(JSON.stringify(completion.highlights))
        : {},
      insights: completion.playerInsightsById && typeof completion.playerInsightsById === "object"
        ? JSON.parse(JSON.stringify(completion.playerInsightsById))
        : {},
      competitiveTags: Array.isArray(completion.competitiveTags)
        ? completion.competitiveTags.map((tag) => ({ key: tag.key, label: tag.label, detail: tag.detail || "" }))
        : []
    };
  }

  function prepareRoundHistoryHook(completion) {
    if (!completion || !completion.isComplete) {
      state.roundHistoryDraft = null;
      state.roundHistoryPreparedAt = null;
      return;
    }
    state.roundHistoryDraft = buildRoundHistoryDraft(completion);
    state.roundHistoryPreparedAt = Date.now();
  }

  function renderRoundCompletionExperience() {
    const standings = buildStandings();
    const next = buildRoundCompletionState(standings);
    if (next.isComplete) {
      if (state.roundCompletionCandidateAt == null) state.roundCompletionCandidateAt = Date.now();
      if (Date.now() - state.roundCompletionCandidateAt < 260) next.isComplete = false;
    } else {
      state.roundCompletionCandidateAt = null;
    }
    if (next.isComplete) state.roundCompletionCandidateAt = null;
    const previous = state.roundCompletion;
    state.roundCompletion = next;
    applyRoundCompletionVisualState(next);
    renderShareReadyState(next);
    renderLeaderboardStateBadge(next);
    renderRoundSummaryPanel(next);
    renderRoundShareCard(next);
    prepareRoundHistoryHook(next);
    persistRoundHistoryFromCompletion(next);
    const transitionedToComplete = previous && !previous.isComplete && next.isComplete;
    if (transitionedToComplete) {
      clearTimeout(state.roundCompleteTransitionTimer);
      dom.scoreView.classList.add("round-complete-enter");
      state.roundCompleteTransitionTimer = setTimeout(() => {
        dom.scoreView.classList.remove("round-complete-enter");
      }, 460);
    } else if (previous && previous.isComplete && !next.isComplete) {
      clearTimeout(state.roundCompleteTransitionTimer);
      dom.scoreView.classList.remove("round-complete-enter");
    }
    return next;
  }

  function renderLeaderboard(standings) {
    window.PocketCaddyRender.renderLeaderboard({
      state: state,
      dom: dom,
      standings: standings,
      buildStandings: buildStandings,
      display: display,
      escapeHtml: escapeHtml,
      formatRelativeToPar: formatRelativeToPar,
      onReRender: () => renderLeaderboard()
    });
  }

  function renderScoreTable(standings) {
    window.PocketCaddyRender.renderScoreTable({
      state: state,
      dom: dom,
      standings: standings,
      buildStandings: buildStandings,
      renderScoreUxMeta: renderScoreUxMeta,
      getPar: getPar,
      display: display,
      getTotals: getTotals,
      isEditablePlayerRow: isEditablePlayerRow,
      scoreKey: scoreKey,
      getScore: getScore,
      getScoreDelta: getScoreDelta,
      formatRelativeToPar: formatRelativeToPar,
      getGolfTerm: getGolfTerm,
      getGolfTermClass: getGolfTermClass,
      escapeHtml: escapeHtml
    });
  }

  function onScoreTableClick(event) {
    const btn = event.target.closest(".score-btn");
    if (!btn || !dom.scoreTable.contains(btn)) return;
    if (btn.disabled) return;
    const playerId = btn.getAttribute("data-player-id");
    const hole = Number(btn.getAttribute("data-hole"));
    if (!playerId || !Number.isInteger(hole) || hole < 1) return;
    state.scoreTapKey = scoreKey(playerId, hole);
    clearTimeout(state.scoreTapTimer);
    state.scoreTapTimer = setTimeout(() => {
      state.scoreTapKey = null;
      if (state.round) renderScoreTable();
    }, 180);
    syncSelectedHole(hole, { scrollTable: true, scrollTile: true, smooth: true });
    openPicker(playerId, hole);
  }

  function openPicker(playerId, hole) {
    const prevActiveKey = state.activeCell
      ? scoreKey(state.activeCell.playerId, state.activeCell.hole)
      : null;
    state.activeCell = { playerId: playerId, hole: hole };
    const nextActiveKey = scoreKey(playerId, hole);
    if (prevActiveKey !== nextActiveKey) {
      state.activeCellPulseKey = nextActiveKey;
      clearTimeout(state.activeCellPulseTimer);
      state.activeCellPulseTimer = setTimeout(() => {
        if (state.activeCellPulseKey === nextActiveKey) {
          state.activeCellPulseKey = null;
          if (state.round) renderScoreTable();
        }
      }, 260);
    }
    const player = state.players.find((p) => p.id === playerId);
    const current = getScore(playerId, hole);
    const par = getPar(hole);
    const term = getGolfTerm(current, par);
    const rel = formatRelativeToPar(getScoreDelta(current, hole));
    const parText = Number.isInteger(par) ? `Par ${par}` : "Par -";
    const currentText = current == null ? "-" : `${current} (${rel}${term ? ` ${term}` : ""})`;
    const nextText = state.round && hole < state.round.holes ? `Next: H${hole + 1}` : "Final hole";
    dom.pickerTitle.textContent = `${player ? player.name : "Player"} - Hole ${hole}/${state.round ? state.round.holes : hole} (${parText}) - Current: ${currentText} - ${nextText}`;
    clearPickerStatus();
    dom.pickerGrid.innerHTML = Array.from({ length: 15 }, (_, i) => i + 1)
      .map((v) => `<button class="pick-btn" type="button" data-v="${v}">${v}</button>`)
      .join("");

    dom.pickerGrid.querySelectorAll(".pick-btn").forEach((btn) => {
      const btnValue = Number(btn.getAttribute("data-v"));
      if (current != null && btnValue === current) {
        btn.setAttribute("aria-pressed", "true");
        btn.style.borderColor = "#4f7f5f";
        btn.style.background = "#e7f5eb";
      } else {
        btn.setAttribute("aria-pressed", "false");
      }
      btn.addEventListener("click", async () => {
        btn.classList.add("confirming");
        setTimeout(() => btn.classList.remove("confirming"), 220);
        await setScore(Number(btn.getAttribute("data-v")), { source: "grid" });
      });
    });
    clearTimeout(state.pickerCloseTimer);
    if (state.pickerOpenRaf != null) cancelAnimationFrame(state.pickerOpenRaf);
    dom.picker.classList.remove("hidden", "is-closing");
    state.pickerOpenRaf = requestAnimationFrame(() => {
      dom.picker.classList.add("is-open");
      state.pickerOpenRaf = null;
    });
    updatePickerBusyState();
    renderScoreTable();
  }

  function closePicker() {
    clearTimeout(state.scoreAutoAdvanceTimer);
    state.activeCell = null;
    state.activeCellPulseKey = null;
    clearPickerStatus();
    dom.picker.classList.remove("is-open");
    dom.picker.classList.add("is-closing");
    clearTimeout(state.pickerCloseTimer);
    state.pickerCloseTimer = setTimeout(() => {
      dom.picker.classList.add("hidden");
      dom.picker.classList.remove("is-closing");
      dom.pickerGrid.innerHTML = "";
      dom.pickerTitle.textContent = "Select score";
    }, 170);
    if (state.round) renderScoreTable();
  }

  async function setScore(value, options) {
    if (!state.activeCell || !state.round) return;
    const opts = options || {};
    const { playerId, hole } = state.activeCell;
    const key = scoreKey(playerId, hole);
    if (state.pendingScoreKeys.has(key)) return;

    const nextValue = value == null ? null : clampScore(value);
    if (nextValue === undefined) return;

    const hadPrev = Object.prototype.hasOwnProperty.call(state.scoreMap, key);
    const prevValue = hadPrev ? state.scoreMap[key] : undefined;

    state.pendingScoreKeys.add(key);
    if (nextValue == null) delete state.scoreMap[key];
    else state.scoreMap[key] = nextValue;
    syncPotSettingsLockState();
    const pendingCompletion = renderRoundCompletionExperience();
    renderLeaderboard(pendingCompletion.standings);
    renderScoreTable(pendingCompletion.standings);
    syncSelectedHole(hole, { scrollTable: true, scrollTile: true, smooth: false });
    updatePickerBusyState();

    try {
      if (nextValue == null) {
        await window.SupabaseAPI.deleteScore({ roundId: state.round.id, playerId: playerId, hole: hole });
      } else {
        await window.SupabaseAPI.upsertScore({ roundId: state.round.id, playerId: playerId, hole: hole, value: nextValue });
      }
      setRecentScoreFlash(key);
      if (isActiveScoreCell(playerId, hole)) {
        if (opts.source === "grid") {
          clearTimeout(state.scoreAutoAdvanceTimer);
          state.scoreAutoAdvanceTimer = setTimeout(() => {
            if (isActiveScoreCell(playerId, hole) && movePickerToAdjacentHole(playerId, hole, 1)) {
              setPickerStatus("Saved. Next hole ready.", "success", 980);
            } else {
              closePicker();
              showFeedback("Score saved.");
            }
          }, 130);
        } else {
          setPickerStatus("Saved.", "success", 900);
        }
      } else {
        showFeedback("Score saved.");
      }
    } catch (_err) {
      if (hadPrev) state.scoreMap[key] = prevValue;
      else delete state.scoreMap[key];
      setPickerStatus("Score save failed.", "error", 1800);
      showFeedback("Could not save score.", true);
    } finally {
      state.pendingScoreKeys.delete(key);
      syncPotSettingsLockState();
      const settledCompletion = renderRoundCompletionExperience();
      renderLeaderboard(settledCompletion.standings);
      renderScoreTable(settledCompletion.standings);
      updatePickerBusyState();
    }
  }

  async function adjustScore(delta) {
    if (!state.activeCell) return;
    const key = scoreKey(state.activeCell.playerId, state.activeCell.hole);
    if (state.pendingScoreKeys.has(key)) return;
    const current = getScore(state.activeCell.playerId, state.activeCell.hole);
    const base = current == null ? 0 : current;
    const next = base + delta;
    if (next < MIN_SCORE) {
      await clearActiveScore();
      return;
    }
    await setScore(next, { source: "adjust" });
  }

  async function clearActiveScore() {
    if (!state.activeCell) return;
    await setScore(null, { source: "clear" });
  }

  function updatePickerBusyState() {
    if (!state.activeCell) return;
    const key = scoreKey(state.activeCell.playerId, state.activeCell.hole);
    const busy = state.pendingScoreKeys.has(key);
    if (busy) {
      setPickerStatus("Saving score...", "saving");
    } else if (dom.pickerStatus.dataset.state === "saving") {
      clearPickerStatus();
    }
    dom.pickerGrid.querySelectorAll(".pick-btn").forEach((btn) => { btn.disabled = busy; });
    dom.pickerMinus.disabled = busy;
    dom.pickerPlus.disabled = busy;
    dom.pickerClear.disabled = busy;
    dom.pickerDone.disabled = busy;
  }

  function clampScore(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    const r = Math.round(n);
    if (r < MIN_SCORE) return MIN_SCORE;
    if (r > MAX_SCORE) return MAX_SCORE;
    return r;
  }

  function clampPar(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const r = Math.round(n);
    if (r < 3) return 3;
    if (r > 6) return 6;
    return r;
  }

  function parseDistanceYards(value) {
    if (value == null || value === "") return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const r = Math.round(n);
    if (r < 1) return null;
    return r;
  }

  function getPar(hole) {
    const v = state.parMap[hole];
    return Number.isInteger(v) ? v : null;
  }

  function getScoreDelta(score, hole) {
    const par = getPar(hole);
    if (!Number.isInteger(score) || !Number.isInteger(par)) return null;
    return score - par;
  }

  function formatRelativeToPar(delta) {
    if (delta == null) return "-";
    if (delta === 0) return "E";
    if (delta > 0) return `+${delta}`;
    return String(delta);
  }

  function getGolfTerm(score, par) {
    if (!Number.isInteger(score) || !Number.isInteger(par)) return "";
    if (score === 1) return "Ace";
    if (score <= par - 3) return "Albatross";
    if (score === par - 2) return "Eagle";
    if (score === par - 1) return "Birdie";
    if (score === par) return "Par";
    if (score === par + 1) return "Bogey";
    if (score === par + 2) return "Double Bogey";
    if (score >= par + 3) return "Triple Bogey+";
    return "";
  }

  function getGolfTermClass(term) {
    if (term === "Ace") return "score-state-ace";
    if (term === "Albatross") return "score-state-albatross";
    if (term === "Eagle") return "score-state-eagle";
    if (term === "Birdie") return "score-state-birdie";
    if (term === "Par") return "score-state-par";
    if (term === "Bogey") return "score-state-bogey";
    if (term === "Double Bogey") return "score-state-double-bogey";
    if (term === "Triple Bogey+") return "score-state-triple-bogey";
    return "";
  }

  async function refreshScores() {
    if (!state.round) return;
    const prevMap = state.scoreMap;
    const rows = await window.SupabaseAPI.getScores(state.round.id);
    const nextMap = buildScoreMap(rows);
    const changedKey = findChangedScoreKey(prevMap, nextMap);
    state.scoreMap = nextMap;
    if (changedKey) setRecentScoreFlash(changedKey);
    syncPotSettingsLockState();
    const completion = renderRoundCompletionExperience();
    renderLeaderboard(completion.standings);
    renderScoreTable(completion.standings);
  }

  function findChangedScoreKey(beforeMap, afterMap) {
    const keys = new Set([...Object.keys(beforeMap || {}), ...Object.keys(afterMap || {})]);
    for (const key of keys) {
      if ((beforeMap && beforeMap[key]) !== (afterMap && afterMap[key])) return key;
    }
    return null;
  }

  function setRecentScoreFlash(key) {
    if (!key) return;
    clearTimeout(state.scoreFlashTimer);
    state.recentScoreFlashKey = key;
    state.scoreFlashTimer = setTimeout(() => {
      state.recentScoreFlashKey = null;
      renderScoreTable();
    }, 700);
  }

  async function refreshPars() {
    if (!state.round) return;
    const rows = await window.SupabaseAPI.getRoundHoles(state.round.id);
    state.parMap = buildParMap(rows, state.round.holes);
    state.holeDetails = buildHoleDetails(rows, state.round.holes);
    renderHoleIntelligenceStrip();
    renderShotIntelligencePanel();
    renderHoleDetailEditor();
    renderParRow();
    const completion = renderRoundCompletionExperience();
    renderLeaderboard(completion.standings);
    renderScoreTable(completion.standings);
  }

  async function refreshPlayers() {
    if (!state.round) return;
    state.players = await window.SupabaseAPI.getPlayers(state.round.id);
    const found = state.identityName ? findPlayerByName(state.identityName) : null;
    if (!found) {
      state.identityName = null;
      state.identityPlayerId = null;
      openNameModal(false);
      showFeedback("Select your player to continue scoring.", true);
    } else {
      state.identityPlayerId = found.id;
    }
    renderRound();
  }

  async function refreshRound() {
    if (!state.round) return;
    const previousRound = state.round;
    const latest = await window.SupabaseAPI.getRoundById(state.round.id);
    if (!latest) return;
    state.round = normalizeRoundCourseMetadata({
      ...state.round,
      ...latest
    });
    if (state.round.pot_amount == null) state.round.pot_amount = 0;
    if (state.round.payout_first == null) state.round.payout_first = 60;
    if (state.round.payout_second == null) state.round.payout_second = 30;
    if (state.round.payout_third == null) state.round.payout_third = 10;
    state.holeDetails = normalizeHoleDetails(state.round.holes, state.holeDetails);
    state.selectedHole = clampHoleSelection(state.selectedHole, state.round.holes);
    if (state.selectedHole == null && state.round.holes >= 1) state.selectedHole = 1;
    state.parMap = buildParMap(Object.keys(state.parMap).map((hole) => ({ hole: Number(hole), par: state.parMap[hole] })), state.round.holes);
    if (getCourseIntelRoundKey(previousRound) !== getCourseIntelRoundKey(state.round)) {
      resetIntelligenceState({ invalidateRequests: true });
    }
    renderRound();
  }

  function startRealtime(roundId) {
    state.channel = window.SupabaseAPI.subscribeToRound(roundId, {
      onScoresChanged: refreshScores,
      onPlayersChanged: refreshPlayers,
      onRoundChanged: refreshRound,
      onParsChanged: refreshPars
    });
  }

  function stopRealtime() {
    if (!state.channel) return;
    window.SupabaseAPI.unsubscribeFromRound(state.channel);
    state.channel = null;
  }

  async function resumeSession() {
    return window.PocketCaddyRoundLifecycle.resumeSession(buildRoundLifecycleDeps());












  }

  function startNewRound() {
    const ok = window.confirm("Start a new round locally? This leaves the current round.");
    if (!ok) return;
    const previousRoundId = state.round ? state.round.id : null;
    stopRealtime();
    state.round = null;
    state.players = [];
    state.scoreMap = {};
    state.parMap = {};
    state.holeDetails = {};
    state.selectedHole = null;
    state.selectedHolePulse = null;
    state.pendingScoreKeys.clear();
    state.pendingParHoles.clear();
    state.pendingHoleDetailHoles.clear();
    state.parSaveTimers.forEach((timerId) => clearTimeout(timerId));
    state.parSaveTimers.clear();
    state.holeDetailSaveTimers.forEach((timerId) => clearTimeout(timerId));
    state.holeDetailSaveTimers.clear();
    state.activeCell = null;
    state.identityName = null;
    state.identityPlayerId = null;
    resetIntelligenceState({ invalidateRequests: true, resetSelectedHole: true });
    state.lastAutoScrollIdentityToken = null;
    state.recentScoreFlashKey = null;
    state.scoreTapKey = null;
    state.activeCellPulseKey = null;
    state.leaderPulseOn = false;
    state.leaderboardOrderById = {};
    state.leaderboardShiftMap = {};
    state.roundCompletion = null;
    state.roundCompletionCandidateAt = null;
    state.roundHistoryDraft = null;
    state.roundHistoryPreparedAt = null;
    clearTimeout(state.scoreFlashTimer);
    clearTimeout(state.scoreTapTimer);
    clearTimeout(state.activeCellPulseTimer);
    clearTimeout(state.scoreAutoAdvanceTimer);
    clearTimeout(state.holePulseTimer);
    clearTimeout(state.leaderPulseTimer);
    clearTimeout(state.leaderboardShiftTimer);
    clearTimeout(state.roundCompleteTransitionTimer);
    clearTimeout(state.feedbackTimer);
    clearTimeout(state.feedbackHideTimer);
    clearTimeout(state.pickerCloseTimer);
    if (state.pickerOpenRaf != null) cancelAnimationFrame(state.pickerOpenRaf);
    clearLocalSavedSessionState(previousRoundId);
    clearUrlRoundParam();
    closePicker();
    closeNameModal();
    showView("home");
    setCourseSearchStatus("Local round reset. Ready to start a new round.");
  }

  function clearCurrentRoundData() {
    if (!state.round) return;
    const ok = window.confirm("Clear all scores in this round?");
    if (!ok) return;
    (async () => {
      await window.SupabaseAPI.clearScores(state.round.id);
      state.scoreMap = {};
      state.pendingScoreKeys.clear();
      closePicker();
      renderRound();
      showFeedback("Scores cleared.");
    })().catch((err) => {
      showFeedback("Could not clear scores.", true);
      console.error(err);
    });
  }

  function isActiveScoreCell(playerId, hole) {
    return Boolean(
      state.activeCell &&
      String(state.activeCell.playerId) === String(playerId) &&
      Number(state.activeCell.hole) === Number(hole)
    );
  }

  function movePickerToAdjacentHole(playerId, currentHole, delta) {
    if (!state.round || !isEditablePlayerRow(playerId)) return false;
    const nextHole = clampHoleSelection(Number(currentHole) + Number(delta), state.round.holes);
    if (!nextHole) return false;
    syncSelectedHole(nextHole, { scrollTable: true, scrollTile: true, smooth: true });
    openPicker(playerId, nextHole);
    return true;
  }

  function setPickerStatus(message, tone, autoHideMs) {
    clearTimeout(state.pickerStatusTimer);
    if (!message) {
      clearPickerStatus();
      return;
    }
    const mode = String(tone || "info");
    dom.pickerStatus.classList.remove("hidden");
    dom.pickerStatus.textContent = message;
    dom.pickerStatus.dataset.state = mode;
    if (Number(autoHideMs) > 0) {
      state.pickerStatusTimer = setTimeout(() => {
        clearPickerStatus();
      }, Number(autoHideMs));
    }
  }

  function clearPickerStatus() {
    clearTimeout(state.pickerStatusTimer);
    state.pickerStatusTimer = null;
    dom.pickerStatus.classList.add("hidden");
    dom.pickerStatus.textContent = "";
    dom.pickerStatus.dataset.state = "";
  }

  function parseMoney(value) {
    const n = Number(String(value || "").trim());
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  function parsePercent(value) {
    const n = Number(String(value || "").trim());
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  function formatMoneyInput(value) {
    const n = parseMoney(value);
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  }

  function formatPercentInput(value) {
    const n = parsePercent(value);
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  }

  function normalizePayoutInputValues() {
    if (state.potSettingsLocked && state.round) {
      dom.potAmount.value = formatMoneyInput(state.round.pot_amount);
      dom.payoutFirst.value = formatPercentInput(state.round.payout_first);
      dom.payoutSecond.value = formatPercentInput(state.round.payout_second);
      dom.payoutThird.value = formatPercentInput(state.round.payout_third);
      return;
    }
    dom.potAmount.value = formatMoneyInput(dom.potAmount.value);
    dom.payoutFirst.value = formatPercentInput(dom.payoutFirst.value);
    dom.payoutSecond.value = formatPercentInput(dom.payoutSecond.value);
    dom.payoutThird.value = formatPercentInput(dom.payoutThird.value);
  }

  function onPayoutInputChanged() {
    if (!state.round) return;
    if (state.potSettingsLocked) {
      dom.potAmount.value = formatMoneyInput(state.round.pot_amount);
      dom.payoutFirst.value = formatPercentInput(state.round.payout_first);
      dom.payoutSecond.value = formatPercentInput(state.round.payout_second);
      dom.payoutThird.value = formatPercentInput(state.round.payout_third);
      return;
    }
    const next = {
      pot_amount: parseMoney(dom.potAmount.value),
      payout_first: parsePercent(dom.payoutFirst.value),
      payout_second: parsePercent(dom.payoutSecond.value),
      payout_third: parsePercent(dom.payoutThird.value)
    };
    state.round.pot_amount = next.pot_amount;
    state.round.payout_first = next.payout_first;
    state.round.payout_second = next.payout_second;
    state.round.payout_third = next.payout_third;
    renderPayouts();
    queueRoundSettingsSave();
  }

  function queueRoundSettingsSave() {
    if (!state.round) return;
    if (state.potSettingsLocked) return;
    clearTimeout(state.settingsSaveTimer);
    dom.payoutSaveStatus.classList.remove("hidden");
    dom.payoutSaveStatus.textContent = "Saving pot settings...";
    state.settingsSaveTimer = setTimeout(async () => {
      if (state.potSettingsLocked || !state.round) return;
      try {
        const updated = await window.SupabaseAPI.updateRoundSettings({
          roundId: state.round.id,
          potAmount: parseMoney(dom.potAmount.value),
          payoutFirst: parsePercent(dom.payoutFirst.value),
          payoutSecond: parsePercent(dom.payoutSecond.value),
          payoutThird: parsePercent(dom.payoutThird.value)
        });
        state.round = { ...state.round, ...updated };
        dom.payoutSaveStatus.textContent = "Saved";
        setTimeout(() => {
          dom.payoutSaveStatus.classList.add("hidden");
        }, 900);
      } catch (err) {
        dom.payoutSaveStatus.classList.remove("hidden");
        dom.payoutSaveStatus.textContent = "Save failed. Try again.";
        showFeedback("Could not save pot settings.", true);
        console.error(err);
      }
    }, 350);
  }

  function hasAnyScores() {
    return Object.keys(state.scoreMap).length > 0;
  }

  function syncPotSettingsLockState() {
    const locked = hasAnyScores();
    state.potSettingsLocked = locked;
    [dom.potAmount, dom.payoutFirst, dom.payoutSecond, dom.payoutThird].forEach((input) => {
      input.disabled = locked;
      input.readOnly = locked;
    });
    dom.payoutSettingsGrid.classList.toggle("locked", locked);
    dom.payoutLockMessage.classList.toggle("hidden", !locked);
    if (locked && state.settingsSaveTimer) {
      clearTimeout(state.settingsSaveTimer);
      state.settingsSaveTimer = null;
      dom.payoutSaveStatus.classList.add("hidden");
    }
  }

  function scheduleScrollToIdentityRow(force) {
    if (!state.round || !state.identityPlayerId || !dom.scoreTable) return;
    const identityToken = `${state.round.id}:${state.identityPlayerId}`;
    if (!force && state.lastAutoScrollIdentityToken === identityToken) return;
    window.requestAnimationFrame(() => {
      const targetRow = getIdentityPlayerRow();
      if (!targetRow) return;
      const container = dom.scoreScrollContainer;
      if (container && typeof container.scrollTo === "function") {
        const rowOffset = targetRow.offsetTop - container.offsetTop;
        const targetTop = Math.max(0, rowOffset - Math.max(12, (container.clientHeight - targetRow.offsetHeight) / 2));
        try {
          container.scrollTo({ top: targetTop, behavior: "smooth" });
        } catch (_err) {
          container.scrollTop = targetTop;
        }
      } else {
        try {
          targetRow.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        } catch (_err) {
          targetRow.scrollIntoView();
        }
      }
      state.lastAutoScrollIdentityToken = identityToken;
    });
  }

  function getIdentityPlayerRow() {
    const rows = dom.scoreTable.querySelectorAll("tbody tr[data-player-id]");
    for (const row of rows) {
      if (row.getAttribute("data-player-id") === state.identityPlayerId) return row;
    }
    return null;
  }

  function isEditablePlayerRow(playerId) {
    if (state.identityPlayerId == null || playerId == null) return false;
    return String(state.identityPlayerId) === String(playerId);
  }

  function money(n) {
    return `$${(Number(n) || 0).toFixed(2)}`;
  }

  function renderPayouts() {
    window.PocketCaddyRender.renderPayouts({
      state: state,
      dom: dom,
      parseMoney: parseMoney,
      parsePercent: parsePercent,
      money: money,
      buildStandings: buildStandings,
      calculateProjectedPayouts: calculateProjectedPayouts,
      escapeHtml: escapeHtml
    });
  }

  function calculateProjectedPayouts(standings, payoutByPos) {
    const map = {};
    standings.forEach((s) => { map[s.id] = 0; });
    let i = 0;
    while (i < standings.length) {
      let j = i + 1;
      while (j < standings.length && standings[j].total === standings[i].total) j += 1;
      if (standings[i].total == null) {
        i = j;
        continue;
      }
      const rankStart = i + 1;
      const rankEnd = j;
      let pool = 0;
      for (let pos = Math.max(rankStart, 1); pos <= Math.min(rankEnd, 3); pos += 1) {
        pool += payoutByPos[pos] || 0;
      }
      if (pool > 0) {
        const split = pool / (j - i);
        for (let k = i; k < j; k += 1) {
          map[standings[k].id] += split;
        }
      }
      i = j;
    }
    return map;
  }

  function getCurrentShareUrl() {
    const currentFieldValue = dom.shareLink && typeof dom.shareLink.value === "string"
      ? dom.shareLink.value.trim()
      : "";
    const fallback = state.round && state.round.id ? buildShareLink(state.round.id) : "";
    const candidate = currentFieldValue || fallback;
    if (!candidate) return "";
    try {
      return new URL(candidate, window.location.origin).toString();
    } catch (_err) {
      return fallback || "";
    }
  }

  function getCopyButtonDefaultText(button) {
    if (!button) return "Copy Link";
    return button.id === "copy-share-btn" ? "Copy Share URL" : "Copy Link";
  }

  function syncCopyShareButtons() {
    const targets = [dom.copyLinkBtn, dom.copyShareBtn].filter(Boolean);
    targets.forEach((btn) => {
      if (btn._copyFlashTimer) return;
      btn.textContent = getCopyButtonDefaultText(btn);
      btn.disabled = false;
    });
  }

  function getRoundShareButton() {
    return document.querySelector(".round-share-btn[data-action='share-round']");
  }

  function getRoundSaveImageButton() {
    return document.querySelector(".round-save-image-btn[data-action='save-share-image']");
  }

  function setRoundShareButtonLabel(label) {
    const button = getRoundShareButton();
    if (!button) return;
    if (!button.dataset.originalText) {
      button.dataset.originalText = String(button.textContent || "Share Results");
    }
    button.textContent = label || "Share Results";
  }

  function syncRoundShareButtonState() {
    const button = getRoundShareButton();
    if (!button) return;
    if (state.shareInFlight) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      if (!button.dataset.originalText) button.dataset.originalText = "Share Results";
      if (!button.textContent || button.textContent === "Share Results") button.textContent = "Sharing...";
      return;
    }
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.textContent = "Share Results";
    delete button.dataset.originalText;
  }

  function lockShareActionButtonBriefly(button, delayMs) {
    if (!button) return;
    const holdMs = Math.max(300, Math.min(600, Number(delayMs) || 450));
    button.disabled = true;
    if (button._shareCooldownTimer) clearTimeout(button._shareCooldownTimer);
    button._shareCooldownTimer = setTimeout(() => {
      button._shareCooldownTimer = null;
      if (button.id === "native-share-btn" && typeof navigator.share !== "function") {
        button.disabled = true;
        button.hidden = true;
        return;
      }
      button.disabled = false;
    }, holdMs);
  }

  function updateNativeShareButtonAvailability() {
    const button = dom.nativeShareBtn || document.getElementById("native-share-btn");
    if (!button) return;
    const supported = typeof navigator.share === "function";
    button.hidden = !supported;
    button.disabled = !supported;
    button.setAttribute("aria-hidden", supported ? "false" : "true");
  }

  function ensureShareActionButtons() {
    const shareFields = dom.shareLink && dom.shareLink.closest(".share-fields");
    if (!shareFields) return;
    let actionsRow = shareFields.querySelector(".actions");
    if (!actionsRow) {
      actionsRow = document.createElement("div");
      actionsRow.className = "actions";
      shareFields.appendChild(actionsRow);
    }

    let copyShareBtn = document.getElementById("copy-share-btn");
    if (!copyShareBtn) {
      copyShareBtn = document.createElement("button");
      copyShareBtn.id = "copy-share-btn";
      copyShareBtn.type = "button";
      copyShareBtn.className = "btn btn-secondary";
      copyShareBtn.textContent = "Copy Share URL";
      actionsRow.appendChild(copyShareBtn);
    }

    let nativeShareBtn = document.getElementById("native-share-btn");
    if (!nativeShareBtn) {
      nativeShareBtn = document.createElement("button");
      nativeShareBtn.id = "native-share-btn";
      nativeShareBtn.type = "button";
      nativeShareBtn.className = "btn btn-secondary";
      nativeShareBtn.textContent = "Share Link";
      actionsRow.appendChild(nativeShareBtn);
    }

    dom.copyShareBtn = copyShareBtn;
    dom.nativeShareBtn = nativeShareBtn;
    syncCopyShareButtons();

    if (!copyShareBtn.dataset.wired) {
      copyShareBtn.addEventListener("click", () => {
        copyShareLink(copyShareBtn);
      });
      copyShareBtn.dataset.wired = "true";
    }
    if (!nativeShareBtn.dataset.wired) {
      nativeShareBtn.addEventListener("click", nativeShareCurrentRoundLink);
      nativeShareBtn.dataset.wired = "true";
    }

    updateNativeShareButtonAvailability();
  }

  async function copyShareLink(trigger) {
    const button = trigger && trigger.nodeType === 1
      ? trigger
      : (trigger && trigger.currentTarget && trigger.currentTarget.nodeType === 1
        ? trigger.currentTarget
        : (dom.copyLinkBtn || dom.copyShareBtn || null));
    if (button && button.disabled) return;
    if (button) lockShareActionButtonBriefly(button, 450);
    const text = getCurrentShareUrl();
    if (!text) {
      showFeedback("Share link unavailable.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showFeedback("Link copied.", "success");
      const flashTargets = [dom.copyLinkBtn, dom.copyShareBtn].filter(Boolean);
      flashTargets.forEach((btn) => {
        const resetLabel = getCopyButtonDefaultText(btn);
        btn.disabled = true;
        clearTimeout(btn._copyFlashTimer);
        btn.textContent = "Copied";
        btn._copyFlashTimer = setTimeout(() => {
          btn._copyFlashTimer = null;
          btn.textContent = resetLabel;
          btn.disabled = false;
        }, 1000);
      });
    } catch (_err) {
      showFeedback("Copy failed.", "error");
      syncCopyShareButtons();
    }
  }

  async function nativeShareCurrentRoundLink() {
    const button = dom.nativeShareBtn || document.getElementById("native-share-btn");
    if (!button || button.disabled) return;
    lockShareActionButtonBriefly(button, 500);
    if (typeof navigator.share !== "function") {
      updateNativeShareButtonAvailability();
      return;
    }
    const shareUrl = getCurrentShareUrl();
    if (!shareUrl) {
      showFeedback("Share link unavailable.", "error");
      return;
    }
    try {
      await navigator.share({
        title: "Golf Round Results",
        text: "Check out our round results",
        url: shareUrl
      });
      showFeedback("Link shared.", "success");
    } catch (err) {
      if (err && err.name === "AbortError") {
        showFeedback("Share canceled.", "neutral");
        return;
      }
      showFeedback("Share failed.", "error");
    }
  }

  function joinNamesForShare(names) {
    const safeNames = Array.isArray(names)
      ? names.map((name) => String(name || "").trim()).filter(Boolean)
      : [];
    if (safeNames.length <= 1) return safeNames[0] || "-";
    if (safeNames.length === 2) return `${safeNames[0]} & ${safeNames[1]}`;
    return `${safeNames.slice(0, -1).join(", ")} & ${safeNames[safeNames.length - 1]}`;
  }

  function buildRoundShareText(completion) {
    const safeCompletion = completion && completion.isComplete ? completion : state.roundCompletion;
    const roundName = state.round && state.round.name ? String(state.round.name).trim() : "";
    const courseName = state.round && state.round.course ? String(state.round.course).trim() : "";
    const tee = state.round && state.round.tee ? String(state.round.tee).trim() : "";
    const holes = state.round && Number(state.round.holes) > 0 ? Number(state.round.holes) : Number(safeCompletion && safeCompletion.holes);
    const contextParts = [];
    if (Number.isFinite(holes) && holes > 0) contextParts.push(`${holes} holes`);
    if (tee) contextParts.push(`${tee} tee`);
    const contextLine = contextParts.length ? contextParts.join(" • ") : "";
    const winnerNames = Array.isArray(safeCompletion && safeCompletion.winnerNames)
      ? safeCompletion.winnerNames.filter(Boolean).map((name) => String(name).trim()).filter(Boolean)
      : [];
    const hasTie = winnerNames.length > 1 || /tie/i.test(String(safeCompletion && safeCompletion.winnerLabel ? safeCompletion.winnerLabel : ""));
    const winnerLabel = hasTie ? "Winners (Tie)" : "Winner";
    const winnerText = joinNamesForShare(winnerNames);
    const topThree = Array.isArray(safeCompletion && safeCompletion.topThree)
      ? safeCompletion.topThree.slice(0, 3)
      : [];
    const standings = topThree.length
      ? topThree.map((row, idx) => {
        const place = idx + 1;
        const name = row && row.name ? String(row.name).trim() : "-";
        const total = row && Number.isFinite(Number(row.total)) ? `${Number(row.total)} strokes` : "-";
        const relative = row && row.relative != null ? ` (${formatRelativeToPar(row.relative)})` : "";
        return `${place}. ${name} — ${total}${relative}`;
      })
      : ["1. -", "2. -", "3. -"];
    return [
      "⛳ PocketCaddy Round Results",
      `Round: ${roundName || "Round"}`,
      `Course: ${courseName || "-"}`,
      contextLine ? `Final: ${contextLine}` : "",
      `🏆 ${winnerLabel}: ${winnerText}`,
      "Standings:",
      standings[0],
      standings[1],
      standings[2],
      "Shared via PocketCaddy"
    ].filter(Boolean).join("\n");
  }

  async function copyShareText(precomputedText) {
    const text = precomputedText || buildRoundShareText(state.roundCompletion);
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function setShareButtonLoading(isLoading) {
    const button = getRoundShareButton();
    if (!button) return;
    if (state.shareButtonResetTimer) {
      clearTimeout(state.shareButtonResetTimer);
      state.shareButtonResetTimer = null;
    }
    if (isLoading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = String(button.textContent || "Share Results");
      }
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = "Preparing...";
      return;
    }
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.textContent = "Share Results";
    delete button.dataset.originalText;
  }

  function setShareButtonPostShareState(text, options) {
    const button = getRoundShareButton();
    if (!button) return;
    if (!button.dataset.originalText) {
      button.dataset.originalText = String(button.textContent || "Share Results");
    }
    button.disabled = true;
    button.removeAttribute("aria-busy");
    button.textContent = text || "Done";
    const holdMs = options && Number.isFinite(options.holdMs) ? Math.max(450, Number(options.holdMs)) : 1400;
    state.shareButtonResetTimer = setTimeout(() => {
      state.shareButtonResetTimer = null;
      setShareButtonLoading(false);
    }, holdMs);
  }

  function fitCanvasText(ctx, text, maxWidth) {
    const raw = String(text == null ? "" : text).trim();
    if (!raw) return "-";
    if (ctx.measureText(raw).width <= maxWidth) return raw;
    const ellipsis = "…";
    let out = raw;
    while (out.length > 1 && ctx.measureText(out + ellipsis).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return out.length ? `${out}${ellipsis}` : ellipsis;
  }

  function formatShareScoreContext(row) {
    const total = row && Number.isFinite(Number(row.total)) ? Number(row.total) : null;
    const relative = row && Number.isFinite(Number(row.relative)) ? Number(row.relative) : null;
    if (relative != null && total != null) return `${formatRelativeToPar(relative)} (${total})`;
    if (relative != null) return formatRelativeToPar(relative);
    if (total != null) return `(${total})`;
    return "-";
  }

  function buildShareImageData(completion) {
    const safeCompletion = completion && completion.isComplete ? completion : state.roundCompletion;
    const winnerNames = Array.isArray(safeCompletion && safeCompletion.winnerNames)
      ? safeCompletion.winnerNames.filter(Boolean).map((name) => String(name).trim()).filter(Boolean)
      : [];
    const hasTie = winnerNames.length > 1 || /tie/i.test(String(safeCompletion && safeCompletion.winnerLabel ? safeCompletion.winnerLabel : ""));
    const winnerLabel = hasTie ? "Winners (Tie)" : "Winner";
    const standings = Array.isArray(safeCompletion && safeCompletion.topThree)
      ? safeCompletion.topThree.slice(0, 3).map((row, idx) => ({
          place: idx + 1,
          name: row && row.name ? String(row.name).trim() : "-",
          score: formatShareScoreContext(row)
        }))
      : [];
    const leaders = Array.isArray(safeCompletion && safeCompletion.leaders)
      ? safeCompletion.leaders.filter((row) => row && row.total != null)
      : [];
    const winnerContext = leaders.length
      ? leaders.map((row) => formatShareScoreContext(row)).join(" • ")
      : (standings[0] && standings[0].score && standings[0].score !== "-" ? String(standings[0].score) : "-");
    while (standings.length < 3) {
      standings.push({ place: standings.length + 1, name: "-", score: "-" });
    }
    return {
      roundName: state.round && state.round.name ? String(state.round.name).trim() : "Round Results",
      courseName: state.round && state.round.course ? String(state.round.course).trim() : "-",
      holesCount: state.round && Number.isFinite(Number(state.round.holes)) ? Number(state.round.holes) : null,
      teeName: state.round && state.round.tee ? String(state.round.tee).trim() : "",
      winnerLabel: winnerLabel,
      winnerNamesText: joinNamesForShare(winnerNames),
      winnerScoreContextText: winnerContext,
      standings: standings
    };
  }

  function generateShareImage(roundData) {
    const data = roundData || buildShareImageData(state.roundCompletion);
    const size = 1080;
    const scale = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(size * scale);
    canvas.height = Math.round(size * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable.");
    ctx.scale(scale, scale);

    const defaultAccent = "#22c55e";
    const accentCandidate = (
      data.accentColor ||
      data.accent ||
      (state.round && (state.round.accent_color || state.round.theme_accent_color || state.round.brand_accent_color)) ||
      ""
    );
    const accent = (typeof accentCandidate === "string" && accentCandidate.trim() && typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("color", accentCandidate.trim()))
      ? accentCandidate.trim()
      : defaultAccent;
    const accentHexMatch = accent.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    const accentRgb = (() => {
      if (!accentHexMatch) return { r: 34, g: 197, b: 94 };
      const raw = accentHexMatch[1];
      const full = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw;
      return {
        r: parseInt(full.slice(0, 2), 16),
        g: parseInt(full.slice(2, 4), 16),
        b: parseInt(full.slice(4, 6), 16)
      };
    })();
    const accentRgba = (alpha) => `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${alpha})`;

    const bg = ctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0, "#1a1a1a");
    bg.addColorStop(0.55, "#141414");
    bg.addColorStop(1, "#0f0f0f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    const ambient = ctx.createRadialGradient(size * 0.2, size * 0.15, 50, size * 0.2, size * 0.15, size * 0.9);
    ambient.addColorStop(0, "rgba(255,255,255,0.06)");
    ambient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = ambient;
    ctx.fillRect(0, 0, size, size);

    const accentGlow = ctx.createRadialGradient(size * 0.82, size * 0.16, 30, size * 0.82, size * 0.16, size * 0.6);
    accentGlow.addColorStop(0, accentRgba(0.18));
    accentGlow.addColorStop(1, accentRgba(0));
    ctx.fillStyle = accentGlow;
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    for (let i = -size; i < size * 2; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i - size, size);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.38)";
    ctx.shadowBlur = 48;
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath();
    ctx.roundRect(66, 66, size - 132, size - 132, 26);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = accentRgba(0.38);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(66, 66, size - 132, size - 132, 26);
    ctx.stroke();

    const textMax = size - 170;
    const metaParts = [];
    const holes = Number.isFinite(Number(data.holesCount)) ? Number(data.holesCount) : null;
    const teeName = String(data.teeName || "").trim();
    if (holes && holes > 0) metaParts.push(`${holes} holes`);
    if (teeName) metaParts.push(`${teeName} tee`);
    const headerMetaText = metaParts.join(" • ");

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "800 78px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#F8FBFF";
    ctx.fillText(fitCanvasText(ctx, data.roundName || "Round Results", textMax), size / 2, 150);

    ctx.fillStyle = accent;
    ctx.fillRect(262, 318, size - 524, 6);

    ctx.font = "500 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#C8D1DF";
    ctx.fillText(fitCanvasText(ctx, data.courseName || "-", textMax), size / 2, 220);

    if (headerMetaText) {
      ctx.font = "500 31px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      ctx.fillStyle = "#AEB8C7";
      ctx.fillText(fitCanvasText(ctx, headerMetaText, textMax), size / 2, 276);
    }

    ctx.font = "600 46px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.fillStyle = accent;
    ctx.fillText("🏆", size / 2, 388);

    ctx.font = "600 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#AEB8C7";
    ctx.fillText("Round Winner", size / 2, 426);

    ctx.font = "600 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#D7DFEC";
    ctx.fillText(fitCanvasText(ctx, data.winnerLabel || "Winner", textMax), size / 2, 462);

    const winnerSpotlight = ctx.createRadialGradient(size / 2, 544, 30, size / 2, 544, 286);
    winnerSpotlight.addColorStop(0, accentRgba(0.17));
    winnerSpotlight.addColorStop(0.62, accentRgba(0.055));
    winnerSpotlight.addColorStop(1, accentRgba(0));
    ctx.fillStyle = winnerSpotlight;
    ctx.fillRect(124, 470, size - 248, 190);

    ctx.save();
    ctx.shadowColor = accentRgba(0.34);
    ctx.shadowBlur = 20;
    ctx.font = "800 64px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(fitCanvasText(ctx, data.winnerNamesText || "-", textMax), size / 2, 538);
    ctx.restore();

    ctx.font = "600 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#BFC8D8";
    ctx.fillText(fitCanvasText(ctx, data.winnerScoreContextText || "-", textMax), size / 2, 582);

    const separation = ctx.createLinearGradient(198, 0, size - 198, 0);
    separation.addColorStop(0, "rgba(255,255,255,0)");
    separation.addColorStop(0.2, accentRgba(0.15));
    separation.addColorStop(0.8, accentRgba(0.15));
    separation.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = separation;
    ctx.fillRect(198, 626, size - 396, 1.5);

    ctx.font = "600 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.fillStyle = accent;
    ctx.fillText("Top 3 Standings", size / 2, 688);

    const standings = Array.isArray(data.standings) ? data.standings.slice(0, 3) : [];
    while (standings.length < 3) standings.push({ place: standings.length + 1, name: "-", score: "-" });
    const rowLeft = 164;
    const rowWidth = size - (rowLeft * 2);
    const rowHeight = 58;
    const rowGap = 14;
    const rowStartY = 726;
    for (let i = 0; i < standings.length; i += 1) {
      const row = standings[i] || {};
      const y = rowStartY + (i * (rowHeight + rowGap));
      const isTop = i === 0;

      ctx.fillStyle = isTop ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.072)";
      ctx.beginPath();
      ctx.roundRect(rowLeft, y, rowWidth, rowHeight, 13);
      ctx.fill();

      ctx.strokeStyle = isTop ? accentRgba(0.34) : "rgba(255,255,255,0.09)";
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.roundRect(rowLeft, y, rowWidth, rowHeight, 13);
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.font = "700 27px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      ctx.fillStyle = isTop ? accent : "#D6DEEC";
      ctx.fillText(`${Number(row.place) || (i + 1)}.`, rowLeft + 24, y + (rowHeight / 2));

      ctx.font = isTop
        ? "700 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        : "600 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      ctx.fillStyle = "#F2F6FF";
      const nameMax = rowWidth - 316;
      ctx.fillText(fitCanvasText(ctx, row.name || "-", nameMax), rowLeft + 82, y + (rowHeight / 2));

      ctx.textAlign = "right";
      ctx.font = isTop
        ? "700 29px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        : "600 27px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      ctx.fillStyle = isTop ? "#ECF5FF" : "#D2DBEA";
      ctx.fillText(fitCanvasText(ctx, row.score || "-", 220), rowLeft + rowWidth - 24, y + (rowHeight / 2));
    }
    ctx.textAlign = "center";

    ctx.font = "500 29px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(334, 952, size - 668, 1.4);
    ctx.fillStyle = "#ADB7C5";
    ctx.fillText("Shared via PocketCaddy", size / 2, 989);

    state.shareImageCanvas = canvas;
    return canvas.toDataURL("image/png");
  }

  function dataUrlToBlob(dataUrl) {
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
      throw new Error("Invalid image data URL.");
    }
    const parts = dataUrl.split(",");
    if (parts.length < 2) throw new Error("Malformed image data URL.");
    const meta = parts[0];
    const payload = parts.slice(1).join(",");
    const mimeMatch = meta.match(/^data:([^;]+);base64$/i);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const binary = atob(payload);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function getShareImageCacheKey(completion) {
    const safeCompletion = completion && completion.isComplete ? completion : state.roundCompletion;
    const roundId = state.round && state.round.id ? String(state.round.id) : "no-round";
    const winnerNames = Array.isArray(safeCompletion && safeCompletion.winnerNames)
      ? safeCompletion.winnerNames.map((name) => String(name || "").trim()).filter(Boolean)
      : [];
    const topThree = Array.isArray(safeCompletion && safeCompletion.topThree)
      ? safeCompletion.topThree.slice(0, 3).map((row) => {
        const name = row && row.name ? String(row.name).trim() : "-";
        const total = row && Number.isFinite(Number(row.total)) ? Number(row.total) : "-";
        const relative = row && Number.isFinite(Number(row.relative)) ? Number(row.relative) : "-";
        return `${name}:${total}:${relative}`;
      })
      : [];
    const winners = Array.isArray(safeCompletion && safeCompletion.leaders)
      ? safeCompletion.leaders.map((row) => `${row && row.id != null ? String(row.id) : "-"}:${formatShareScoreContext(row)}`)
      : [];
    return `${roundId}|${winnerNames.join(",")}|${winners.join(",")}|${topThree.join(",")}`;
  }

  function canvasToPngBlob(canvas) {
    return new Promise((resolve, reject) => {
      if (!canvas || typeof canvas.toBlob !== "function") {
        reject(new Error("Canvas blob export unavailable."));
        return;
      }
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create PNG blob."));
      }, "image/png");
    });
  }

  async function getOrCreateShareImageBlob(completion) {
    const cacheKey = getShareImageCacheKey(completion);
    if (state.shareImageBlob && state.shareImageBlobKey === cacheKey) {
      return state.shareImageBlob;
    }
    const shareImageData = buildShareImageData(completion);
    generateShareImage(shareImageData);
    const canvas = state.shareImageCanvas;
    const blob = await canvasToPngBlob(canvas);
    state.shareImageBlob = blob;
    state.shareImageBlobKey = cacheKey;
    state.shareImageCanvasKey = cacheKey;
    return blob;
  }

  async function saveRoundShareImage() {
    if (state.shareSaveInFlight) return;
    if (!state.roundCompletion || !state.roundCompletion.isComplete) {
      showFeedback("Round incomplete. Finish all holes to save image.", "error");
      return;
    }
    state.shareSaveInFlight = true;
    const button = getRoundSaveImageButton();
    const originalText = button ? String(button.textContent || "Save Image") : "Save Image";
    if (button) {
      button.disabled = true;
      button.textContent = "Saving...";
    }
    try {
      const blob = await getOrCreateShareImageBlob(state.roundCompletion);
      downloadShareImage(blob);
      showFeedback("Saved!", "success");
      if (button) button.textContent = "Saved!";
    } catch (_err) {
      showFeedback("Save image failed.", "error");
      if (button) button.textContent = originalText;
    } finally {
      setTimeout(() => {
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
        state.shareSaveInFlight = false;
      }, 850);
    }
  }

  function downloadShareImage(blob) {
    if (!blob) return false;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const name = `pocketcaddy-round-${timestamp}.png`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  }

  async function shareRound() {
    if (state.shareInFlight) return;
    if (!state.roundCompletion || !state.roundCompletion.isComplete) {
      showFeedback("Round incomplete. Finish all holes to share.", "error");
      return;
    }
    state.shareInFlight = true;
    const summaryText = buildRoundShareText(state.roundCompletion);
    setShareButtonLoading(true);
    showFeedback("Preparing share options...", "neutral");
    let imageBlob = null;
    let imageError = null;
    let shouldDelayButtonReset = false;
    try {
      try {
        imageBlob = await getOrCreateShareImageBlob(state.roundCompletion);
      } catch (err) {
        imageError = err || new Error("Image generation unavailable.");
      }
      if (typeof navigator.share === "function") {
        setRoundShareButtonLabel("Opening Share...");
        const shareData = {
          title: "Golf Round Results",
          text: summaryText
        };
        if (imageBlob && typeof window.File === "function") {
          const shareFile = new File([imageBlob], "golf-round-results.png", { type: "image/png" });
          const supportsFiles = typeof navigator.canShare !== "function" || navigator.canShare({ files: [shareFile] });
          if (supportsFiles) {
            shareData.files = [shareFile];
          }
        }
        await navigator.share(shareData);
        if (Array.isArray(shareData.files) && shareData.files.length) {
          showFeedback("Round results shared with image.", "success");
        } else {
          showFeedback("Round results shared.", imageError ? "neutral" : "success");
        }
        setShareButtonPostShareState("Shared", { holdMs: 1500 });
        shouldDelayButtonReset = true;
        return;
      }
      setRoundShareButtonLabel("Saving...");
      if (imageBlob) {
        downloadShareImage(imageBlob);
      }
      const copied = await copyShareText(summaryText);
      if (imageBlob && copied) {
        showFeedback("Image downloaded. Summary copied.", "success");
        setShareButtonPostShareState("Downloaded + Copied", { holdMs: 1550 });
        shouldDelayButtonReset = true;
        return;
      }
      if (imageBlob) {
        showFeedback("Image downloaded.", "success");
        setShareButtonPostShareState("Image Downloaded", { holdMs: 1500 });
        shouldDelayButtonReset = true;
        return;
      }
      if (copied) {
        showFeedback(imageError ? "Summary copied. Image unavailable." : "Summary copied.", imageError ? "neutral" : "success");
        setShareButtonPostShareState("Copied", { holdMs: 1450 });
        shouldDelayButtonReset = true;
        return;
      }
      showFeedback("Share failed.", "error");
      setShareButtonPostShareState("Share Failed", { holdMs: 1650 });
      shouldDelayButtonReset = true;
      window.alert(summaryText);
    } catch (err) {
      if (err && err.name === "AbortError") {
        showFeedback("Share canceled.", "neutral");
        setShareButtonPostShareState("Share Canceled", { holdMs: 1200 });
        shouldDelayButtonReset = true;
        return;
      }
      const copied = await copyShareText(summaryText);
      if (copied) {
        showFeedback("Summary copied.", "neutral");
        setShareButtonPostShareState("Copied", { holdMs: 1500 });
        shouldDelayButtonReset = true;
        return;
      }
      showFeedback("Share failed.", "error");
      setShareButtonPostShareState("Share Failed", { holdMs: 1650 });
      shouldDelayButtonReset = true;
      window.alert(summaryText);
    } finally {
      state.shareInFlight = false;
      if (!shouldDelayButtonReset) {
        setShareButtonLoading(false);
        syncRoundShareButtonState();
      }
    }
  }

  function getThroughHoleCount(holesTotal) {
    const holes = Number(holesTotal);
    if (!Number.isInteger(holes) || holes < 1) return 0;
    const players = Array.isArray(state.players) ? state.players : [];
    if (!players.length) return 0;
    let through = 0;
    for (let hole = 1; hole <= holes; hole += 1) {
      const completeForAll = players.every((player) => Number.isInteger(getScore(player.id, hole)));
      if (!completeForAll) break;
      through = hole;
    }
    return through;
  }

  function display(v) {
    return v == null ? "-" : String(v);
  }

  function formatDecimal(value, digits) {
    if (value == null || !Number.isFinite(Number(value))) return "-";
    return Number(value).toFixed(digits);
  }

  function formatSignedDecimal(value, digits) {
    if (value == null || !Number.isFinite(Number(value))) return "-";
    const fixed = Number(value).toFixed(digits);
    const normalized = Number(fixed);
    if (normalized === 0) return "E";
    return normalized > 0 ? `+${fixed}` : fixed;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  let legacyBooted = false;
  function boot() {
    if (legacyBooted) return;
    legacyBooted = true;
    init();
  }

  window.PocketCaddyAppRuntimeLegacy = {
    boot: boot
  };
})();
