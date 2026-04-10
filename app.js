(function () {
  "use strict";

  const MAX_PLAYERS = 30;
  const MIN_SCORE = 1;
  const MAX_SCORE = 15;
  const SESSION_KEY = "pocketcaddy_live_session_v2";
  const IDENTITY_KEY_PREFIX = "pocketcaddy_identity_";
  const WEATHER_FETCH_TIMEOUT_MS = 4500;
  const INTEL_UNAVAILABLE = "Unavailable";
  const INTEL_LOADING = "Loading...";

  const dom = {
    startChoiceView: document.getElementById("start-choice-view"),
    resumeSessionBtn: document.getElementById("resume-session-btn"),
    startFreshBtn: document.getElementById("start-fresh-btn"),

    homeView: document.getElementById("home-view"),
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
    hubCreateBtn: document.getElementById("hub-create-btn"),
    hubJoinBtn: document.getElementById("hub-join-btn"),
    quickCreateBtn: document.getElementById("quick-create-btn"),
    quickJoinBtn: document.getElementById("quick-join-btn"),
    quickResumeBtn: document.getElementById("quick-resume-btn"),
    quickCancelSavedBtn: document.getElementById("quick-cancel-saved-btn"),
    createRoundSection: document.getElementById("create-round-section"),
    joinRoundSection: document.getElementById("join-round-section"),

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
    lastAutoScrollIdentityToken: null,
    recentScoreFlashKey: null,
    scoreFlashTimer: null,
    lastLeaderSignature: null,
    leaderPulseOn: false,
    leaderPulseTimer: null
  };

  function init() {
    console.log("PocketCaddy v1 live");
    wireEvents();
    renderSetupPlayers();
    renderSelectedCourseCard();
    renderCourseSuggestions([]);

    const fromUrl = getRoundIdFromUrl();
    if (fromUrl) {
      joinRoundById(fromUrl).catch((err) => {
        showError(dom.homeError, "Could not open that shared round link.");
        showFeedback("Unable to open round from link.", true);
        showView("home");
        console.error(err);
      });
      return;
    }

    const session = getSession();
    showView("home");
  }

  function wireEvents() {
    dom.resumeSessionBtn.addEventListener("click", resumeSession);
    dom.startFreshBtn.addEventListener("click", () => {
      clearLocalSavedSessionState();
      showView("home");
    });

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
    dom.hubCreateBtn.addEventListener("click", () => jumpToHomeSection("create"));
    dom.hubJoinBtn.addEventListener("click", () => jumpToHomeSection("join"));
    dom.quickCreateBtn.addEventListener("click", () => jumpToHomeSection("create"));
    dom.quickJoinBtn.addEventListener("click", () => jumpToHomeSection("join"));
    dom.quickResumeBtn.addEventListener("click", resumeSession);
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
  }

  function showView(name) {
    dom.startChoiceView.classList.add("hidden");
    dom.homeView.classList.add("hidden");
    dom.scoreView.classList.add("hidden");
    if (name === "start-choice") dom.startChoiceView.classList.remove("hidden");
    if (name === "home") {
      dom.homeView.classList.remove("hidden");
      updateHomeQuickActions();
      setTimeout(() => dom.joinInput.focus(), 0);
    }
    if (name === "score") dom.scoreView.classList.remove("hidden");
  }

  function showError(node, message) {
    if (!message) {
      node.classList.add("hidden");
      node.textContent = "";
      return;
    }
    node.classList.remove("hidden");
    node.textContent = message;
  }

  function showFeedback(message, isError) {
    clearTimeout(state.feedbackTimer);
    dom.scoreFeedback.textContent = message;
    dom.scoreFeedback.classList.remove("hidden");
    dom.scoreFeedback.classList.toggle("error", Boolean(isError));
    state.feedbackTimer = setTimeout(() => {
      dom.scoreFeedback.classList.add("hidden");
      dom.scoreFeedback.classList.remove("error");
    }, 2200);
  }

  function updateHomeQuickActions() {
    const session = getSession();
    const hasSavedRound = Boolean(session && session.roundId);
    dom.quickResumeBtn.classList.toggle("hidden", !hasSavedRound);
    if (dom.quickCancelSavedBtn) {
      dom.quickCancelSavedBtn.classList.toggle("hidden", !hasSavedRound);
      dom.quickCancelSavedBtn.disabled = !hasSavedRound;
    }
  }

  function cancelSavedRoundSession() {
    const session = getSession();
    if (!session || !session.roundId) {
      updateHomeQuickActions();
      return;
    }
    const ok = window.confirm("Remove this saved round from this device? The shared round will still exist for anyone with the link.");
    if (!ok) return;
    clearLocalSavedSessionState(session.roundId);
updateHomeQuickActions();

showFeedback("Saved round removed from this device.");

if (!dom.homeView.classList.contains("hidden")) {
  showError(dom.homeError, "");
}
  }

  function jumpToHomeSection(section) {
    if (section === "create") {
      if (dom.createRoundSection) dom.createRoundSection.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => dom.roundName.focus(), 80);
      return;
    }
    if (section === "join") {
      if (dom.joinRoundSection) dom.joinRoundSection.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => dom.joinInput.focus(), 80);
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
      setCourseSearchStatus(query.length === 0 ? "" : "Type at least 2 characters");
      return;
    }
    clearTimeout(state.courseSearchTimer);
    setCourseSearchStatus("Searching...");
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
    if (!typed || typed !== selectedName) clearSelectedCourse({ keepCourseName: true });
  }

  async function searchCourses(query) {
    try {
      const results = await window.SupabaseAPI.searchCourses(query);
      state.courseSearchResults = Array.isArray(results) ? results : [];
      renderCourseSuggestions(state.courseSearchResults);
      if (state.courseSearchResults.length === 0) {
        setCourseSearchStatus("No matching courses found");
      } else {
        setCourseSearchStatus("");
      }
    } catch (_err) {
      state.courseSearchResults = [];
      renderCourseSuggestions([]);
      setCourseSearchStatus("Search unavailable. Enter Course Name manually.");
    }
  }

  function renderCourseSuggestions(results) {
    if (!dom.courseSearchList) return;
    const list = Array.isArray(results) ? results : [];
    if (list.length === 0) {
      dom.courseSearchList.classList.add("hidden");
      dom.courseSearchList.innerHTML = "";
      return;
    }
    dom.courseSearchList.innerHTML = list.map((item, index) => `
      <button class="course-suggestion" type="button" data-index="${index}" role="option">
        <div class="course-suggestion-main">${escapeHtml(item.displayName || "")}</div>
        <div class="course-suggestion-sub">${escapeHtml(item.locationText || "Location unavailable")}</div>
      </button>
    `).join("");
    dom.courseSearchList.classList.remove("hidden");
  }

  function setCourseSearchStatus(message) {
    if (!dom.courseSearchStatus) return;
    const text = String(message || "");
    if (!text) {
      dom.courseSearchStatus.classList.add("hidden");
      dom.courseSearchStatus.textContent = "";
      return;
    }
    dom.courseSearchStatus.classList.remove("hidden");
    dom.courseSearchStatus.textContent = text;
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
    setCourseSearchStatus("Course selected");
    renderSelectedCourseCard();
  }

  function clearSelectedCourse(options) {
    const opts = options || {};
    state.selectedCourseMetadata = null;
    if (!opts.keepCourseName && dom.courseName) dom.courseName.value = "";
    if (dom.courseSearchInput) dom.courseSearchInput.value = "";
    state.courseSearchResults = [];
    renderCourseSuggestions([]);
    setCourseSearchStatus("");
    renderSelectedCourseCard();
  }

  function renderSelectedCourseCard() {
    if (!dom.selectedCourseCard) return;
    const selected = state.selectedCourseMetadata;
    if (!selected) {
      dom.selectedCourseCard.classList.add("hidden");
      dom.selectedCourseCard.innerHTML = "";
      return;
    }
    const latLng = Number.isFinite(selected.lat) && Number.isFinite(selected.lng)
      ? `${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`
      : "Unavailable";
    const sourceText = selected.source ? `Search source: ${selected.source}` : "";
    dom.selectedCourseCard.innerHTML = `
      <h4>Selected: ${escapeHtml(selected.displayName || "-")}</h4>
      <p>${escapeHtml(selected.locationText || "Location unavailable")}</p>
      <p>Coordinates: ${escapeHtml(latLng)}</p>
      ${sourceText ? `<p>${escapeHtml(sourceText)}</p>` : ""}
      <button class="btn btn-secondary" type="button" data-action="clear">Clear Selection</button>
    `;
    dom.selectedCourseCard.classList.remove("hidden");
  }

  function removeSetupPlayer(localId) {
    state.setupPlayers = state.setupPlayers.filter((p) => p.id !== localId);
    renderSetupPlayers();
  }

  function renderSetupPlayers() {
    dom.playerCount.textContent = `(${state.setupPlayers.length} / ${MAX_PLAYERS})`;
    if (!state.setupPlayers.length) {
      dom.setupPlayerList.innerHTML = '<p class="muted tiny">No players added yet.</p>';
      return;
    }
    dom.setupPlayerList.innerHTML = state.setupPlayers.map((p, i) => {
      return `
        <div class="setup-player-row">
          <div class="setup-player-main">
            <span class="setup-player-index">${i + 1}.</span>
            <input class="setup-player-name" type="text" data-local-id="${p.id}" value="${escapeHtml(p.name)}">
          </div>
          <button class="btn btn-danger setup-remove-btn" type="button" data-local-id="${p.id}">Remove</button>
        </div>
      `;
    }).join("");

    dom.setupPlayerList.querySelectorAll(".setup-player-name").forEach((input) => {
      input.addEventListener("input", (e) => {
        const id = e.target.getAttribute("data-local-id");
        const p = state.setupPlayers.find((x) => x.id === id);
        if (p) p.name = e.target.value;
      });
      input.addEventListener("blur", (e) => {
        const id = e.target.getAttribute("data-local-id");
        const p = state.setupPlayers.find((x) => x.id === id);
        if (!p) return;
        p.name = String(p.name || "").trim();
        e.target.value = p.name;
      });
    });
    dom.setupPlayerList.querySelectorAll(".setup-remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => removeSetupPlayer(e.target.getAttribute("data-local-id")));
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

  async function createRound() {
    const input = validateCreateInputs();
    if (input.error) {
      showError(dom.homeError, input.error);
      return;
    }
    dom.createRoundBtn.disabled = true;
    showError(dom.homeError, "");
    try {
      const created = await window.SupabaseAPI.createRoundWithPlayers(input);
      await loadRound(created.round.id);
      saveSession({ roundId: created.round.id });
      updateUrlRoundParam(created.round.id);
      showView("score");
    } catch (err) {
      showError(dom.homeError, "Could not create round. Please try again.");
      console.error(err);
    } finally {
      dom.createRoundBtn.disabled = false;
    }
  }

  async function joinFromInput() {
    const text = dom.joinInput.value.trim();
    dom.joinInput.value = text;
    if (!text) {
      showError(dom.joinError, "Enter a Round Link or Full Round ID.");
      return;
    }
    dom.joinRoundBtn.disabled = true;
    showError(dom.joinError, "");
    try {
      const round = await window.SupabaseAPI.findRoundByCodeOrLink(text);
      if (!round) {
        showError(dom.joinError, "Round not found.");
        return;
      }
      await joinRoundById(round.id);
    } catch (err) {
      showError(dom.joinError, "Could not join that round.");
      console.error(err);
    } finally {
      dom.joinRoundBtn.disabled = false;
    }
  }

  async function joinRoundById(roundId) {
    await loadRound(roundId);
    saveSession({ roundId: roundId });
    updateUrlRoundParam(roundId);
    showView("score");
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
      html += `
        <button
          class="hole-intelligence-tile ${selected ? "active" : ""}"
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
    if (!state.round) return;
    state.selectedHole = clampHoleSelection(hole, state.round.holes);
    renderHoleIntelligenceStrip();
    renderShotIntelligencePanel();
    renderHoleDetailEditor();
    renderScoreTable();
    scrollScoreTableToHole(hole);
    scrollHoleTileIntoView(hole);
  }

  function scrollScoreTableToHole(hole) {
    if (!dom.scoreScrollContainer || !dom.scoreTable) return;
    const target = dom.scoreTable.querySelector(`th[data-hole="${hole}"]`);
    if (!target) return;
    const left = Math.max(0, target.offsetLeft - 76);
    try {
      dom.scoreScrollContainer.scrollTo({ left: left, behavior: "smooth" });
    } catch (_err) {
      dom.scoreScrollContainer.scrollLeft = left;
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

    renderScoreUxMeta();
    renderParRow();
    renderLeaderboard();
    renderScoreTable();
    maybeShowScoreTooltipOnce();
    if (opts.scrollToIdentity) scheduleScrollToIdentityRow(Boolean(opts.forceScroll));
  }

  function getCourseIntelRoundKey(round) {
    if (!round) return "no-round";
    const lat = Number(round.course_lat);
    const lng = Number(round.course_lng);
    const latText = Number.isFinite(lat) ? lat.toFixed(6) : "na";
    const lngText = Number.isFinite(lng) ? lng.toFixed(6) : "na";
    return [
      String(round.id || ""),
      displayUnavailableOrValue(round.course, "-"),
      displayUnavailableOrValue(round.course_location_text, INTEL_UNAVAILABLE),
      latText,
      lngText
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
      previewUrl: null
    };
  }

  function sanitizeCourseIntelContext(context) {
    const raw = context || {};
    const safe = buildUnavailableCourseContext();
    safe.name = displayUnavailableOrValue(raw.name, "-");
    safe.locationText = displayUnavailableOrValue(raw.locationText, INTEL_UNAVAILABLE);
    safe.coordsText = displayUnavailableOrValue(raw.coordsText, INTEL_UNAVAILABLE);
    safe.mappedDetailText = displayUnavailableOrValue(raw.mappedDetailText, INTEL_UNAVAILABLE);
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
    dom.scoreHint.textContent = "Tap a hole to enter score";
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

    const standings = buildStandings();
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
    summary.textContent = `${target.name}: ${formatRelativeToPar(target.relative)} (Birdies: ${birdies})`;
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
    if (!state.round) return;
    const holes = state.round.holes;
    let html = "";
    for (let hole = 1; hole <= holes; hole += 1) {
      const par = getPar(hole);
      const saving = state.pendingParHoles.has(hole);
      html += `
        <label class="par-input-wrap ${saving ? "saving" : ""}">
          <span>H${hole}</span>
          <input class="par-input" type="number" min="3" max="6" step="1" data-hole="${hole}" value="${par == null ? "" : par}">
        </label>
      `;
    }
    dom.parRow.innerHTML = html;
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
    renderLeaderboard();
    renderScoreTable();
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

  function renderLeaderboard() {
    const showBack = state.round.holes === 18;
    const rows = buildStandings();
    const leaderIds = rows.filter((r) => r.isLeader).map((r) => String(r.id)).sort();
    const signature = leaderIds.join("|");
    if (state.lastLeaderSignature !== null && state.lastLeaderSignature !== signature) {
      state.leaderPulseOn = true;
      clearTimeout(state.leaderPulseTimer);
      state.leaderPulseTimer = setTimeout(() => {
        state.leaderPulseOn = false;
        renderLeaderboard();
      }, 850);
    }
    state.lastLeaderSignature = signature;

    dom.leaderboardBody.innerHTML = rows.map((r) => `
      <tr class="${r.isLeader ? "leader-row" : ""} ${r.isLeader && state.leaderPulseOn ? "leader-pulse" : ""}">
        <td><strong>${r.rank}</strong></td>
        <td>${escapeHtml(r.name)}</td>
        <td>${display(r.front)}</td>
        ${showBack ? `<td>${display(r.back)}</td>` : ""}
        <td><strong>${display(r.total)}</strong>${r.total == null ? "" : ` <span class="leader-relative">${formatRelativeToPar(r.relative)}</span>`}</td>
      </tr>
    `).join("");
  }

  function renderScoreTable() {
    renderScoreUxMeta();
    const holes = state.round.holes;
    const showBack = holes === 18;
    const standings = buildStandings();
    const leaders = new Set(standings.filter((s) => s.isLeader).map((s) => s.id));

    let head = '<thead><tr><th class="sticky-player">Player</th>';
    for (let hole = 1; hole <= holes; hole += 1) {
      const selectedClass = state.selectedHole === hole ? "score-hole-selected" : "";
      head += `<th data-hole="${hole}" class="${hole <= 9 ? "front-head" : "back-head"} ${selectedClass}">H${hole}</th>`;
    }
    head += '<th class="tot-head">Front</th>';
    if (showBack) head += '<th class="tot-head">Back</th>';
    head += '<th class="tot-head">Total</th></tr></thead>';

    let body = "<tbody>";
    body += '<tr class="par-display-row">';
    body += '<td class="sticky-player"><span class="player-name">Par</span><span class="player-note">By hole</span></td>';
    for (let hole = 1; hole <= holes; hole += 1) {
      const selectedClass = state.selectedHole === hole ? "score-hole-selected" : "";
      body += `<td class="${hole > 9 ? "back-cell" : ""} ${selectedClass}"><span class="par-chip">${display(getPar(hole))}</span></td>`;
    }
    body += '<td class="tot-cell">-</td>';
    if (showBack) body += '<td class="tot-cell">-</td>';
    body += '<td class="tot-cell">-</td>';
    body += "</tr>";

    state.players.forEach((player) => {
      const totals = getTotals(player.id);
      const editableRow = isEditablePlayerRow(player.id);
      const rowClasses = [
        leaders.has(player.id) ? "score-leader-row" : "",
        editableRow ? "your-player-row" : ""
      ].filter(Boolean).join(" ");
      body += `<tr class="${rowClasses}" data-player-id="${player.id}">`;
      body += `<td class="sticky-player"><span class="player-name">${escapeHtml(player.name)}</span><span class="player-note">${editableRow ? "You can edit this row" : "Read-only"}</span></td>`;
      for (let hole = 1; hole <= holes; hole += 1) {
        const key = scoreKey(player.id, hole);
        const val = getScore(player.id, hole);
        const text = val == null ? "-" : String(val);
        const par = getPar(hole);
        const delta = getScoreDelta(val, hole);
        const relative = formatRelativeToPar(delta);
        const term = getGolfTerm(val, par);
        const termClass = getGolfTermClass(term);
        const active = state.activeCell && state.activeCell.playerId === player.id && state.activeCell.hole === hole;
        const saving = state.pendingScoreKeys.has(key);
        const flash = state.recentScoreFlashKey === key;
        const subLabel = val == null ? "" : (term || relative);
        const selectedClass = state.selectedHole === hole ? "score-hole-selected" : "";
        const title = val == null
          ? `${player.name} hole ${hole}`
          : `${player.name} hole ${hole}: ${text} (${relative})${term ? ` ${term}` : ""}`;
        body += `
          <td class="${hole > 9 ? "back-cell" : ""} ${selectedClass}">
            <button
              class="score-btn ${val == null ? "empty" : ""} ${active ? "active" : ""} ${editableRow ? "" : "readonly"} ${saving ? "saving" : ""} ${termClass} ${flash ? "score-updated-flash" : ""}"
              type="button"
              data-player-id="${player.id}"
              data-hole="${hole}"
              ${(editableRow && !saving) ? "" : "disabled"}
              aria-label="${escapeHtml(player.name)} hole ${hole} score ${text} ${term ? term : ""}"
              title="${escapeHtml(title)}">
              <span class="score-main">${saving ? "..." : text}</span>
              <span class="score-sub ${subLabel ? "" : "hidden"}">${escapeHtml(subLabel)}</span>
            </button>
          </td>
        `;
      }
      body += `<td class="tot-cell">${display(totals.front)}</td>`;
      if (showBack) body += `<td class="tot-cell">${display(totals.back)}</td>`;
      body += `<td class="tot-cell">${display(totals.total)}</td>`;
      body += "</tr>";
    });
    body += "</tbody>";
    dom.scoreTable.innerHTML = head + body;
  }

  function onScoreTableClick(event) {
    const btn = event.target.closest(".score-btn");
    if (!btn || !dom.scoreTable.contains(btn)) return;
    if (btn.disabled) return;
    const playerId = btn.getAttribute("data-player-id");
    const hole = Number(btn.getAttribute("data-hole"));
    if (!playerId || !Number.isInteger(hole) || hole < 1) return;
    if (state.round) state.selectedHole = clampHoleSelection(hole, state.round.holes);
    renderHoleIntelligenceStrip();
    renderShotIntelligencePanel();
    renderHoleDetailEditor();
    renderScoreTable();
    scrollHoleTileIntoView(hole);
    openPicker(playerId, hole);
  }

  function openPicker(playerId, hole) {
    state.activeCell = { playerId: playerId, hole: hole };
    const player = state.players.find((p) => p.id === playerId);
    const current = getScore(playerId, hole);
    const par = getPar(hole);
    const term = getGolfTerm(current, par);
    const rel = formatRelativeToPar(getScoreDelta(current, hole));
    const parText = Number.isInteger(par) ? `Par ${par}` : "Par -";
    const currentText = current == null ? "-" : `${current} (${rel}${term ? ` ${term}` : ""})`;
    dom.pickerTitle.textContent = `${player ? player.name : "Player"} - Hole ${hole} (${parText}, Current: ${currentText})`;
    dom.pickerStatus.classList.add("hidden");
    dom.pickerGrid.innerHTML = Array.from({ length: 15 }, (_, i) => i + 1)
      .map((v) => `<button class="pick-btn" type="button" data-v="${v}">${v}</button>`)
      .join("");

    dom.pickerGrid.querySelectorAll(".pick-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await setScore(Number(btn.getAttribute("data-v")));
      });
    });
    dom.picker.classList.remove("hidden");
    updatePickerBusyState();
    renderScoreTable();
  }

  function closePicker() {
    state.activeCell = null;
    dom.picker.classList.add("hidden");
    if (state.round) renderScoreTable();
  }

  async function setScore(value) {
    if (!state.activeCell || !state.round) return;
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
    renderLeaderboard();
    renderScoreTable();
    updatePickerBusyState();

    try {
      if (nextValue == null) {
        await window.SupabaseAPI.deleteScore({ roundId: state.round.id, playerId: playerId, hole: hole });
      } else {
        await window.SupabaseAPI.upsertScore({ roundId: state.round.id, playerId: playerId, hole: hole, value: nextValue });
      }
      setRecentScoreFlash(key);
    } catch (_err) {
      if (hadPrev) state.scoreMap[key] = prevValue;
      else delete state.scoreMap[key];
      showFeedback("Could not save score. Please try again.", true);
    } finally {
      state.pendingScoreKeys.delete(key);
      syncPotSettingsLockState();
      renderLeaderboard();
      renderScoreTable();
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
    await setScore(next);
  }

  async function clearActiveScore() {
    if (!state.activeCell) return;
    await setScore(null);
  }

  function updatePickerBusyState() {
    if (!state.activeCell) return;
    const key = scoreKey(state.activeCell.playerId, state.activeCell.hole);
    const busy = state.pendingScoreKeys.has(key);
    dom.pickerStatus.classList.toggle("hidden", !busy);
    dom.pickerGrid.querySelectorAll(".pick-btn").forEach((btn) => { btn.disabled = busy; });
    dom.pickerMinus.disabled = busy;
    dom.pickerPlus.disabled = busy;
    dom.pickerClear.disabled = busy;
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
    renderLeaderboard();
    renderScoreTable();
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
    renderLeaderboard();
    renderScoreTable();
  }

  async function refreshPlayers() {
    if (!state.round) return;
    state.players = await window.SupabaseAPI.getPlayers(state.round.id);
    const found = state.identityName ? findPlayerByName(state.identityName) : null;
    if (!found) {
      state.identityName = null;
      state.identityPlayerId = null;
      openNameModal(false);
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
    const session = getSession();
    if (!session || !session.roundId) {
      showView("home");
      return;
    }
    try {
      await joinRoundById(session.roundId);
    } catch (err) {
      clearLocalSavedSessionState(session.roundId);
      showView("home");
      showError(dom.homeError, "Could not resume saved session.");
      console.error(err);
    }
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
    state.leaderPulseOn = false;
    clearTimeout(state.scoreFlashTimer);
    clearTimeout(state.leaderPulseTimer);
    clearLocalSavedSessionState(previousRoundId);
    clearUrlRoundParam();
    closePicker();
    closeNameModal();
    showView("home");
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
      showFeedback("Round scores cleared.");
    })().catch((err) => {
      showFeedback("Could not clear scores. Please try again.", true);
      console.error(err);
    });
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
    if (!state.round) return;
    const pot = parseMoney(state.round.pot_amount);
    const p1 = parsePercent(state.round.payout_first);
    const p2 = parsePercent(state.round.payout_second);
    const p3 = parsePercent(state.round.payout_third);
    const payoutByPos = {
      1: pot * (p1 / 100),
      2: pot * (p2 / 100),
      3: pot * (p3 / 100)
    };

    const totalPct = p1 + p2 + p3;
    if (Math.abs(totalPct - 100) > 0.0001) {
      dom.payoutWarning.classList.remove("hidden");
      dom.payoutWarning.textContent = `Payout percentages total ${totalPct.toFixed(2)}% (not 100%).`;
    } else {
      dom.payoutWarning.classList.add("hidden");
      dom.payoutWarning.textContent = "";
    }

    dom.payoutPositionBody.innerHTML = `
      <tr><td>1st</td><td>${p1.toFixed(2)}%</td><td>${money(payoutByPos[1])}</td></tr>
      <tr><td>2nd</td><td>${p2.toFixed(2)}%</td><td>${money(payoutByPos[2])}</td></tr>
      <tr><td>3rd</td><td>${p3.toFixed(2)}%</td><td>${money(payoutByPos[3])}</td></tr>
      <tr><td><strong>Total Pot</strong></td><td>-</td><td><strong>${money(pot)}</strong></td></tr>
    `;

    const standings = buildStandings();
    const payoutMap = calculateProjectedPayouts(standings, payoutByPos);
    dom.payoutPlayerBody.innerHTML = standings.map((row) => {
      return `<tr><td>${escapeHtml(row.name)}</td><td><strong>${money(payoutMap[row.id] || 0)}</strong></td></tr>`;
    }).join("");
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

  async function copyShareLink() {
    const text = dom.shareLink.value;
    try {
      await navigator.clipboard.writeText(text);
      const prev = dom.copyLinkBtn.textContent;
      clearTimeout(state.copyBtnTimer);
      dom.copyLinkBtn.textContent = "Copied";
      showFeedback("Share link copied.");
      state.copyBtnTimer = setTimeout(() => { dom.copyLinkBtn.textContent = prev; }, 1000);
    } catch (_err) {
      window.alert(text);
    }
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function clearLocalSavedSessionState(roundId) {
    const session = getSession();
    const resolvedRoundId = roundId || (session && session.roundId) || null;
    clearSession();
    if (!resolvedRoundId) return;
    try {
      localStorage.removeItem(identityKey(resolvedRoundId));
    } catch (_err) {
      // localStorage may be unavailable; session clear is still the primary action
    }
  }

  function identityKey(roundId) {
    return `${IDENTITY_KEY_PREFIX}${roundId}`;
  }

  function display(v) {
    return v == null ? "-" : String(v);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
