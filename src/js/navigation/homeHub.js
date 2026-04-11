(function () {
  "use strict";

  const HOME_MODE = "home";
  const VALID_MODES = new Set(["home", "operations", "history", "golf"]);
  const HOME_MODE_CLASSES = [
    "home-mode-home",
    "home-mode-operations",
    "home-mode-history",
    "home-mode-golf"
  ];
  const HOME_TRIGGER_SELECTOR = "[data-home-mode], #hub-create-btn, #hub-join-btn, #quick-create-btn, #quick-join-btn, #quick-history-btn, #continuity-history-btn";

  const state = {
    homeView: null,
    mode: HOME_MODE,
    wired: false,
    onModeChange: null
  };

  function focusById(id) {
    if (!id) return;
    const node = document.getElementById(String(id));
    if (!node || typeof node.focus !== "function") return;
    try {
      node.focus({ preventScroll: true });
    } catch (_err) {
      node.focus();
    }
  }

  function normalizeMode(mode) {
    return VALID_MODES.has(mode) ? mode : HOME_MODE;
  }

  function getFocusTarget(options) {
    if (!options || typeof options !== "object") return "";
    return String(options.focusTarget || "").trim();
  }

  function setMode(mode, options) {
    if (!state.homeView) return;
    const safeMode = normalizeMode(mode);
    const opts = options && typeof options === "object" ? options : {};
    const focusTarget = getFocusTarget(opts);
    state.mode = safeMode;
    state.homeView.classList.remove.apply(state.homeView.classList, HOME_MODE_CLASSES);
    state.homeView.classList.add(`home-mode-${safeMode}`);
    if (typeof state.onModeChange === "function") {
      state.onModeChange(safeMode);
    }
    if (focusTarget && !opts.skipFocus) {
      focusById(focusTarget);
    }
  }

  function getMode() {
    return state.mode;
  }

  function onHomeViewClick(event) {
    if (!state.homeView) return;
    const trigger = event.target.closest(HOME_TRIGGER_SELECTOR);
    if (!trigger) return;

    const triggerId = trigger.id || "";
    if (triggerId === "hub-create-btn" || triggerId === "quick-create-btn") {
      event.preventDefault();
      setMode("operations", { focusTarget: "home-operations-section", skipFocus: true });
      window.setTimeout(() => {
        focusById("round-name");
      }, 40);
      return;
    }
    if (triggerId === "hub-join-btn" || triggerId === "quick-join-btn") {
      event.preventDefault();
      setMode("operations", { focusTarget: "home-operations-section", skipFocus: true });
      window.setTimeout(() => {
        focusById("join-input");
      }, 40);
      return;
    }
    if (triggerId === "quick-history-btn" || triggerId === "continuity-history-btn") {
      event.preventDefault();
      setMode("history", { focusTarget: "round-history-section" });
      return;
    }

    const mode = String(trigger.getAttribute("data-home-mode") || "").trim();
    if (!mode) return;
    const focusTarget = String(trigger.getAttribute("data-focus-target") || "").trim();
    setMode(mode, { focusTarget: focusTarget || null });
  }

  function onHomeModeEvent(event) {
    const detail = event && event.detail && typeof event.detail === "object" ? event.detail : {};
    setMode(detail.mode, {
      focusTarget: detail.focusTarget || null,
      skipFocus: Boolean(detail.skipFocus)
    });
  }

  function initializeHomeHub(config) {
    const opts = config && typeof config === "object" ? config : {};
    const homeView = opts.homeView || document.getElementById("home-view");
    if (!homeView) return;

    if (state.wired && state.homeView && state.homeView !== homeView) {
      state.homeView.removeEventListener("click", onHomeViewClick);
    }
    if (state.wired) {
      homeView.removeEventListener("click", onHomeViewClick);
      window.removeEventListener("pocketcaddy:home-mode", onHomeModeEvent);
    }

    state.homeView = homeView;
    state.onModeChange = typeof opts.onModeChange === "function" ? opts.onModeChange : null;
    state.wired = true;

    state.homeView.addEventListener("click", onHomeViewClick);
    window.addEventListener("pocketcaddy:home-mode", onHomeModeEvent);

    window.PocketCaddyHomeHub = {
      setMode: setMode,
      getMode: getMode
    };
  }

  window.PocketCaddyHomeHubModule = {
    initializeHomeHub: initializeHomeHub,
    setMode: setMode,
    getMode: getMode
  };
})();
