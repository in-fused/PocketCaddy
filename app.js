(function () {
  "use strict";

  const state = {
    runtimeBootQueued: false,
    runtimeBooted: false,
    eventsWired: false,
    globalGuardsWired: false
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
