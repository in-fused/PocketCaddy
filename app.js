(function () {
  "use strict";

  const RUNTIME_SCRIPT_PATHS = [
    "src/js/core/appRuntimeLegacy.js",
    "./src/js/core/appRuntimeLegacy.js"
  ];

  const state = {
    runtimeLoaded: false,
    runtimeLoading: false,
    runtimeBootQueued: false,
    eventsWired: false,
    globalGuardsWired: false,
    runtimePathIndex: 0,
    runtimeScriptEl: null
  };

  // INIT
  function init() {
    wireGlobalErrorGuards();
    wireEvents();
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
    queueRuntimeBoot();
  }

  // ROUTING HELPERS
  function queueRuntimeBoot() {
    state.runtimeBootQueued = true;
    if (isRuntimeAvailable()) {
      waitForRenderThenBoot();
      return;
    }
    loadRuntimeScript();
  }

  function isRuntimeAvailable() {
    return Boolean(
      window.PocketCaddyAppRuntimeLegacy
      && typeof window.PocketCaddyAppRuntimeLegacy.boot === "function"
    );
  }

  function loadRuntimeScript() {
    if (state.runtimeLoaded || state.runtimeLoading) return;
    if (state.runtimePathIndex >= RUNTIME_SCRIPT_PATHS.length) {
      onRuntimeScriptExhausted();
      return;
    }
    state.runtimeLoading = true;

    const script = document.createElement("script");
    script.src = RUNTIME_SCRIPT_PATHS[state.runtimePathIndex];
    script.async = true;
    script.addEventListener("load", onRuntimeScriptLoaded, { once: true });
    script.addEventListener("error", onRuntimeScriptError, { once: true });
    state.runtimeScriptEl = script;
    document.head.appendChild(script);
  }

  function onRuntimeScriptLoaded() {
    state.runtimeLoaded = true;
    state.runtimeLoading = false;
    state.runtimeScriptEl = null;
    state.runtimeBootQueued = true;

    if (isRuntimeAvailable()) {
      waitForRenderThenBoot();
      return;
    }

    console.error("PocketCaddy runtime script loaded but runtime API was unavailable.");
    onRuntimeScriptExhausted();
  }

  function onRuntimeScriptError() {
    state.runtimeLoading = false;
    if (state.runtimeScriptEl && state.runtimeScriptEl.parentNode) {
      state.runtimeScriptEl.parentNode.removeChild(state.runtimeScriptEl);
    }
    state.runtimeScriptEl = null;
    state.runtimePathIndex += 1;
    if (state.runtimePathIndex < RUNTIME_SCRIPT_PATHS.length) {
      loadRuntimeScript();
      return;
    }
    onRuntimeScriptExhausted();
  }

  function safeBootRuntime() {
    if (!state.runtimeBootQueued || !isRuntimeAvailable()) return;
    state.runtimeBootQueued = false;
    try {
      window.PocketCaddyAppRuntimeLegacy.boot();
    } catch (err) {
      console.error("PocketCaddy runtime boot failed:", err);
      revealHomeFallback("PocketCaddy failed to start. Please refresh and try again.");
    }
  }

  function waitForRenderThenBoot() {
    let attempts = 0;
    const maxAttempts = 10;

    function attempt() {
      if (!state.runtimeBootQueued) return;
      if (!isRuntimeAvailable()) {
        loadRuntimeScript();
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

  function onRuntimeScriptExhausted() {
    state.runtimeBootQueued = false;
    state.runtimeLoading = false;
    state.runtimeLoaded = false;
    if (state.runtimeScriptEl && state.runtimeScriptEl.parentNode) {
      state.runtimeScriptEl.parentNode.removeChild(state.runtimeScriptEl);
    }
    state.runtimeScriptEl = null;
    console.error("PocketCaddy runtime failed to load.");
    revealHomeFallback("PocketCaddy could not finish loading. Please refresh and try again.");
  }

  function revealHomeFallback(message) {
    const homeView = document.getElementById("home-view");
    const scoreView = document.getElementById("score-view");
    const fallbackMessage = message || "PocketCaddy could not finish loading. Please refresh and try again.";
    let homeError = document.getElementById("home-error");

    if (homeView) homeView.classList.remove("hidden");
    if (scoreView) scoreView.classList.add("hidden");

    if (!homeError) {
      homeError = document.createElement("div");
      homeError.id = "home-error";
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
