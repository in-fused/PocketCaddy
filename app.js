(function () {
  "use strict";

  const state = {
    runtimeBootQueued: false,
    runtimeBooted: false,
    eventsWired: false,
    globalGuardsWired: false,
    exportUtilsLoadAttempted: false,
    exportUtils: null,
    exportEventsWired: false
  };

  // INIT
  function init() {
    wireGlobalErrorGuards();
    wireEvents();
    loadExportUtils();
    queueRuntimeBoot();
  }

  // EVENT LISTENERS
  function wireEvents() {
    if (state.eventsWired) return;
    state.eventsWired = true;
    document.addEventListener("pocketcaddy:runtime-ready", onRuntimeReady);
  }

  function wireGlobalErrorGuards() {
    if (state.globalGuardsWired) return;
    state.globalGuardsWired = true;

    window.addEventListener("error", function (e) {
      console.error("Global runtime error:", e.error || e.message);
    });

    window.addEventListener("unhandledrejection", function (e) {
      console.error("Unhandled promise rejection:", e.reason);
    });
  }

  // HANDLERS
  function onRuntimeReady() {
    wireExportEventsIfReady();
    queueRuntimeBoot();
  }

  function loadExportUtils() {
    if (state.exportUtilsLoadAttempted) return;
    state.exportUtilsLoadAttempted = true;
    try {
      import("./src/js/export/exportUtils.js")
        .then(function (moduleApi) {
          if (!moduleApi || typeof moduleApi !== "object") return;
          state.exportUtils = moduleApi;
          wireExportEventsIfReady();
        })
        .catch(function (err) {
          console.error("Export utilities failed to load:", err);
        });
    } catch (err) {
      console.error("Export utilities import failed:", err);
    }
  }

  function wireExportEventsIfReady() {
    if (state.exportEventsWired) return;
    if (!state.exportUtils) return;
    state.exportEventsWired = true;
    try {
      document.addEventListener("click", onExportClickCapture, true);
    } catch (err) {
      console.error("Export event wiring failed:", err);
    }
  }

  function onExportClickCapture(event) {
    try {
      if (!event || !event.target || typeof event.target.closest !== "function") return;
      const target = event.target.closest(
        "#export-json-btn, #export-csv-btn, [data-action='export-json'], [data-action='export-csv'], [data-action='export-history-json'], [data-action='export-history-csv']"
      );
      if (!target) return;

      const isJson = target.matches("#export-json-btn, [data-action='export-json'], [data-action='export-history-json']");
      const format = isJson ? "json" : "csv";
      const exported = handleRoundExport(target, format);
      if (exported) {
        event.preventDefault();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        event.stopPropagation();
      }
    } catch (err) {
      console.error("Export click handling failed:", err);
    }
  }

  function handleRoundExport(button, format) {
    try {
      const exportUtils = state.exportUtils;
      if (!exportUtils) return false;
      const roundData = resolveRoundDataForExport(button);
      const players = Array.isArray(roundData && roundData.players) ? roundData.players : [];
      if (!roundData || players.length === 0) {
        window.alert("No round data available");
        return false;
      }

      const roundId = String(roundData.roundId || "round").trim() || "round";
      const extension = format === "json" ? "json" : "csv";
      const mimeType = format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8";
      const filename = `pocketcaddy-${sanitizeFilename(roundId)}.${extension}`;
      const content = format === "json"
        ? exportUtils.generateRoundJSON(roundData)
        : exportUtils.generateRoundCSV(roundData);
      return Boolean(exportUtils.downloadFile(filename, content, mimeType));
    } catch (err) {
      console.error("Round export failed:", err);
      return false;
    }
  }

  function resolveRoundDataForExport(button) {
    try {
      const stateApi = window.PocketCaddyState || {};
      const history = typeof stateApi.readRoundHistoryFromStorage === "function"
        ? stateApi.readRoundHistoryFromStorage()
        : [];
      const safeHistory = Array.isArray(history) ? history : [];
      const roundIdFromButton = String(button && button.getAttribute("data-round-id") || "").trim();

      if (roundIdFromButton) {
        const byButtonRoundId = safeHistory.find(function (entry) {
          return String(entry && entry.roundId || "").trim() === roundIdFromButton;
        });
        if (byButtonRoundId) return byButtonRoundId;
      }

      const session = typeof stateApi.getSession === "function" ? stateApi.getSession() : null;
      const sessionRoundId = String(session && session.roundId || "").trim();
      if (sessionRoundId) {
        const bySessionRoundId = safeHistory.find(function (entry) {
          return String(entry && entry.roundId || "").trim() === sessionRoundId;
        });
        if (bySessionRoundId) return bySessionRoundId;
      }

      return safeHistory[0] || null;
    } catch (_err) {
      return null;
    }
  }

  function sanitizeFilename(value) {
    const text = String(value == null ? "" : value).trim().toLowerCase();
    const normalized = text.replace(/[^a-z0-9_-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
    return normalized || "round";
  }

  // ROUTING HELPERS
  function queueRuntimeBoot() {
    state.runtimeBootQueued = true;
    if (isRuntimeAvailable()) {
      waitForRenderThenBoot();
      return;
    }
    revealHomeFallback("PocketCaddy could not finish loading. Please refresh and try again.");
  }

  function isRuntimeAvailable() {
    return Boolean(
      window.PocketCaddyAppRuntimeLegacy
      && typeof window.PocketCaddyAppRuntimeLegacy.boot === "function"
    );
  }

  function safeBootRuntime() {
    if (state.runtimeBooted || !state.runtimeBootQueued || !isRuntimeAvailable()) return;
    state.runtimeBootQueued = false;
    state.runtimeBooted = true;
    try {
      window.PocketCaddyAppRuntimeLegacy.boot();
    } catch (err) {
      state.runtimeBooted = false;
      console.error("PocketCaddy runtime boot failed:", err);
      revealHomeFallback("PocketCaddy failed to start. Please refresh and try again.");
    }
  }

  function waitForRenderThenBoot() {
    let attempts = 0;
    const maxAttempts = 40;

    function attempt() {
      if (!state.runtimeBootQueued) return;
      if (!isRuntimeAvailable()) {
        revealHomeFallback("PocketCaddy could not finish loading. Please refresh and try again.");
        return;
      }

      if (window.PocketCaddyRender) {
        safeBootRuntime();
        return;
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        console.error("Render layer not available.");
        revealHomeFallback("PocketCaddy could not start the render layer. Please refresh and try again.");
        return;
      }

      setTimeout(attempt, 50);
    }

    attempt();
  }

  function revealHomeFallback(message) {
    const homeView = document.getElementById("home-view");
    const scoreView = document.getElementById("score-view");
    const fallbackMessage = message || "PocketCaddy could not finish loading. Please refresh and try again.";
    let homeError = document.getElementById("app-boot-fallback-error");

    if (homeView) homeView.classList.remove("hidden");
    if (scoreView) scoreView.classList.add("hidden");

    if (!homeError) {
      homeError = document.createElement("div");
      homeError.id = "app-boot-fallback-error";
      homeError.className = "error";
      if (homeView) {
        homeView.prepend(homeError);
      } else if (document.body) {
        document.body.prepend(homeError);
      }
    }

    if (homeError) {
      homeError.classList.remove("hidden");
      homeError.textContent = fallbackMessage;
    } else {
      console.error(fallbackMessage);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
